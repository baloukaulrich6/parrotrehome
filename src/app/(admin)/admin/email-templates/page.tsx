import { readEmailTemplates } from "@/lib/email-templates";
import { EmailTemplateEditor } from "@/components/admin/email-template-editor";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";

export default async function EmailTemplatesPage() {
  const user = await getServerUser();
  const templates = readEmailTemplates();
  return <div className="space-y-5">
    <h1 className="font-heading text-3xl text-slate">Customer emails</h1>
    <p className="text-feather">Prepare your replies and preview the site’s ivory, slate, green and gold email design. In demo mode, messages are saved in request history and are never sent.</p>
    {Object.entries(templates).map(([name, initial]) => <EmailTemplateEditor key={name} name={name as "request-received" | "instructions-ready"} initial={initial} canEdit={!!user && can(user.role, "payment:configure")} />)}
  </div>;
}
