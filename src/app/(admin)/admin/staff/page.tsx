import { StaffAccountForm } from "@/components/admin/staff-account-form";
import { canManageAccount } from "@/lib/user-management";
import { LiveRequestRefresh } from "@/components/parrotrehome/live-request-refresh";
import { requireStaffPage } from "@/lib/staff-page";
import Link from "next/link";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { formatDateUTC } from "@/lib/constants";
import { ShieldCheck, ShieldAlert, Search } from "lucide-react";

export const metadata = { title: "Staff — Admin" };

type SearchParams = { q?: string; role?: string };

export default async function AdminStaffPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireStaffPage();
  const sp = await searchParams;
  const user = await getServerUser();
  if (!user) return null;
  // Only super-admin + manager can view full staff directory
  if (!can(user.role, "users:manage") && !can(user.role, "users:manage_agents")) {
    return (
      <div className="bg-white rounded-xl border border-feather/20 p-12 text-center">
        <ShieldAlert className="h-10 w-10 text-feather mx-auto mb-3" aria-hidden />
        <h1 className="font-heading text-slate text-[20px] mb-2">Access restricted</h1>
        <p className="text-feather text-[14px] font-body mb-4">
          Only super-admins and managers can view the staff directory.
        </p>
        <Link href="/admin" className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-tail-red text-white text-[13px] font-body font-semibold">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const where: Record<string, unknown> = {
    role: { not: "CLIENT" },
  };
  if (sp.role && ["SUPER_ADMIN", "MANAGER", "AGENT", "STOCK_MANAGER", "AVIAN_PROFESSIONAL"].includes(sp.role)) where.role = sp.role;
  if (sp.q) {
    where.OR = [
      { email: { contains: sp.q } },
      { name: { contains: sp.q } },
    ];
  }
  const staff = await db.user.findMany({
    where,
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true, status: true, mfaEnabled: true, lastLoginAt: true },
  });

  return (
    <div className="space-y-5">
      <LiveRequestRefresh />
      <div>
        <p className="eyebrow mb-1">Team</p>
        <h1 className="font-heading text-slate text-[26px] lg:text-[32px] font-bold">
          Staff directory
        </h1>
        <p className="text-feather text-[14px] font-body mt-1">
          {staff.length} staff member{staff.length !== 1 ? "s" : ""} · Authenticator required for administrative access
        </p>
      </div>

      <div className="flex items-center gap-4"><StaffAccountForm managerOnly={user.role === "MANAGER"} /><Link href="/account" className="text-sm text-forest underline">My account &amp; sign-ins</Link><Link href="/admin/audit?action=LOGIN" className="text-sm text-forest underline">Sign-in history</Link></div>

      <form method="get" className="bg-white rounded-xl border border-feather/20 p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <label htmlFor="q" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">Search</label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-feather" aria-hidden />
            <input id="q" type="search" name="q" defaultValue={sp.q} placeholder="Name or email..." className="w-full h-10 pl-9 pr-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
          </div>
        </div>
        <div>
          <label htmlFor="role" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">Role</label>
          <select id="role" name="role" defaultValue={sp.role ?? ""} className="mt-1 h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring">
            <option value="">Any</option>
            <option value="SUPER_ADMIN">Super admin</option>
            <option value="MANAGER">Manager</option>
            <option value="AGENT">Agent</option>
            <option value="STOCK_MANAGER">Stock manager</option>
            <option value="AVIAN_PROFESSIONAL">Avian professional</option>
          </select>
        </div>
        <button type="submit" className="h-10 px-5 rounded-md bg-tail-red hover:bg-tail-red-dark text-white text-[13px] font-body font-semibold inline-flex items-center gap-2">
          <Search className="h-4 w-4" /> Search
        </button>
      </form>

      <div className="bg-white rounded-xl border border-feather/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[14px] font-body">
            <thead className="bg-ivory border-b border-feather/20 text-feather text-[11px] uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Name</th>
                <th className="text-left px-4 py-3 font-semibold">Email</th>
                <th className="text-left px-4 py-3 font-semibold">Role</th>
                <th className="text-left px-4 py-3 font-semibold">MFA</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Last sign-in (UTC)</th>
                <th className="text-left px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-feather/10">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-feather/5">
                  <td className="px-4 py-3 text-slate font-semibold">{s.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate">{s.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-feather/10 text-feather text-[11px] font-body font-semibold uppercase tracking-wide">
                      {s.role.replace(/_/g, " ").toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {s.mfaEnabled ? (
                      <span className="inline-flex items-center gap-1 text-forest text-[12px] font-body font-semibold">
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Enabled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-tail-red text-[12px] font-body font-semibold">
                        <ShieldAlert className="h-3.5 w-3.5" aria-hidden /> Required
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block h-2 w-2 rounded-full ${s.status === "ACTIVE" ? "bg-forest" : "bg-tail-red"}`} />
                    <span className="ml-2 text-slate text-[12px]">{s.status.replace(/_/g, " ").toLowerCase()}</span>
                  </td>
                  <td className="px-4 py-3 text-feather text-[12px]">
                    {s.lastLoginAt ? formatDateUTC(s.lastLoginAt) : "No recorded sign-in"}
                  </td>
                  <td className="px-4 py-3">{canManageAccount(user.role, s.role, s.role) && <StaffAccountForm account={s} managerOnly={user.role === "MANAGER"} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-tail-red/5 border border-tail-red/20 rounded-xl p-4 text-[13px] font-body text-slate">
        <strong>Security note:</strong> Staff must enable MFA via the
        &ldquo;Set up MFA&rdquo; button in My account. A pending account can access only MFA setup until enrollment is complete.
      </div>
    </div>
  );
}
