import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getServerUser } from "@/lib/auth";
import { readInboxEmail, saveInboxEmail, type InboxEmail } from "@/lib/email-inbox";
import { deliverEmail, mailConfiguration, customerReplyAddress } from "@/lib/email-transport";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
const schema = z.object({ body: z.string().trim().min(2).max(10000) });
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser();
  if (!user) return new Response(null, { status: 401 });
  if (!["SUPER_ADMIN", "MANAGER"].includes(user.role)) return new Response(null, { status: 403 });
  if (req.headers.get("origin") !== new URL(process.env.NEXTAUTH_URL || req.url).origin) return new Response(null, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a message between 2 and 10000 characters." }, { status: 400 });
  const original = readInboxEmail((await params).id);
  if (!original || original.direction !== "INBOUND") return new Response(null, { status: 404 });
  const email: InboxEmail = { id: randomUUID(), threadId: original.threadId, direction: "OUTBOUND", from: mailConfiguration().from, to: [original.from], subject: `Re: ${original.subject.replace(/^(Re:\s*)+/i, "")}`.replace(/[\r\n]/g, " "), body: parsed.data.body, createdAt: new Date().toISOString(), requestId: original.requestId, status: "QUEUED" };
  saveInboxEmail(email);
  try { email.status = await deliverEmail({ toAddress: original.from, subject: email.subject, body: email.body, replyTo: customerReplyAddress("inbox", original.threadId) }, email.id); }
  catch { email.status = "FAILED"; }
  saveInboxEmail(email);
  if (original.requestId) await db.chatMessage.create({ data: { requestId: original.requestId, senderId: user.id, senderRole: user.role, senderName: user.name || user.email, body: `[Email ${email.status.toLowerCase()}] ${email.body}` } });
  await audit({ actorId: user.id, actorRole: user.role, objectType: "SupportEmail", objectId: email.id, action: "CREATE", metadata: { status: email.status, threadId: email.threadId } });
  return NextResponse.json({ status: email.status, error: email.status === "FAILED" ? "Email delivery failed. Check Resend configuration." : undefined }, { status: email.status === "FAILED" ? 502 : 200 });
}
