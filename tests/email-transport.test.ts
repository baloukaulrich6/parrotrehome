/// <reference types="bun-types" />
import { afterEach, expect, test } from "bun:test";
import { deliverEmail, customerReplyAddress } from "../src/lib/email-transport";
const previous = { transport: process.env.MAIL_TRANSPORT, key: process.env.RESEND_API_KEY, from: process.env.MAIL_FROM, reply: process.env.MAIL_REPLY_TO };
const originalFetch = globalThis.fetch;
const previousRouting = { MAIL_INBOUND_PROVIDER: process.env.MAIL_INBOUND_PROVIDER, MAIL_REPLY_DOMAIN: process.env.MAIL_REPLY_DOMAIN, NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET };
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [name, value] of Object.entries({ ...previousRouting, MAIL_TRANSPORT: previous.transport, RESEND_API_KEY: previous.key, MAIL_FROM: previous.from, MAIL_REPLY_TO: previous.reply })) {
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
});
const payload = { toAddress: "client@example.com", subject: "Your request", body: "Dear client,\nYour payment is awaiting verification." };
test("preview never contacts a provider or reports SENT", async () => {
  process.env.MAIL_TRANSPORT = "preview";
  globalThis.fetch = (() => { throw new Error("Unexpected external request"); }) as unknown as typeof fetch;
  expect(await deliverEmail(payload, "event-1")).toBe("QUEUED");
});
test("Resend receives authenticated HTML and text with reply-to and stable idempotency", async () => {
  process.env.MAIL_TRANSPORT = "resend"; process.env.RESEND_API_KEY = "test-key-never-real";
  process.env.MAIL_FROM = "no-reply@parrotrehome.com"; process.env.MAIL_REPLY_TO = "support@parrotrehome.com";
  const keys: string[] = [];
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    expect(url).toBe("https://api.resend.com/emails");
    const headers = new Headers(init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer test-key-never-real");
    keys.push(headers.get("Idempotency-Key")!);
    const data = JSON.parse(init?.body as string);
    expect(data.reply_to).toBe("support@parrotrehome.com");
    expect(data.to).toEqual([payload.toAddress]);
    expect(data.text).toBe(payload.body); expect(data.html).toContain("#F7F6F1");
    return Response.json({ id: "provider-message-id" });
  }) as unknown as typeof fetch;
  expect(await deliverEmail(payload, "same-event")).toBe("SENT");
  expect(await deliverEmail(payload, "same-event")).toBe("SENT");
  expect(keys[0]).toBe(keys[1]); expect(keys[0]).toMatch(/^[0-9a-f]{64}$/);
});
test("missing key and provider rejection cannot be reported as sent", async () => {
  process.env.MAIL_TRANSPORT = "resend"; delete process.env.RESEND_API_KEY;
  await expect(deliverEmail(payload, "event-2")).rejects.toThrow("RESEND_API_KEY");
  process.env.RESEND_API_KEY = "test-key-never-real";
  globalThis.fetch = (async () => Response.json({ message: "Unauthorized" }, { status: 401 })) as unknown as typeof fetch;
  await expect(deliverEmail(payload, "event-2")).rejects.toThrow("HTTP 401");
});

test("external mailboxes never get signed addresses unless Resend receiving is explicitly enabled", () => {
  process.env.MAIL_REPLY_DOMAIN = "parrotrehome.com";
  delete process.env.MAIL_INBOUND_PROVIDER;
  expect(customerReplyAddress("request", "request-123")).toBeUndefined();
  process.env.MAIL_INBOUND_PROVIDER = "mailbox";
  expect(customerReplyAddress("inbox", "thread-123")).toBeUndefined();
  process.env.MAIL_INBOUND_PROVIDER = "resend";
  process.env.NEXTAUTH_SECRET = "only-a-local-reply-routing-fixture";
  expect(customerReplyAddress("request", "request-123")).toMatch(/^request\+request-123\.[a-f0-9]{20}@parrotrehome\.com$/);
});
