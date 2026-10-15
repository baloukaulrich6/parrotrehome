import { requireStaffPage } from "@/lib/staff-page";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  LayoutDashboard,
  ClipboardList,
  Bird,
  Package,
  CalendarClock,
  CreditCard,
  Users,
  FileText,
  BarChart3,
  History,
  ShieldCheck,
  LogOut,
  Star,
  Ticket,
  Mail,
  AlertCircle,
  Settings,
} from "lucide-react";
import { ParrotRehomeLogo } from "@/components/parrotrehome/logo";
import { AdminSignOut } from "@/components/admin/sign-out";
import { MfaSettingsDialog } from "@/components/admin/mfa-settings-dialog";

export const metadata = { title: "Admin console" };

const NAV = [
  { href: "/account", label: "My account", icon: Users },
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/pending-actions", label: "Pending approvals", icon: AlertCircle },
  { href: "/admin/requests", label: "Requests", icon: ClipboardList },
  { href: "/admin/birds", label: "Birds", icon: Bird },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/appointments", label: "Appointments", icon: CalendarClock },
  { href: "/admin/payment-methods", label: "Payment methods", icon: CreditCard },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/inbox", label: "Support inbox", icon: Mail },
  { href: "/admin/settings", label: "Configuration", icon: Settings },
  { href: "/admin/email-templates", label: "Customer emails", icon: Mail },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/staff", label: "Staff", icon: ShieldCheck },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/cms", label: "CMS", icon: FileText },
  { href: "/admin/metrics", label: "Metrics", icon: BarChart3 },
  { href: "/admin/audit", label: "Audit log", icon: History },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStaffPage();

  const visibleNav = NAV.filter(item => (item.href !== "/admin/settings" || user.role === "SUPER_ADMIN") && (item.href !== "/admin/inbox" || ["SUPER_ADMIN", "MANAGER"].includes(user.role)));

  // Fetch full user record for MFA flag (getServerUser doesn't return it)
  const userFull = await db.user.findUnique({
    where: { id: user.id },
    select: { mfaEnabled: true },
  });

  // Count new requests for the sidebar badge
  const newCount = await db.request.count({
    where: { status: "RECEIVED" },
  });
  const toVerifyCount = await db.request.count({
    where: { status: "PAYMENT_TO_VERIFY" },
  });

  return (
    <div className="min-h-screen bg-ivory flex">
      {/* Sidebar */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col z-30"
        style={{ backgroundColor: "var(--sidebar)" }}
      >
        <div className="px-5 py-5 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
          <Link href="/admin">
            <ParrotRehomeLogo variant="mono-light" size="sm" showTagline={false} />
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scroll">
          {visibleNav.map((item) => {
            const badge =
              item.href === "/admin/requests"
                ? newCount + toVerifyCount > 0
                  ? newCount + toVerifyCount
                  : null
                : null;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-ivory/85 hover:bg-[var(--sidebar-accent)] hover:text-ivory transition-colors text-[14px] font-body font-medium focus-ring"
              >
                <span className="flex items-center gap-3">
                  <item.icon className="h-4 w-4" aria-hidden />
                  {item.label}
                </span>
                {badge != null && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-tail-red text-white text-[11px] font-bold">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        {/* User panel */}
        <div
          className="px-4 py-4 border-t"
          style={{ borderColor: "var(--sidebar-border)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-iris/20 border border-iris/40 text-iris font-body font-bold text-[12px]">
              {user.name?.charAt(0) ?? "?"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-ivory text-[13px] font-body font-semibold truncate">
                {user.name}
              </p>
              <p className="text-ivory/60 text-[11px] font-body truncate">
                {user.role.replace(/_/g, " ").toLowerCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MfaSettingsDialog mfaEnabled={userFull?.mfaEnabled ?? false} email={user.email} />
            <Link
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-2 rounded-md bg-[var(--sidebar-accent)] hover:bg-[var(--sidebar-ring)] text-ivory/85 hover:text-ivory text-[12px] font-body font-medium transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> View site
            </Link>
            <AdminSignOut />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div
        className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 px-4 flex items-center justify-between"
        style={{ backgroundColor: "var(--sidebar)" }}
      >
        <ParrotRehomeLogo variant="mono-light" size="sm" showTagline={false} />
        <details className="relative">
          <summary className="list-none cursor-pointer text-ivory p-2">
            <LayoutDashboard className="h-5 w-5" aria-hidden />
          </summary>
          <nav
            className="absolute right-0 mt-2 w-64 rounded-lg shadow-lg py-2 z-50"
            style={{ backgroundColor: "var(--sidebar)" }}
          >
            {visibleNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-2 text-ivory/85 hover:bg-[var(--sidebar-accent)] text-[14px] font-body"
              >
                <item.icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            ))}
            <div className="p-3"><MfaSettingsDialog mfaEnabled={user.mfaEnabled} email={user.email} /></div>
          </nav>
        </details>
      </div>

      {/* Main content */}
      <div className="flex-1 lg:pl-64 pt-14 lg:pt-0">
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
