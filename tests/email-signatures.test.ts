/// <reference types="bun-types" />
import { afterEach, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { parseReplyAddress, replyAddress, verifyEmailWebhook } from "../src/lib/email-signatures";
const original = { domain: process.env.MAIL_REPLY_DOMAIN, secret: process.env.NEXTAUTH_SECRET };
afterEach(() => { for (const [key, value] of Object.entries({ MAIL_REPLY_DOMAIN: original.domain, NEXTAUTH_SECRET: original.secret })) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
test("webhook signatures reject tampering, wrong keys and expired timestamps", () => {
  const key = Buffer.from("only-a-fixture-webhook-secret"); const secret = `whsec_${key.toString("base64")}`;
  const body = JSON.stringify({ type: "email.received" }); const now = Date.now(); const timestamp = String(Math.floor(now / 1000));
  const signature = createHmac("sha256", key).update(`msg-test.${timestamp}.${body}`).digest("base64");
  const headers = new Headers({ "svix-id": "msg-test", "svix-timestamp": timestamp, "svix-signature": `v1,${signature}` });
  expect(verifyEmailWebhook(body, headers, secret, now)).toBe(true);
  expect(verifyEmailWebhook(body + " ", headers, secret, now)).toBe(false);
  expect(verifyEmailWebhook(body, headers, secret, now + 301000)).toBe(false);
  expect(verifyEmailWebhook(body, headers, "whsec_aW52YWxpZA==", now)).toBe(false);
});
test("reply addresses authenticate the request and domain, without exposing credentials", () => {
  process.env.MAIL_REPLY_DOMAIN = "reply.parrotrehome.com"; process.env.NEXTAUTH_SECRET = "only-a-local-fixture-auth-secret";
  const address = replyAddress("request", "request-123")!;
  expect(parseReplyAddress(address)).toEqual({ type: "request", id: "request-123" });
  expect(parseReplyAddress(address.replace("request-123", "request-456"))).toBeNull();
  expect(parseReplyAddress(address.replace("reply.parrotrehome.com", "attacker.example"))).toBeNull();
  expect(parseReplyAddress("support@reply.parrotrehome.com")).toBeNull();
});
