import { SiteVisitors } from "@/components/admin/site-visitors";
import { can } from "@/lib/rbac";
import { requireStaffPage } from "@/lib/staff-page";
import Link from "next/link";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import {
  REQUEST_STATUS_META,
  formatUsd,
  formatDateUTC,
} from "@/lib/constants";
import {
  ClipboardList,
  Clock,
  AlertCircle,
  CalendarClock,
  TrendingUp,
  ArrowRight,
  Bird,
  Package,
  Users,
} from "lucide-react";
import { BarChart7, StatusDonut } from "@/components/admin/charts";

export const metadata = { title: "Admin dashboard" };

export default async function AdminDashboardPage() {
  await requireStaffPage();
  const user = await getServerUser();
  if (!user) return null;

  // KPIs
  const [
    newReqs,
    pendingReqs,
    awaitingInstr,
    toVerify,
    paidVerified,
    readyFulfill,
    completed,
    canceled,
    birdsAvailable,
    productsLow,
    customers,
    apptsUpcoming,
    totalRevenue,
    lowStockProducts,
  ] = await Promise.all([
    db.request.count({ where: { status: "RECEIVED" } }),
    db.request.count({ where: { status: "PENDING_REVIEW" } }),
    db.request.count({ where: { status: "AWAITING_INSTRUCTIONS" } }),
    db.request.count({ where: { status: "PAYMENT_TO_VERIFY" } }),
    db.request.count({ where: { status: "PAID_VERIFIED" } }),
    db.request.count({ where: { status: "READY_FOR_FULFILLMENT" } }),
    db.request.count({ where: { status: "COMPLETED" } }),
    db.request.count({ where: { status: { in: ["CANCELED", "REJECTED"] } } }),
    db.bird.count({ where: { status: "AVAILABLE" } }),
    db.product.count({ where: { stockQty: { lt: 5 } } }),
    db.user.count({ where: { role: "CLIENT" } }),
    db.appointment.count({
      where: {
        status: "CONFIRMED",
        slotStartUtc: { gt: new Date(), lt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14) },
      },
    }),
    db.request.aggregate({
      where: { status: "COMPLETED" },
      _sum: { totalQuoteUsd: true },
    }),
    // A-18: fetch actual low-stock products for the alerts panel
    db.product.findMany({
      where: { stockQty: { lt: 5 } },
      orderBy: { stockQty: "asc" },
      take: 10,
      select: { id: true, name: true, sku: true, category: true, stockQty: true },
    }),
  ]);

  // Recent requests for the activity feed
  const recentReqs = await db.request.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { items: true, agent: true },
  });

  // Requests needing immediate action
  const needAction = await db.request.findMany({
    where: {
      status: { in: ["RECEIVED", "PENDING_REVIEW", "PAYMENT_TO_VERIFY"] },
    },
    orderBy: { createdAt: "asc" },
    take: 8,
    include: { items: true },
  });

  // Chart data — requests by status
  const statusData = [
    { name: "New", value: newReqs, color: "#89959A" },
    { name: "Pending", value: pendingReqs, color: "#E0BD69" },
    { name: "Awaiting", value: awaitingInstr, color: "#89959A" },
    { name: "To verify", value: toVerify, color: "#D54149" },
    { name: "Paid", value: paidVerified, color: "#47745B" },
    { name: "Fulfillment", value: readyFulfill, color: "#47745B" },
    { name: "Completed", value: completed, color: "#424B50" },
  ].filter((d) => d.value > 0);

  // Last 7 days request volume
  const last7Days: { day: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    day.setHours(0, 0, 0, 0);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const count = await db.request.count({
      where: { createdAt: { gte: day, lt: next } },
    });
    last7Days.push({
      day: day.toLocaleDateString("en-US", { weekday: "short" }),
      count,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Welcome back, {user.name?.split(" ")[0]}</p>
          <h1 className="font-heading text-slate text-[26px] lg:text-[32px] font-bold">
            Operations dashboard
          </h1>
          <p className="text-feather text-[14px] font-body mt-1">
            {formatDateUTC(new Date())}
          </p>
        </div>
        <Link
          href="/admin/requests"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-slate hover:bg-slate-dark text-ivory text-[13px] font-body font-semibold transition-colors focus-ring"
        >
          View all requests <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      {can(user.role, "metrics:view") && <SiteVisitors />}

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          icon={ClipboardList}
          label="New requests"
          value={newReqs}
          color="text-feather"
          bg="bg-feather/10"
          href="/admin/requests?status=RECEIVED"
        />
        <KpiCard
          icon={Clock}
          label="Pending review"
          value={pendingReqs}
          color="text-iris-dark"
          bg="bg-iris/15"
          href="/admin/requests?status=PENDING_REVIEW"
        />
        <KpiCard
          icon={AlertCircle}
          label="Payment to verify"
          value={toVerify}
          color="text-tail-red"
          bg="bg-tail-red/10"
          href="/admin/requests?status=PAYMENT_TO_VERIFY"
        />
        <KpiCard
          icon={CalendarClock}
          label="Upcoming appts"
          value={apptsUpcoming}
          color="text-forest"
          bg="bg-forest/10"
          href="/admin/appointments"
        />
        <KpiCard
          icon={Bird}
          label="Birds available"
          value={birdsAvailable}
          color="text-slate"
          bg="bg-slate/5"
          href="/admin/birds"
        />
        <KpiCard
          icon={Users}
          label="Customers"
          value={customers}
          color="text-slate"
          bg="bg-slate/5"
          href="/admin/customers"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie — requests by status */}
        <div className="bg-white rounded-xl border border-feather/20 p-5">
          <h2 className="font-heading text-slate text-[16px] font-semibold mb-3">
            Requests by status
          </h2>
          {statusData.length === 0 ? (
            <p className="text-feather text-[13px] font-body py-8 text-center">No active requests.</p>
          ) : (
            <div className="flex flex-col items-center">
              <StatusDonut data={statusData} size={160} />
              <ul className="mt-3 w-full space-y-1 text-[12px] font-body">
                {statusData.map((d) => (
                  <li key={d.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-feather">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </span>
                    <span className="text-slate font-semibold">{d.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Bar — last 7 days */}
        <div className="bg-white rounded-xl border border-feather/20 p-5 lg:col-span-2">
          <h2 className="font-heading text-slate text-[16px] font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-forest" aria-hidden /> Requests (last 7 days)
          </h2>
          <BarChart7 data={last7Days} />
        </div>
      </div>

      {/* Needs action list */}
      <section className="bg-white rounded-xl border border-feather/20">
        <div className="px-5 py-4 border-b border-feather/15 flex items-center justify-between">
          <h2 className="font-heading text-slate text-[16px] font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-tail-red" aria-hidden /> Needs immediate attention
          </h2>
          <Link href="/admin/requests" className="text-tail-red text-[13px] font-body font-semibold hover:underline">
            See all
          </Link>
        </div>
        {needAction.length === 0 ? (
          <p className="px-5 py-8 text-feather text-[14px] font-body text-center">
            Nothing pending — all caught up.
          </p>
        ) : (
          <ul className="divide-y divide-feather/10">
            {needAction.map((r) => {
              const meta = REQUEST_STATUS_META[r.status];
              return (
                <li key={r.id}>
                  <Link
                    href={`/admin/requests/${r.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-feather/5 transition-colors focus-ring"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-heading text-slate text-[14px] font-bold">
                          {r.reference}
                        </span>
                        <span className={`status-badge ${meta.className} text-[11px]`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-feather text-[12px] font-body mt-0.5">
                        {r.customerName} · {r.customerEmail} · {r.items.length} item(s) · {formatDateUTC(r.createdAt)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-feather" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Low-stock alerts (A-18) */}
      {lowStockProducts.length > 0 && (
        <section className="bg-white rounded-xl border border-tail-red/30">
          <div className="px-5 py-4 border-b border-tail-red/20 flex items-center justify-between">
            <h2 className="font-heading text-slate text-[16px] font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-tail-red" aria-hidden /> Low-stock alerts
              <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-tail-red/15 text-tail-red text-[11px] font-bold">
                {lowStockProducts.length}
              </span>
            </h2>
            <Link href="/admin/products?low=1" className="text-tail-red text-[13px] font-body font-semibold hover:underline">
              Manage stock
            </Link>
          </div>
          <ul className="divide-y divide-feather/10">
            {lowStockProducts.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-feather/5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-body text-slate font-semibold text-[14px]">{p.name}</span>
                    <span className="text-[11px] font-body text-feather uppercase tracking-wide">{p.category}</span>
                    <span className={`status-badge ${p.stockQty === 0 ? "status-canceled" : "status-verify"} text-[11px]`}>
                      {p.stockQty === 0 ? "Out of stock" : `${p.stockQty} left`}
                    </span>
                  </div>
                  <p className="text-feather text-[12px] font-body mt-0.5">SKU: {p.sku}</p>
                </div>
                <Link
                  href="/admin/products"
                  className="inline-flex items-center gap-1 text-tail-red text-[12px] font-body font-semibold hover:underline"
                >
                  Restock <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Recent activity */}
      <section className="bg-white rounded-xl border border-feather/20">
        <div className="px-5 py-4 border-b border-feather/15 flex items-center justify-between">
          <h2 className="font-heading text-slate text-[16px] font-semibold">
            Recent activity
          </h2>
        </div>
        <ul className="divide-y divide-feather/10">
          {recentReqs.map((r) => {
            const meta = REQUEST_STATUS_META[r.status];
            return (
              <li key={r.id}>
                <Link
                  href={`/admin/requests/${r.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-feather/5 transition-colors focus-ring"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading text-slate text-[14px] font-bold">
                        {r.reference}
                      </span>
                      <span className={`status-badge ${meta.className} text-[11px]`}>
                        {meta.label}
                      </span>
                      <span className="text-feather text-[12px] font-body">
                        · {r.agent?.name ?? "Unassigned"}
                      </span>
                    </div>
                    <p className="text-feather text-[12px] font-body mt-0.5">
                      {r.customerName} · {r.type.replace(/_/g, " ").toLowerCase()} · {formatDateUTC(r.createdAt)}
                    </p>
                  </div>
                  {r.totalQuoteUsd != null && (
                    <span className="font-body font-semibold text-slate text-[13px]">
                      {formatUsd(Number(r.totalQuoteUsd))}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Bottom KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SmallStat label="Completed requests" value={completed} />
        <SmallStat label="Canceled / rejected" value={canceled} />
        <SmallStat label="Low-stock products" value={productsLow} link="/admin/products?low=1" />
        <SmallStat
          label="Verified revenue"
          value={formatUsd(Number(totalRevenue._sum.totalQuoteUsd ?? 0))}
          isText
        />
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
  href,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: number;
  color: string;
  bg: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border border-feather/20 p-4 hover:border-tail-red/30 transition-colors focus-ring"
    >
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${bg} mb-2`}>
        <Icon className={`h-4 w-4 ${color}`} aria-hidden />
      </span>
      <p className="font-heading text-slate text-[24px] font-bold leading-none">{value}</p>
      <p className="text-feather text-[12px] font-body mt-1">{label}</p>
    </Link>
  );
}

function SmallStat({ label, value, link, isText }: { label: string; value: number | string; link?: string; isText?: boolean }) {
  const content = (
    <div className="bg-white rounded-xl border border-feather/20 p-4">
      <p className={`font-heading text-slate ${isText ? "text-[18px]" : "text-[22px]"} font-bold leading-none`}>
        {value}
      </p>
      <p className="text-feather text-[12px] font-body mt-1">{label}</p>
    </div>
  );
  return link ? <Link href={link}>{content}</Link> : content;
}
