import { requireStaffPage } from "@/lib/staff-page";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateUTC } from "@/lib/constants";
import { Search } from "lucide-react";

export const metadata = { title: "Customers — Admin" };

type SearchParams = { q?: string };

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireStaffPage();
  const sp = await searchParams;
  const where = { role: "CLIENT" as const };
  // SQLite doesn't support typed where with OR on enum filter; use raw where
  const users = await db.user.findMany({
    where: sp.q
      ? {
          AND: [
            { role: "CLIENT" },
            {
              OR: [
                { email: { contains: sp.q } },
                { name: { contains: sp.q } },
              ],
            },
          ],
        }
      : where,
    orderBy: { createdAt: "desc" },
  });

  // Get request counts per user
  const userIds = users.map((u) => u.id);
  const counts = await db.request.groupBy({
    by: ["customerId"],
    where: { customerId: { in: userIds } },
    _count: true,
  });
  const countMap = new Map(counts.map((c) => [c.customerId, c._count]));

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow mb-1">Directory</p>
        <h1 className="font-heading text-slate text-[26px] lg:text-[32px] font-bold">
          Customers
        </h1>
        <p className="text-feather text-[14px] font-body mt-1">
          {users.length} customer{users.length !== 1 ? "s" : ""}
        </p>
      </div>

      <form method="get" className="bg-white rounded-xl border border-feather/20 p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-feather" aria-hidden />
          <input type="search" name="q" defaultValue={sp.q} placeholder="Email or name..." className="w-full h-10 pl-9 pr-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
        </div>
      </form>

      <div className="bg-white rounded-xl border border-feather/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[14px] font-body">
            <thead className="bg-ivory border-b border-feather/20 text-feather text-[11px] uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Name</th>
                <th className="text-left px-4 py-3 font-semibold">Email</th>
                <th className="text-left px-4 py-3 font-semibold">Phone</th>
                <th className="text-left px-4 py-3 font-semibold">Consent</th>
                <th className="text-left px-4 py-3 font-semibold">Joined</th>
                <th className="text-right px-4 py-3 font-semibold">Requests</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-feather/10">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-feather/5">
                  <td className="px-4 py-3 text-slate font-semibold">{u.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate">{u.email}</td>
                  <td className="px-4 py-3 text-feather">{u.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    {u.consentAt ? (
                      <span className="text-forest text-[12px] font-semibold">✓ {formatDateUTC(u.consentAt).split(",")[0]}</span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-feather text-[12px]">{formatDateUTC(u.createdAt).split(",")[0]}</td>
                  <td className="px-4 py-3 text-right text-slate font-semibold">
                    {countMap.get(u.id) ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block h-2 w-2 rounded-full ${u.status === "ACTIVE" ? "bg-forest" : "bg-tail-red"}`} />
                    <span className="ml-2 text-slate text-[12px]">{u.status.replace(/_/g, " ").toLowerCase()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
