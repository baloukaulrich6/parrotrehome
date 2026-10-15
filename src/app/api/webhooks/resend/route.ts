import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyEmailWebhook, parseReplyAddress } from "@/lib/email-signatures";
import { readInboxEmail, listInboxEmails, saveInboxEmail, type InboxEmail } from "@/lib/email-inbox";
const eventSchema = z.object({ type: z.string(), data: z.object({ email_id: z.string().uuid() }).passthrough() });
function mailbox(value: string) { return (value.match(/<([^<>]+)>/)?.[1] || value).trim().toLowerCase(); }
export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret || !process.env.RESEND_API_KEY || !process.env.MAIL_REPLY_DOMAIN) return NextResponse.json({ error: "Receiving is not configured" }, { status: 503 });
  if (Number(req.headers.get("content-length") || 0) > 1048576) return new Response(null, { status: 413 });
  const reader = req.body?.getReader();
  if (!reader) return new Response(null, { status: 400 });
  const chunks: Uint8Array[] = []; let bytes = 0;
  for (;;) {
    const part = await reader.read(); if (part.done) break;
    bytes += part.value.byteLength;
    if (bytes > 1048576) { await reader.cancel(); return new Response(null, { status: 413 }); }
    chunks.push(part.value);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!verifyEmailWebhook(raw, req.headers, secret)) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return new Response(null, { status: 400 }); }
  // Delivery webhooks do not confirm payments and must never change order status.
  if ((json as { type?: string })?.type !== "email.received") return NextResponse.json({ ok: true, ignored: true });
  const event = eventSchema.safeParse(json);
  if (!event.success) return new Response(null, { status: 400 });
  const id = event.data.data.email_id;
  try {
    let email = readInboxEmail(id);
    if (!email) {
      const response = await fetch(`https://api.resend.com/emails/receiving/${id}`, { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) return NextResponse.json({ error: "Unable to retrieve email; retry webhook" }, { status: 502 });
      const data = await response.json();
      const from = mailbox(String(data.from || ""));
      if (!z.string().email().safeParse(from).success || !Array.isArray(data.to)) return new Response(null, { status: 400 });
      const to = data.to.filter((value: unknown): value is string => typeof value === "string").map(mailbox);
      if (!to.some((recipient: string) => recipient.split("@")[1] === process.env.MAIL_REPLY_DOMAIN!.toLowerCase())) return NextResponse.json({ ok: true, ignored: true });
      let requestId: string | undefined, threadId = id;
      for (const recipient of to) {
        const reply = parseReplyAddress(recipient);
        if (reply?.type === "request") {
          const request = await db.request.findUnique({ where: { id: reply.id } });
          if (request?.customerEmail.toLowerCase() === from) {
            requestId = request.id;
            const earlier = listInboxEmails().find(email => email.direction === "INBOUND" && email.requestId === requestId && email.from === from);
            if (earlier) threadId = earlier.threadId;
          }
        } else if (reply?.type === "inbox") {
          const original = readInboxEmail(reply.id);
          if (original?.direction === "INBOUND" && original.from === from) { threadId = original.threadId; requestId = original.requestId; }
        }
      }
      email = { id, threadId, direction: "INBOUND", from, to, subject: String(data.subject || "(No subject)").slice(0, 300), body: typeof data.text === "string" && data.text.trim() ? data.text.slice(0, 30000) : "[This email has no plain-text content. HTML and attachments are not displayed.]", createdAt: new Date().toISOString(), requestId, status: "RECEIVED" } satisfies InboxEmail;
      saveInboxEmail(email);
    }
    if (email.requestId) await db.chatMessage.upsert({ where: { id: `email-${id}` }, update: {}, create: { id: `email-${id}`, requestId: email.requestId, senderRole: "CLIENT", senderName: `${email.from} (email)`, body: email.body } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[resend receiving] Failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Receiving failed; retry webhook" }, { status: 500 });
  }
}
