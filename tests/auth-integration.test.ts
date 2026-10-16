/// <reference types="bun-types" />
// Run in its own Bun process: other route unit tests intentionally mock auth.
import { expect, test } from "bun:test";
import { cpSync, mkdtempSync, mkdirSync, openSync, closeSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:net";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { defaultSiteSettings } from "../src/lib/site-settings-schema";

test("password-only sign-in, legacy accounts, staff management and activity history", async () => {
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
  const env = { ...process.env, DATABASE_URL: `file:${temporary}/app.db`, NEXTAUTH_URL: base, NEXTAUTH_SECRET: "isolated-http-test-only-secret-over-32-chars", NEXT_TELEMETRY_DISABLED: "1", MAIL_TRANSPORT: "preview", CRON_SECRET: "local-mail-cron-fixture-token-32chars", MAIL_REPLY_DOMAIN: "", RESEND_API_KEY: "", EMAIL_INBOX_DIR: path.join(temporary, "email-inbox"), RESEND_WEBHOOK_SECRET: "", EMAIL_TEMPLATES_FILE: path.join(temporary, "email-templates.json"), SITE_SETTINGS_FILE: path.join(temporary, "site-settings.json") };
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
  async function login(email: string, pwd = password) {
    const client = new Client();
    const { csrfToken } = await (await client.request("/api/auth/csrf")).json();
    await client.request("/api/auth/callback/credentials", new URLSearchParams({ csrfToken, email, password: pwd, json: "true", callbackUrl: base }), "POST");
    return client;
  }
  try {
    const create = Bun.spawn(["python3", "-c", `import sqlite3; c=sqlite3.connect('${temporary}/app.db'); c.execute('PRAGMA user_version=0'); c.close()`], { stdout: "ignore", stderr: "ignore" });
    expect(await create.exited).toBe(0);
    const schema = Bun.spawn(["node", "node_modules/prisma/build/index.js", "db", "push", "--skip-generate"], { cwd: root, env, stdout: log, stderr: log });
    expect(await schema.exited).toBe(0);
    const hash = await bcrypt.hash(password, 10);
    const initial = await db.user.create({ data: { email: "admin@example.com", name: "HTTP Administrator", role: "SUPER_ADMIN", status: "ACTIVE", passwordHash: hash, mfaEnabled: true, mfaSecret: "legacy-setting-must-not-block-password-login" } });
    await db.user.create({ data: { email: "client@example.com", name: "HTTP Client", role: "CLIENT", status: "ACTIVE", passwordHash: hash } });
    await start();
    const wrongPassword = await login(initial.email, "incorrect-password");
    expect((await wrongPassword.session()).user).toBeUndefined();
    const admin = await login(initial.email);
    expect((await admin.session()).user?.role).toBe("SUPER_ADMIN");
    const directory = await admin.request("/admin/staff");
    expect(directory.status).toBe(200);
    expect(await directory.text()).not.toMatch(/MFA|Authenticator/);
    expect((await admin.request("/api/mfa", { action: "init" }, "POST")).status).toBe(404);
    expect((await admin.request("/staff-mfa")).status).toBe(404);
    const createManager = await admin.request("/api/admin/users", { name: "HTTP Manager", email: "manager@example.com", password, role: "MANAGER" }, "POST");
    expect(createManager.status).toBe(201);
    const managerId = (await createManager.json()).user.id;
    expect((await admin.request("/api/admin/users", { name: "Duplicate", email: "manager@example.com", password, role: "AGENT" }, "POST")).status).toBe(409);
    expect((await admin.request(`/api/admin/users/${initial.id}`, { name: initial.name, role: "SUPER_ADMIN", status: "SUSPENDED" }, "PATCH")).status).toBe(400);
    const manager = await login("manager@example.com");
    expect((await manager.request("/admin")).status).toBe(200);
    expect((await manager.request("/api/admin/users", { name: "Escalation", email: "privileged@example.com", password, role: "SUPER_ADMIN" }, "POST")).status).toBe(403);
    const agent = await manager.request("/api/admin/users", { name: "New Agent", email: "agent@example.com", password, role: "AGENT" }, "POST");
    expect(agent.status).toBe(201);
    const client = await login("client@example.com");
    expect((await client.request("/api/admin/users", {}, "POST")).status).toBe(403);
    const settings = { ...defaultSiteSettings, name: "Gallery Test Center", email: "contact@gallery.example", phone: "+33 1 23 45 67 89", secondaryPhone: "+33 6 12 34 56 78", address: "18 Feather Street", hours: "Monday to Friday, 09:00–18:00" };
    expect((await manager.request("/api/admin/site-settings", settings, "PUT")).status).toBe(403);
    expect((await client.request("/api/admin/site-settings", settings, "PUT")).status).toBe(403);
    expect((await admin.request("/api/admin/site-settings", { ...settings, email: "invalid" }, "PUT")).status).toBe(400);
    expect((await admin.request("/api/admin/site-settings", settings, "PUT")).status).toBe(200);
    expect((await admin.request("/admin/settings")).status).toBe(200);
    const publicContact = await (await new Client().request("/contact")).text();
    for (const value of [settings.name, settings.email, settings.phone, settings.secondaryPhone, settings.address, settings.hours]) expect(publicContact).toContain(value);
    const photos = ["https://example.com/front.webp", "https://example.com/side.webp", "https://example.com/back.webp"];
    const bird = await db.bird.create({ data: { species: "African Grey", commonName: "Gallery Bird", photos: JSON.stringify(photos) } });
    const detail = await new Client().request(`/parrots/${bird.id}`);
    expect(detail.status).toBe(200);
    const detailHtml = await detail.text();
    for (const photo of photos) expect(detailHtml).toContain(photo);
    expect(detailHtml).toContain("View photo 3 of Gallery Bird");
    expect(await db.auditLog.count({ where: { objectType: "SiteSettings", action: "UPDATE" } })).toBe(1);
    // Changes must survive a fresh server process, without a rebuild.
    await stop(); await start();
    expect(await (await new Client().request("/contact")).text()).toContain(settings.email);
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
    expect(signIn).not.toContain("Authenticator code");
    expect(signIn).not.toContain("one-time-code");
    const stored = await db.user.findUniqueOrThrow({ where: { id: initial.id } });
    expect(stored.lastLoginAt).not.toBeNull();
    expect(await db.auditLog.count({ where: { actorId: initial.id, action: "LOGIN_FAILED" } })).toBeGreaterThanOrEqual(1);
    expect(await db.auditLog.count({ where: { action: "CREATE", objectType: "User" } })).toBeGreaterThanOrEqual(3);
    const inboxPage = await admin.request("/admin/inbox");
    expect(inboxPage.status).toBe(200); expect(await inboxPage.text()).toContain("Support inbox");
    // Staff messages trigger emails; client messages never email themselves.
    const dossier = await db.request.create({ data: { reference: "MAIL-TEST-001", type: "PARROT_PURCHASE", shippingState: "CA", status: "INSTRUCTIONS_SENT", customerName: "Mail Client", customerEmail: "client@example.com", totalQuoteUsd: 100 } });
    await db.paymentInstruction.create({ data: { requestId: dossier.id, agentId: initial.id, secureLinkHash: "local-reminder-token", body: "Fixture instructions", expiryAt: new Date(Date.now() + 180000), status: "ACTIVE" } });
    expect((await fetch(base + "/api/cron/payment-reminders", { method: "POST" })).status).toBe(401);
    const runReminders = () => fetch(base + "/api/cron/payment-reminders", { method: "POST", headers: { Authorization: `Bearer ${env.CRON_SECRET}` } });
    expect((await runReminders()).status).toBe(200);
    expect((await runReminders()).status).toBe(200);
    expect(await db.message.count({ where: { requestId: dossier.id, template: "payment-reminder" } })).toBe(1);
    await db.request.update({ where: { id: dossier.id }, data: { status: "PAYMENT_TO_VERIFY" } });
    expect((await admin.request(`/api/requests/${dossier.id}/messages`, { body: "We are reviewing your request." }, "POST")).status).toBe(200);
    expect(await db.message.count({ where: { requestId: dossier.id, template: "agent-reply", deliveryStatus: "QUEUED" } })).toBe(1);
    expect(await db.message.count({ where: { requestId: dossier.id, template: "payment-verified" } })).toBe(0);
    expect((await admin.request(`/api/admin/requests/${dossier.id}/verify`, { amount: 100, reference: "VERIFIED-REFERENCE" }, "POST")).status).toBe(200);
    expect(await db.message.count({ where: { requestId: dossier.id, template: "payment-verified", deliveryStatus: "QUEUED" } })).toBe(1);
    expect((await runReminders()).status).toBe(200);
    expect(await db.message.count({ where: { requestId: dossier.id, template: "payment-reminder" } })).toBe(1);
    // Active methods are visible immediately and the selection survives checkout.
    await db.servedState.create({ data: { code: "CA", name: "California", allowsBirdDelivery: true } });
    const methodPayload = { name: "ZELLE", officialProvider: "Zelle", active: true, instructionsTemplate: "Pay the reviewed amount for {{requestReference}} using the confirmed recipient details." };
    expect((await new Client().request("/api/admin/payment-methods", methodPayload, "POST")).status).toBe(401);
    expect((await client.request("/api/admin/payment-methods", methodPayload, "POST")).status).toBe(403);
    const createdZelle = await admin.request("/api/admin/payment-methods", methodPayload, "POST");
    expect(createdZelle.status).toBe(201);
    const zelle = await createdZelle.json();
    const createdWire = await admin.request("/api/admin/payment-methods", { ...methodPayload, name: "Bank transfer", officialProvider: "Demo Bank", instructionsTemplate: "Beneficiary: verified company\nAccount: supplied by the agent\nReference: {{requestReference}}" }, "POST");
    expect(createdWire.status).toBe(201);
    const methodsPage = await admin.request("/admin/payment-methods");
    expect(await methodsPage.text()).toContain("New payment method");
    const inactive = await db.paymentMethod.create({ data: { name: "Hidden method", officialProvider: "Other", active: false, instructionsTemplate: "Not public" } });
    const methodsResponse = await new Client().request("/api/payment-methods");
    const methodList = (await methodsResponse.json()).methods;
    expect(methodList.map((method: { name: string }) => method.name)).toContain("ZELLE");
    expect(methodList.map((method: { name: string }) => method.name)).toContain("Bank transfer");
    expect(methodList.map((method: { name: string }) => method.name)).not.toContain("Hidden method");
    expect(JSON.stringify(methodList)).not.toContain("instructionsTemplate");
    const waiting = await db.request.create({ data: { reference: "EARLY-METHOD-001", type: "PARROT_PURCHASE", status: "RECEIVED", shippingState: "CA", customerName: "HTTP Client", customerEmail: "client@example.com" } });
    const waitingHtml = await (await client.request(`/my-requests/${waiting.id}`)).text();
    expect(waitingHtml).toContain("ZELLE");
    expect((await client.request(`/api/requests/${waiting.id}/select-method`, { paymentMethodId: zelle.id }, "POST")).status).toBe(200);
    expect((await db.request.findUniqueOrThrow({ where: { id: waiting.id } })).status).toBe("AWAITING_INSTRUCTIONS");
    const orderBird = await db.bird.create({ data: { species: "African Grey", commonName: "Order Bird", photos: "[]", priceUsd: 900 } });
    const order = { customerName: "HTTP Client", customerEmail: "client@example.com", customerPhone: "+1 555 000 1111", shippingState: "CA", shippingAddress: "12 Example Lane", experience: "Beginner", habitat: "Large bird room", preferences: "Please contact me in the afternoon", consent: true, paymentMethodId: zelle.id, items: [{ type: "BIRD", refId: orderBird.id, name: "Untrusted client name", qty: 1, priceUsd: 1 }] };
    expect((await client.request("/api/requests", { ...order, paymentMethodId: inactive.id }, "POST")).status).toBe(400);
    const submitted = await client.request("/api/requests", order, "POST");
    expect(submitted.status).toBe(200);
    const createdOrder = await submitted.json();
    expect(createdOrder.emailStatus).toBe("QUEUED");
    expect((await db.request.findUniqueOrThrow({ where: { id: createdOrder.requestId } })).selectedPaymentMethodId).toBe(zelle.id);
    const acknowledgement = await db.message.findFirstOrThrow({ where: { requestId: createdOrder.requestId, template: "request-received" } });
    expect(acknowledgement.body).toContain("ZELLE"); expect(acknowledgement.body).toContain("Order Bird"); expect(acknowledgement.body).toContain("900.00"); expect(acknowledgement.body).not.toContain("Untrusted client name");
    const teamEmail = await db.message.findFirstOrThrow({ where: { requestId: createdOrder.requestId, template: "staff-order-received" } });
    for (const value of [order.customerEmail, order.customerPhone, order.shippingAddress, order.habitat, order.preferences]) expect(teamEmail.body).toContain(value);
    const adminOrderHtml = await (await admin.request(`/admin/requests/${createdOrder.requestId}`)).text();
    expect(adminOrderHtml).toContain("Email instructions to customer");
    const instructions = { body: "Zelle recipient: Demo Company. Payment reference: client request. Amount: USD 900.", paymentMethodId: zelle.id, validityMinutes: 45 };
    expect((await admin.request(`/api/admin/requests/${createdOrder.requestId}/instructions`, { ...instructions, validityMinutes: 0 }, "POST")).status).toBe(400);
    expect((await client.request(`/api/admin/requests/${createdOrder.requestId}/instructions`, instructions, "POST")).status).toBe(403);
    expect((await admin.request(`/api/admin/requests/${createdOrder.requestId}/instructions`, instructions, "POST")).status).toBe(200);
    const paymentEmail = await db.message.findFirstOrThrow({ where: { requestId: createdOrder.requestId, template: "instructions-ready" } });
    expect(paymentEmail.subject).toContain("ZELLE"); expect(paymentEmail.body).toContain("ZELLE");
    expect(paymentEmail.body).toContain(instructions.body);
    expect(paymentEmail.body).toContain("45 minutes");
    expect(paymentEmail.body).toContain("support@parrotrehome.com");
    expect(paymentEmail.body).not.toContain("/my-requests/instructions?token=");
    const issued = await db.paymentInstruction.findFirstOrThrow({ where: { requestId: createdOrder.requestId }, orderBy: { createdAt: "desc" } });
    expect(Math.abs(issued.expiryAt.getTime() - issued.createdAt.getTime() - 45 * 60000)).toBeLessThan(3000);
    expect(acknowledgement.body).toContain(order.customerPhone);
    expect(acknowledgement.body).toContain(order.shippingAddress);
    expect((await db.request.findUniqueOrThrow({ where: { id: createdOrder.requestId } })).status).toBe("INSTRUCTIONS_SENT");
    await db.paymentMethod.update({ where: { id: zelle.id }, data: { active: false } });
    expect((await admin.request(`/api/admin/requests/${createdOrder.requestId}/instructions`, instructions, "POST")).status).toBe(400);
    // A client can reply by email: staff records the reference after provider verification.
    expect((await admin.request(`/api/admin/requests/${createdOrder.requestId}/verify`, { amount: 900 }, "POST")).status).toBe(400);
    expect((await admin.request(`/api/admin/requests/${createdOrder.requestId}/verify`, { amount: 900, reference: "EMAIL-CONFIRMATION-900" }, "POST")).status).toBe(200);
    expect((await db.request.findUniqueOrThrow({ where: { id: createdOrder.requestId } })).status).toBe("PAID_VERIFIED");
    // A password change always targets the signed-in account, and revokes old sessions.
    expect((await new Client().request("/api/account/password", {}, "PUT")).status).toBe(401);
    const newPassword = "New-local-password-only-12345";
    expect((await client.request("/api/account/password", { currentPassword: password, newPassword, userId: initial.id }, "PUT")).status).toBe(400);
    expect((await client.request("/api/account/password", { currentPassword: "wrong-password", newPassword }, "PUT")).status).toBe(400);
    expect((await client.request("/api/account/password", { currentPassword: password, newPassword }, "PUT")).status).toBe(200);
    expect((await client.request("/api/account/password", { currentPassword: newPassword, newPassword: password }, "PUT")).status).toBe(401);
    expect((await admin.request("/admin/staff")).status).toBe(200);
    expect(await bcrypt.compare(password, (await db.user.findUniqueOrThrow({ where: { id: initial.id } })).passwordHash)).toBe(true);
    await stop(); await start();
    expect((await (await login("client@example.com", password)).session()).user).toBeUndefined();
    const changedClient = await login("client@example.com", newPassword);
    expect((await changedClient.request("/account")).status).toBe(200);
  } finally {
    await stop(); await db.$disconnect(); closeSync(log); rmSync(temporary, { recursive: true, force: true });
  }
}, 180000);
