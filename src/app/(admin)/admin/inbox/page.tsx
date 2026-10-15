import Link from "next/link";
import { requireStaffPage } from "@/lib/staff-page";
import { listInboxEmails, readInboxEmail } from "@/lib/email-inbox";
import { mailConfiguration } from "@/lib/email-transport";
import { InboxReply } from "@/components/admin/inbox-reply";
export default async function InboxPage({ searchParams }: { searchParams: Promise<{ thread?: string }> }) {
  const user = await requireStaffPage();
  if (!["SUPER_ADMIN", "MANAGER"].includes(user.role)) return <p>Support inbox access is restricted to administrators and managers.</p>;
  const emails = listInboxEmails(); const selected = (await searchParams).thread;
  const root = selected ? readInboxEmail(selected) : null;
  const incoming = emails.filter(email => email.direction === "INBOUND" && email.id === email.threadId)
    .map(email => ({ ...email, lastActivity: emails.find(item => item.threadId === email.threadId)?.createdAt || email.createdAt }))
    .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity)).slice(0, 100);
  const conversation = root ? emails.filter(email => email.threadId === root.threadId).reverse() : [];
  const config = mailConfiguration();
  return <div className="space-y-5"><h1 className="font-heading text-3xl text-slate">Support inbox</h1><p className="text-feather">Incoming email via Resend. Replies are sent from {config.from}. Email sender addresses are not proof of identity. Verify payments with the payment provider.</p>
    {config.inboundProvider === "mailbox" && <p className="rounded-xl border p-4 bg-white text-sm">Replies currently go to {config.replyTo} in your external mailbox (Zoho, Outlook or your configured provider). To receive them here, configure Resend receiving and explicitly select the Resend inbound mode.</p>}
    {!process.env.RESEND_WEBHOOK_SECRET && <p className="rounded-xl border p-4 bg-white">Receiving is not configured. Set the Resend webhook secret and enable receiving for your reply domain.</p>}
    <div className="grid gap-5 lg:grid-cols-3"><nav aria-label="Support conversations" className="space-y-2">{incoming.length ? incoming.map(email => <Link className="block rounded-xl border bg-white p-4" key={email.id} href={`/admin/inbox?thread=${email.threadId}`}><strong className="block break-words">{email.subject}</strong><span className="text-sm break-all">{email.from}</span><time className="block text-xs text-feather">{new Date(email.lastActivity).toLocaleString("en-GB", { timeZone: "UTC" })} UTC</time></Link>) : <p>No incoming emails yet.</p>}</nav>
      <section className="lg:col-span-2 rounded-xl border bg-white p-5">{root ? <><h2 className="font-heading text-xl">{root.subject}</h2>{root.requestId && <Link className="text-forest underline" href={`/admin/requests/${root.requestId}`}>Open linked request</Link>}{conversation.map(email => <article className="border-b py-4" key={email.id}><p className="text-sm font-semibold break-all">{email.from} → {email.to.join(", ")} · {email.status}</p><p className="text-xs text-feather">{email.createdAt}</p><p className="whitespace-pre-wrap break-words text-sm mt-3">{email.body}</p></article>)}<InboxReply id={root.id} /></> : <p>Select a conversation to read and reply.</p>}</section>
    </div></div>;
}
