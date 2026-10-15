import { createHash } from "node:crypto";
import { z } from "zod";
import { renderEmailHtml } from "./email-design";

const address = z.string().email();
export function mailConfiguration() {
  return {
    transport: process.env.MAIL_TRANSPORT || "preview",
    from: process.env.MAIL_FROM || "no-reply@parrotrehome.com",
    replyTo: process.env.MAIL_REPLY_TO || "support@parrotrehome.com",
    configured: !!process.env.RESEND_API_KEY,
  };
}
export async function deliverEmail(payload: { toAddress: string; subject: string; body: string; html?: string; replyTo?: string }, key: string): Promise<"QUEUED" | "SENT"> {
  const config = mailConfiguration();
  if (config.transport === "preview") return "QUEUED";
  if (config.transport !== "resend") throw new Error("Unsupported mail transport.");
  if (!config.configured) throw new Error("RESEND_API_KEY is missing on the server.");
  const replyTo = payload.replyTo || config.replyTo;
  if (![config.from, replyTo, payload.toAddress].every(value => address.safeParse(value).success)) throw new Error("Invalid email sender, reply-to or recipient.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": createHash("sha256").update(key).digest("hex") },
    body: JSON.stringify({ from: `ParrotRehome <${config.from}>`, to: [payload.toAddress], reply_to: replyTo, subject: payload.subject, text: payload.body, html: payload.html || renderEmailHtml(payload.subject, payload.body) }),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.id) throw new Error(`Resend rejected the email (HTTP ${response.status}). Check the sender domain and server configuration.`);
  // SENT means accepted by Resend, not proof of inbox delivery.
  return "SENT";
}
