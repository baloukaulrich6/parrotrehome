import { requireStaffPage } from "@/lib/staff-page";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { formatDateUTC } from "@/lib/constants";
import { Mail, Download } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Newsletter — Admin" };

export default async function AdminNewsletterPage() {
  await requireStaffPage();
  const user = await getServerUser();
  if (!user) return null;
  if (!can(user.role, "cms:manage")) {
    return (
      <div className="bg-white rounded-xl border border-feather/20 p-12 text-center">
        <Mail className="h-10 w-10 text-feather mx-auto mb-3" aria-hidden />
        <h1 className="font-heading text-slate text-[20px] mb-2">Access restricted</h1>
        <p className="text-feather text-[14px] font-body mb-4">
          Only managers and super-admins can manage subscribers.
        </p>
        <Link href="/admin" className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-tail-red text-white text-[13px] font-body font-semibold">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const subscribers = await db.newsletterSubscription.findMany({
    orderBy: { consentAt: "desc" },
    take: 200,
  });
  const activeCount = subscribers.filter((s) => s.active).length;
  const unsubscribedCount = subscribers.length - activeCount;

  // CSV export URL
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(
    "email,name,source,consentAt,active,unsubscribedAt\n" +
    subscribers.map((s) =>
      [s.email, `"${s.name ?? ""}"`, s.source, s.consentAt.toISOString(), String(s.active), s.unsubscribedAt?.toISOString() ?? ""].join(",")
    ).join("\n")
  )}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Marketing</p>
          <h1 className="font-heading text-slate text-[26px] lg:text-[32px] font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-iris" aria-hidden /> Newsletter subscribers
          </h1>
          <p className="text-feather text-[14px] font-body mt-1">
            {activeCount} active · {unsubscribedCount} unsubscribed · {subscribers.length} total (A-23)
          </p>
        </div>
        <a
          href={csvHref}
          download={`parrotrehome-subscribers-${new Date().toISOString().slice(0, 10)}.csv`}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-forest hover:bg-forest-dark text-white text-[13px] font-body font-semibold"
        >
          <Download className="h-4 w-4" /> Export CSV
        </a>
      </div>

      <div className="bg-white rounded-xl border border-feather/20 overflow-hidden">
        {subscribers.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="h-10 w-10 text-feather mx-auto mb-3" aria-hidden />
            <h2 className="font-heading text-slate text-[20px] mb-2">No subscribers yet</h2>
            <p className="text-feather text-[14px] font-body">
              The newsletter subscribe form is in the site footer. Subscribers will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[14px] font-body">
              <thead className="bg-ivory border-b border-feather/20 text-feather text-[11px] uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Email</th>
                  <th className="text-left px-4 py-3 font-semibold">Name</th>
                  <th className="text-left px-4 py-3 font-semibold">Source</th>
                  <th className="text-left px-4 py-3 font-semibold">Consent date</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-feather/10">
                {subscribers.map((s) => (
                  <tr key={s.id} className="hover:bg-feather/5">
                    <td className="px-4 py-3 text-slate font-semibold">{s.email}</td>
                    <td className="px-4 py-3 text-feather">{s.name ?? "—"}</td>
                    <td className="px-4 py-3 text-feather">{s.source}</td>
                    <td className="px-4 py-3 text-feather text-[12px]">{formatDateUTC(s.consentAt).split(",")[0]}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block h-2 w-2 rounded-full ${s.active ? "bg-forest" : "bg-feather"}`} />
                      <span className="ml-2 text-slate text-[12px]">{s.active ? "Active" : "Unsubscribed"}</span>
                      {s.unsubscribedAt && (
                        <span className="block text-[11px] text-feather mt-0.5">on {formatDateUTC(s.unsubscribedAt).split(",")[0]}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-ivory border border-feather/20 rounded-xl p-4 text-[13px] font-body text-feather">
        <strong>Consent notice:</strong> All subscribers explicitly consented via the subscribe form in the site footer.
        Consent timestamps are GDPR-compliant. Unsubscribes are honored immediately. Production deployment should
        integrate with a transactional email provider (Resend, SendGrid) for actual newsletter sends.
      </div>
    </div>
  );
}
