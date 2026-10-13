import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { formatUsd, formatDateUTC } from "@/lib/constants";
import { CouponCreateButton, CouponEditButton, CouponDeleteButton } from "@/components/admin/coupon-actions";
import { Ticket } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Coupons — Admin" };

export default async function AdminCouponsPage() {
  const user = await getServerUser();
  if (!user) return null;
  if (!can(user.role, "cms:manage")) {
    return (
      <div className="bg-white rounded-xl border border-feather/20 p-12 text-center">
        <Ticket className="h-10 w-10 text-feather mx-auto mb-3" aria-hidden />
        <h1 className="font-heading text-slate text-[20px] mb-2">Access restricted</h1>
        <p className="text-feather text-[14px] font-body mb-4">
          Only managers and super-admins can manage coupons.
        </p>
        <Link href="/admin" className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-tail-red text-white text-[13px] font-body font-semibold">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const coupons = await db.coupon.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { requests: true } } },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Marketing</p>
          <h1 className="font-heading text-slate text-[26px] lg:text-[32px] font-bold flex items-center gap-2">
            <Ticket className="h-6 w-6 text-iris" aria-hidden /> Coupons
          </h1>
          <p className="text-feather text-[14px] font-body mt-1">
            {coupons.length} coupon{coupons.length !== 1 ? "s" : ""} · consent-based promotions (A-23)
          </p>
        </div>
        <CouponCreateButton />
      </div>

      <div className="bg-white rounded-xl border border-feather/20 overflow-hidden">
        {coupons.length === 0 ? (
          <div className="p-12 text-center">
            <Ticket className="h-10 w-10 text-feather mx-auto mb-3" aria-hidden />
            <h2 className="font-heading text-slate text-[20px] mb-2">No coupons yet</h2>
            <p className="text-feather text-[14px] font-body">
              Create your first coupon to offer discounts to your customers.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[14px] font-body">
              <thead className="bg-ivory border-b border-feather/20 text-feather text-[11px] uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Code</th>
                  <th className="text-left px-4 py-3 font-semibold">Description</th>
                  <th className="text-left px-4 py-3 font-semibold">Type</th>
                  <th className="text-right px-4 py-3 font-semibold">Value</th>
                  <th className="text-left px-4 py-3 font-semibold">Active</th>
                  <th className="text-right px-4 py-3 font-semibold">Used</th>
                  <th className="text-left px-4 py-3 font-semibold">Valid until</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-feather/10">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-feather/5">
                    <td className="px-4 py-3">
                      <code className="font-mono font-bold text-tail-red text-[13px] bg-tail-red/5 px-2 py-0.5 rounded">
                        {c.code}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-slate">{c.description ?? "—"}</td>
                    <td className="px-4 py-3 text-feather">{c.type.replace(/_/g, " ").toLowerCase()}</td>
                    <td className="px-4 py-3 text-right text-slate font-semibold">
                      {c.type === "PERCENTAGE" ? `${c.value}%` :
                       c.type === "FLAT_USD" ? formatUsd(c.value) :
                       "Free shipping"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block h-2 w-2 rounded-full ${c.active ? "bg-forest" : "bg-feather"}`} />
                      <span className="ml-2 text-slate text-[12px]">{c.active ? "Active" : "Disabled"}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate">
                      {c._count.requests}{c.usageLimit ? ` / ${c.usageLimit}` : " ∞"}
                    </td>
                    <td className="px-4 py-3 text-feather text-[12px]">
                      {c.validUntil ? formatDateUTC(c.validUntil).split(",")[0] : "No end"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <CouponEditButton coupon={{
                          id: c.id,
                          code: c.code,
                          description: c.description ?? "",
                          type: c.type,
                          value: c.value,
                          active: c.active,
                          validFrom: c.validFrom.toISOString(),
                          validUntil: c.validUntil?.toISOString() ?? null,
                          usageLimit: c.usageLimit,
                          minSubtotalUsd: c.minSubtotalUsd,
                          usedCount: c.usedCount,
                        }} />
                        <CouponDeleteButton couponId={c.id} code={c.code} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
