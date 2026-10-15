/// <reference types="bun-types" />
import { afterAll, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const directory = mkdtempSync(path.join(tmpdir(), "parrot-bootstrap-"));
afterAll(() => rmSync(directory, { recursive: true }));
const env = { ...process.env, DATABASE_URL: `file:${directory}/app.db`, ADMIN_EMAIL: "initial@example.com" };
const run = async (command: string[], input?: string) => {
  const process = Bun.spawn(command, { env, stdin: input === undefined ? "ignore" : new Blob([input]), stdout: "pipe", stderr: "pipe" });
  const [code, output, error] = await Promise.all([process.exited, new Response(process.stdout).text(), new Response(process.stderr).text()]);
  if (code !== 0) throw new Error(`${command[0]} failed: ${output}\n${error}`);
  return output;
};

test("deployment argument validation and plan never deploy", async () => {
  const output = await run(["bash", "scripts/deploy-vps.sh", "--domain", "ParrotRehome.com", "--email", "owner@example.com", "--admin-email", "initial@example.com", "--plan"]);
  expect(output).toContain("Domain: parrotrehome.com");
  expect(output).toContain("No machine changes made");
  const rejected = Bun.spawn(["bash", "scripts/deploy-vps.sh", "--domain", "bad;command", "--email", "owner@example.com", "--admin-email", "initial@example.com", "--plan"], { stdout: "ignore", stderr: "ignore" });
  expect(await rejected.exited).not.toBe(0);
});

test("bootstrap creates one admin, no demo accounts, and preserves password on repeat", async () => {
  await run(["python3", "-c", `import sqlite3; c=sqlite3.connect('${directory}/app.db'); c.execute('PRAGMA user_version=0'); c.close()`]);
  await run(["node", "node_modules/prisma/build/index.js", "db", "push", "--skip-generate"]);
  const password = "Test-only-random-long-password";
  await run([process.execPath, "run", "scripts/bootstrap-admin.ts"], password);
  const db = new PrismaClient({ datasourceUrl: env.DATABASE_URL });
  try {
    const user = await db.user.findUniqueOrThrow({ where: { email: env.ADMIN_EMAIL } });
    expect(user.role).toBe("SUPER_ADMIN");
    expect(await bcrypt.compare(password, user.passwordHash)).toBe(true);
    expect(await db.user.count()).toBe(1);
    expect(await db.servedState.count()).toBe(9);
    expect(await db.paymentMethod.count({ where: { active: true } })).toBe(0);
    await run([process.execPath, "run", "scripts/bootstrap-admin.ts"], "A-different-test-password");
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash).toBe(user.passwordHash);
    expect(await db.user.count()).toBe(1);
  } finally { await db.$disconnect(); }
}, 30000);
