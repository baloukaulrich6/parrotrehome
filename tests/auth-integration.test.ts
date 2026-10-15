/// <reference types="bun-types" />
// Run in its own Bun process: other route unit tests intentionally mock auth.
import { expect, test } from "bun:test";
import { cpSync, mkdtempSync, mkdirSync, openSync, closeSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:net";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateCurrentTotp, generateMfaSecret, verifyMfaToken } from "../src/lib/mfa";

test("real sign-in, MFA enrollment/enforcement, staff management and activity history", async () => {
  const root = process.cwd();
  const temporary = mkdtempSync(path.join(tmpdir(), "parrot-auth-integration-"));
  const checkout = path.join(temporary, "checkout");
  mkdirSync(checkout);
  for (const entry of ["src", "scripts", "tests", "prisma", "public", "deploy", "package.json", "bun.lock", "next.config.ts", "tsconfig.json", "postcss.config.mjs", "tailwind.config.ts", "components.json", "eslint.config.mjs"]) cpSync(path.join(root, entry), path.join(checkout, entry), { recursive: true });
  symlinkSync(path.join(root, "node_modules"), path.join(checkout, "node_modules"), "dir");
  const socket = createServer();
  await new Promise<void>((resolve) => socket.listen(0, "127.0.0.1", resolve));
  const port = (socket.address() as { port: number }).port;
  await new Promise<void>((resolve) => socket.close(() => resolve()));
  const base = `http://127.0.0.1:${port}`;
  const env = { ...process.env, DATABASE_URL: `file:${temporary}/app.db`, NEXTAUTH_URL: base, NEXTAUTH_SECRET: "isolated-http-test-only-secret-over-32-chars", NEXT_TELEMETRY_DISABLED: "1", MAIL_TRANSPORT: "preview" };
  const db = new PrismaClient({ datasourceUrl: env.DATABASE_URL });
  const password = "Only-for-local-integration-tests";
  let server: ReturnType<typeof Bun.spawn> | undefined;
  const log = openSync(path.join(temporary, "next.log"), "w", 0o600);
  async function stop() {
    if (!server) return;
    try { process.kill(-server.pid, "SIGTERM"); } catch { server.kill(); }
    await server.exited;
    server = undefined;
  }
  async function start() {
    server = Bun.spawn(["node", path.join(root, "node_modules/next/dist/bin/next"), "dev", "--webpack", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: checkout, env, stdout: log, stderr: log, detached: true });
    for (let i = 0; i < 120; i++) {
      if (server.exitCode !== null) throw new Error("Isolated Next server exited during startup.");
      try { const response = await fetch(base + "/api/auth/csrf", { signal: AbortSignal.timeout(1500) }); if (response.ok) return; } catch {}
      await Bun.sleep(250);
    }
    throw new Error("Isolated Next server did not start.");
  }
  class Client {
    cookies = new Map<string, string>();
    async request(route: string, data?: unknown, method = "GET") {
      const response = await fetch(base + route, { method, headers: { origin: base, cookie: [...this.cookies.values()].join("; "), ...(data === undefined ? {} : { "content-type": data instanceof URLSearchParams ? "application/x-www-form-urlencoded" : "application/json" }) }, body: data === undefined ? undefined : data instanceof URLSearchParams ? data : JSON.stringify(data), redirect: "manual" });
      for (const cookie of response.headers.getSetCookie()) { const pair = cookie.split(";")[0]; this.cookies.set(pair.split("=")[0], pair); }
      return response;
    }
    async session() { return (await this.request("/api/auth/session")).json(); }
  }
  async function login(email: string, token = "", pwd = password) {
    const client = new Client();
    const { csrfToken } = await (await client.request("/api/auth/csrf")).json();
    await client.request("/api/auth/callback/credentials", new URLSearchParams({ csrfToken, email, password: pwd, totp: token, json: "true", callbackUrl: base }), "POST");
    return client;
  }
  async function enroll(client: Client) {
    const init = await client.request("/api/mfa", { action: "init" }, "POST");
    expect(init.status).toBe(200);
    const { secret } = await init.json();
    const code = await generateCurrentTotp(secret);
    let wrong = "000000";
    while (await verifyMfaToken(wrong, secret)) wrong = String(Number(wrong) + 1).padStart(6, "0");
    // This used to accept any nonempty code because the Promise was not awaited.
    expect((await client.request("/api/mfa", { action: "verify", token: wrong, secret: generateMfaSecret() }, "POST")).status).toBe(400);
    expect((await client.request("/api/mfa", { action: "verify", token: code }, "POST")).status).toBe(200);
    return secret;
  }
  try {
    const create = Bun.spawn(["python3", "-c", `import sqlite3; c=sqlite3.connect('${temporary}/app.db'); c.execute('PRAGMA user_version=0'); c.close()`], { stdout: "ignore", stderr: "ignore" });
    expect(await create.exited).toBe(0);
    const schema = Bun.spawn(["node", "node_modules/prisma/build/index.js", "db", "push", "--skip-generate"], { cwd: root, env, stdout: log, stderr: log });
    expect(await schema.exited).toBe(0);
    const hash = await bcrypt.hash(password, 10);
    const initial = await db.user.create({ data: { email: "admin@example.com", name: "HTTP Administrator", role: "SUPER_ADMIN", status: "ACTIVE", passwordHash: hash } });
    await db.user.create({ data: { email: "client@example.com", name: "HTTP Client", role: "CLIENT", status: "ACTIVE", passwordHash: hash } });
    await start();
    const pending = await login(initial.email);
    expect((await pending.session()).user?.role).toBe("SUPER_ADMIN");
    expect((await pending.request("/admin/staff")).headers.get("location")).toContain("/staff-mfa");
    expect((await pending.request("/api/admin/users", { name: "Forbidden", email: "blocked@example.com", password, role: "AGENT" }, "POST")).status).toBe(401);
    const secret = await enroll(pending);
    expect((await pending.request("/api/admin/users", {}, "POST")).status).toBe(401);
    const noCode = await login(initial.email);
    expect((await noCode.session()).user).toBeUndefined();
    const badCode = await login(initial.email, "not-a-code");
    expect((await badCode.session()).user).toBeUndefined();
    const code = await generateCurrentTotp(secret);
    const admin = await login(initial.email, code);
    expect((await admin.session()).user?.role).toBe("SUPER_ADMIN");
    const replay = await login(initial.email, code);
    expect((await replay.session()).user).toBeUndefined();
    expect((await admin.request("/admin/staff")).status).toBe(200);
    expect((await admin.request("/api/mfa", { action: "disable" }, "POST")).status).toBe(403);
    const createManager = await admin.request("/api/admin/users", { name: "HTTP Manager", email: "manager@example.com", password, role: "MANAGER" }, "POST");
    expect(createManager.status).toBe(201);
    const managerId = (await createManager.json()).user.id;
    expect((await admin.request("/api/admin/users", { name: "Duplicate", email: "manager@example.com", password, role: "AGENT" }, "POST")).status).toBe(409);
    expect((await admin.request(`/api/admin/users/${initial.id}`, { name: initial.name, role: "SUPER_ADMIN", status: "SUSPENDED" }, "PATCH")).status).toBe(400);
    // Restart this isolated process to clear its normal five-attempt login limit.
    await stop(); await start();
    const pendingManager = await login("manager@example.com");
    const managerSecret = await enroll(pendingManager);
    const manager = await login("manager@example.com", await generateCurrentTotp(managerSecret));
    expect((await manager.request("/api/admin/users", { name: "Escalation", email: "privileged@example.com", password, role: "SUPER_ADMIN" }, "POST")).status).toBe(403);
    const agent = await manager.request("/api/admin/users", { name: "New Agent", email: "agent@example.com", password, role: "AGENT" }, "POST");
    expect(agent.status).toBe(201);
    const client = await login("client@example.com");
    expect((await client.request("/api/admin/users", {}, "POST")).status).toBe(403);
    const createdClient = await admin.request("/api/admin/users", { name: "Created Client", email: "new-client@example.com", password, role: "CLIENT" }, "POST");
    expect(createdClient.status).toBe(201);
    expect((await admin.request(`/api/admin/users/${managerId}`, { name: "HTTP Manager", role: "MANAGER", status: "SUSPENDED" }, "PATCH")).status).toBe(200);
    expect((await manager.request("/api/admin/users", {}, "POST")).status).toBe(401);
    const account = await admin.request("/account");
    expect(account.status).toBe(200);
    expect(await account.text()).toContain("Last successful sign-in");
    const audit = await admin.request("/admin/audit?action=LOGIN&q=admin%40example.com");
    expect(audit.status).toBe(200);
    expect(await audit.text()).toContain(initial.email);
    const signIn = await (await client.request("/sign-in")).text();
    expect(signIn).not.toContain("Demo accounts");
    expect(signIn).toContain("Authenticator code");
    const stored = await db.user.findUniqueOrThrow({ where: { id: initial.id } });
    expect(stored.lastLoginAt).not.toBeNull();
    expect(stored.mfaSecret).not.toBe(secret);
    expect(await db.auditLog.count({ where: { actorId: initial.id, action: "LOGIN_FAILED" } })).toBeGreaterThanOrEqual(3);
    expect(await db.auditLog.count({ where: { action: "CREATE", objectType: "User" } })).toBeGreaterThanOrEqual(3);
    // A console recovery reset must invalidate previously MFA-verified sessions.
    const reset = Bun.spawn([process.execPath, "run", "scripts/reset-staff-mfa.ts", "--email", initial.email, "--confirm-reset"], { cwd: root, env, stdout: log, stderr: log });
    expect(await reset.exited).toBe(0);
    expect((await admin.request("/api/admin/users", {}, "POST")).status).toBe(401);
  } finally {
    await stop(); await db.$disconnect(); closeSync(log); rmSync(temporary, { recursive: true, force: true });
  }
}, 180000);
