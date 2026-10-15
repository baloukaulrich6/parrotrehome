import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth";
import { MfaSettingsDialog } from "@/components/admin/mfa-settings-dialog";
import { AdminSignOut } from "@/components/admin/sign-out";

export const metadata = { title: "Set up your authenticator", robots: { index: false } };
export default async function StaffMfaPage() {
  const user = await getServerUser({ allowMfaSetup: true });
  if (!user) redirect("/sign-in?callbackUrl=/admin");
  if (user.role === "CLIENT") redirect("/my-requests");
  if (user.mfaEnabled) redirect("/admin");
  return <section className="max-w-xl mx-auto my-12 rounded-2xl bg-white border border-feather/20 p-8 space-y-5">
    <p className="eyebrow">Secure staff access</p><h1 className="font-heading text-3xl text-slate">Protect your account before continuing</h1>
    <p className="text-sm text-slate">Signed in as {user.email}. Your password was accepted. Staff tools become available after you activate an authenticator and sign in with its code.</p>
    <p className="text-sm text-feather">Use Google Authenticator, Microsoft Authenticator or 2FAS. Keep access to your phone and a backup of your authenticator in a safe place.</p>
    <div className="flex gap-3 items-center"><MfaSettingsDialog mfaEnabled={false} email={user.email} /><AdminSignOut /></div>
  </section>;
}
