/// <reference types="bun-types" />
// Run separately: this route test mocks server dependencies and external delivery.
import { afterAll, expect, mock, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHmac } from "node:crypto";
mock.module("server-only", () => ({}));
let role: string | null = "SUPER_ADMIN";
mock.module("@/lib/auth", () => ({ getServerUser: async () => role ? { id: "admin-test", role, name: "Admin", email: "admin@example.com" } : null }));
const chat = new Map<string, unknown>();
mock.module("@/lib/db", () => ({ db: {
  request: { findUnique: async ({ where }: { where: { id: string } }) => where.id === "request-test" ? { id: where.id, customerEmail: "client@example.com" } : null },
  chatMessage: { upsert: async ({ where, create }: { where: { id: string }; create: unknown }) => { chat.set(where.id, create); }, create: async () => ({}) },
} }));
mock.module("@/lib/audit", () => ({ audit: async () => {} }));
const { replyAddress } = await import("../src/lib/email-signatures");
const { listInboxEmails } = await import("../src/lib/email-inbox");
const { POST: receive } = await import("../src/app/api/webhooks/resend/route");
const { POST: reply } = await import("../src/app/api/admin/inbox/[id]/reply/route");
const directory = mkdtempSync(path.join(tmpdir(), "parrot-inbox-"));
const names = ["EMAIL_INBOX_DIR", "RESEND_API_KEY", "RESEND_WEBHOOK_SECRET", "MAIL_REPLY_DOMAIN", "NEXTAUTH_SECRET", "NEXTAUTH_URL", "MAIL_TRANSPORT"];
const previous = Object.fromEntries(names.map(key => [key, process.env[key]])); const originalFetch = globalThis.fetch;
const key = Buffer.from("fixture-webhook-secret-for-tests");
Object.assign(process.env, { EMAIL_INBOX_DIR: directory, RESEND_API_KEY: "not-a-real-key", RESEND_WEBHOOK_SECRET: `whsec_${key.toString("base64")}`, MAIL_REPLY_DOMAIN: "reply.parrotrehome.com", NEXTAUTH_SECRET: "local-test-only-secret", NEXTAUTH_URL: "https://parrotrehome.com", MAIL_TRANSPORT: "preview" });
afterAll(() => { globalThis.fetch = originalFetch; rmSync(directory, { recursive: true }); for (const [name, value] of Object.entries(previous)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; } });
function event(id: string, valid = true) {
  const body = JSON.stringify({ type: "email.received", data: { email_id: id } }); const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", key).update(`msg-test.${timestamp}.${body}`).digest("base64");
  return new Request("https://parrotrehome.com/api/webhooks/resend", { method: "POST", body, headers: { "svix-id": "msg-test", "svix-timestamp": timestamp, "svix-signature": `v1,${valid ? signature : "invalid"}` } });
}
const id = "11111111-1111-4111-8111-111111111111";
test("verified incoming replies persist, link to the correct dossier and deduplicate retries", async () => {
  let calls = 0;
  globalThis.fetch = (async () => { calls++; return Response.json({ from: "Client <client@example.com>", to: [replyAddress("request", "request-test")], subject: "Re: Request", text: "Please confirm my order details." }); }) as unknown as typeof fetch;
  expect((await receive(event(id, false))).status).toBe(401); expect(calls).toBe(0);
  expect((await receive(event(id))).status).toBe(200);
  expect((await receive(event(id))).status).toBe(200);
  expect(calls).toBe(1); expect(listInboxEmails()).toHaveLength(1); expect(chat.size).toBe(1);
  expect(listInboxEmails()[0].requestId).toBe("request-test");
});
test("a different sender cannot inject a reply into a customer dossier", async () => {
  globalThis.fetch = (async () => Response.json({ from: "stranger@example.com", to: [replyAddress("request", "request-test")], subject: "Unrelated", text: "Hello" })) as unknown as typeof fetch;
  expect((await receive(event("22222222-2222-4222-8222-222222222222"))).status).toBe(200);
  expect(listInboxEmails().find(email => email.from === "stranger@example.com")?.requestId).toBeUndefined();
  expect(chat.size).toBe(1);
});
test("subsequent replies stay in the same inbox conversation", async () => {
  globalThis.fetch = (async () => Response.json({ from: "client@example.com", to: [replyAddress("inbox", id)], subject: "Re: Request", text: "Thank you for your response." })) as unknown as typeof fetch;
  expect((await receive(event("33333333-3333-4333-8333-333333333333"))).status).toBe(200);
  expect(listInboxEmails().find(email => email.id.startsWith("33333333"))?.threadId).toBe(id);
  expect(chat.size).toBe(2);
});
test("emails for other receiving domains are not imported", async () => {
  const before = listInboxEmails().length;
  globalThis.fetch = (async () => Response.json({ from: "client@example.com", to: ["support@another-project.example"], subject: "Unrelated domain", text: "Hello" })) as unknown as typeof fetch;
  expect((await receive(event("44444444-4444-4444-8444-444444444444"))).status).toBe(200);
  expect(listInboxEmails()).toHaveLength(before);
});
test("only authorized staff can reply; preview is saved without external delivery", async () => {
  const request = (origin = "https://parrotrehome.com") => new Request(`https://parrotrehome.com/api/admin/inbox/${id}/reply`, { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify({ body: "Thank you, we will check your request." }) });
  const params = { params: Promise.resolve({ id }) };
  role = null; expect((await reply(request(), params)).status).toBe(401);
  role = "CLIENT"; expect((await reply(request(), params)).status).toBe(403);
  role = "SUPER_ADMIN"; expect((await reply(request("https://attacker.example"), params)).status).toBe(403);
  const result = await reply(request(), params); expect(result.status).toBe(200); expect((await result.json()).status).toBe("QUEUED");
  expect(listInboxEmails().filter(email => email.direction === "OUTBOUND")).toHaveLength(1);
});
