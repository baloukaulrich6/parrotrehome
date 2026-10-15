import { requireStaffPage } from "@/lib/staff-page";
import { getServerUser } from "@/lib/auth";
import { readSiteSettings } from "@/lib/site-settings";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";
export default async function SettingsPage() {
  await requireStaffPage();
  const user = await getServerUser();
  if (user?.role !== "SUPER_ADMIN") return <p>Only the super administrator can manage site configuration.</p>;
  return <div className="space-y-5"><h1 className="font-heading text-3xl text-slate">Site configuration</h1><p className="text-feather">Update your public identity and contact details. These settings appear in the website header, footer and contact page. Email delivery credentials are configured separately on the server.</p><SiteSettingsForm initial={readSiteSettings()} /></div>;
}
