import { requireStaffPage } from "@/lib/staff-page";
import { mailConfiguration } from "@/lib/email-transport";
import type { EditableEmailTemplate } from "@/lib/email-templates";
import { readEmailTemplates } from "@/lib/email-templates";
import { EmailTemplateEditor } from "@/components/admin/email-template-editor";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";

export default async function EmailTemplatesPage() {
  await requireStaffPage();
  const user = await getServerUser();
  const config = mailConfiguration();
  const templates = readEmailTemplates();
  return <div className="space-y-5">
    <h1 className="font-heading text-3xl text-slate">Customer emails</h1>
    <p className="text-feather">Prepare your replies and preview the site’s ivory, slate, green and gold email design. Messages are sent automatically at the corresponding request steps when Resend is enabled.</p>
    <div className="rounded-xl border border-feather/20 bg-white p-4 text-sm space-y-1"><p>Transport: <strong>{config.transport}</strong> · API key: {config.configured ? "Configured" : "Not configured"}</p><p>Sender: {config.from} · Replies: {config.replyTo}</p><p>Incoming replies: {process.env.MAIL_REPLY_DOMAIN || "No reply domain configured"} · Webhook secret: {process.env.RESEND_WEBHOOK_SECRET ? "Configured" : "Not configured"}</p><p>Reminder scheduler: {process.env.CRON_SECRET ? "Token configured; the server scheduler must call the endpoint every minute" : "Not configured"}</p><p>Preview saves messages without sending. SENT means accepted by the email provider, not guaranteed inbox delivery.</p></div>
    {Object.entries(templates).map(([name, initial]) => <EmailTemplateEditor key={name} name={name as EditableEmailTemplate} initial={initial} canEdit={!!user && can(user.role, "payment:configure")} />)}
  </div>;
}
