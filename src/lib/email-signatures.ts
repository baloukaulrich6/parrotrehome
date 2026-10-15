import { createHmac, timingSafeEqual } from "node:crypto";
function equals(a: string, b: string) {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function verifyEmailWebhook(body: string, headers: Headers, secret: string, now = Date.now()) {
  const id = headers.get("svix-id"), timestamp = headers.get("svix-timestamp"), signature = headers.get("svix-signature");
  if (!id || !timestamp || !signature || !/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  if (key.length < 16) return false;
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
  return signature.split(" ").some(value => value.startsWith("v1,") && equals(value.slice(3), expected));
}
function replySignature(type: string, id: string) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for email replies.");
  return createHmac("sha256", secret).update(`email-reply:${type}:${id}`).digest("hex").slice(0, 20);
}
export function replyAddress(type: "request" | "inbox", id: string): string | undefined {
  const domain = process.env.MAIL_REPLY_DOMAIN;
  if (!domain) return undefined;
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) throw new Error("Invalid MAIL_REPLY_DOMAIN.");
  return `${type}+${id}.${replySignature(type, id)}@${domain}`;
}
export function parseReplyAddress(value: string): { type: "request" | "inbox"; id: string } | null {
  const domain = process.env.MAIL_REPLY_DOMAIN;
  const at = value.lastIndexOf("@");
  if (!domain || value.slice(at + 1).toLowerCase() !== domain.toLowerCase()) return null;
  const match = /^(request|inbox)\+([a-z0-9-]{1,80})\.([a-f0-9]{20})$/i.exec(value.slice(0, at));
  if (!match || !equals(match[3], replySignature(match[1], match[2]))) return null;
  return { type: match[1] as "request" | "inbox", id: match[2] };
}
