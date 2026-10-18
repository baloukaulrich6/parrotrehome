import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/staff-page";
import { RetryAccountEmail } from "@/components/admin/account-alert";
export const metadata = { title: "Account notification history" };
export default async function AccountNotifications() {
  const user = await requireStaffPage(); if (user.role !== "SUPER_ADMIN") redirect("/admin");
  const messages = await db.accountNotification.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return <section className="space-y-5"><h1 className="font-heading text-3xl">Account notification history</h1><p>Registration notices go to your configured team mailbox. Security advice requires super-admin review and is created once per account. QUEUED means preview only; SENT means provider acceptance, not inbox delivery. SENDING with no result requires checking the provider before any manual recovery. No passwords are recorded here.</p>{messages.length === 0 && <p>No notifications yet.</p>}{messages.map(message => <article key={message.id} className="rounded-xl border bg-white p-5 space-y-2"><h2 className="font-semibold">{message.subject}</h2><p className="text-sm">{message.kind} · {message.toAddress} · {message.status} · {message.createdAt.toISOString()}</p><p className="whitespace-pre-wrap text-sm">{message.body}</p>{message.errorMessage && <p className="text-tail-red text-sm">{message.errorMessage}</p>}{["FAILED", "QUEUED"].includes(message.status) && <RetryAccountEmail id={message.id} />}</article>)}</section>;
}
