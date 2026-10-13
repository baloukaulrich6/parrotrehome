import Link from "next/link";
import { db } from "@/lib/db";
import {
  REQUEST_STATUS_META,
  formatUsd,
  formatDateUTC,
} from "@/lib/constants";
import { Search, Download, Filter, ArrowRight } from "lucide-react";

export const metadata = { title: "Requests — Admin" };

type SearchParams = {
  status?: string;
  type?: string;
  agentId?: string;
  q?: string;
  page?: string;
};

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const where: Record<string, unknown> = {};
  if (sp.status) where.status = sp.status;
  if (sp.type) where.type = sp.type;
  if (sp.agentId) where.agentId = sp.agentId;
  if (sp.q) {
    where.OR = [
      { reference: { contains: sp.q } },
      { customerName: { contains: sp.q } },
      { customerEmail: { contains: sp.q } },
    ];
  }

  const page = parseInt(sp.page ?? "1", 10);
  const pageSize = 20;
  const [requests, total, agents] = await Promise.all([
    db.request.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { items: true, agent: true },
    }),
    db.request.count({ where }),
    db.user.findMany({
      where: { role: { in: ["AGENT", "MANAGER", "SUPER_ADMIN"] } },
    }),
  ]);

  const statuses = Object.keys(REQUEST_STATUS_META);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Back-office</p>
          <h1 className="font-heading text-slate text-[26px] lg:text-[32px] font-bold">
            Requests
          </h1>
          <p className="text-feather text-[14px] font-body mt-1">
            {total} {total === 1 ? "request" : "requests"} · Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
          </p>
        </div>
        <a
          href={`/api/admin/requests/export?status=${sp.status ?? ""}&type=${sp.type ?? ""}&q=${sp.q ?? ""}`}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-forest hover:bg-forest-dark text-white text-[13px] font-body font-semibold transition-colors focus-ring"
        >
          <Download className="h-4 w-4" aria-hidden /> Export CSV
        </a>
      </div>

      {/* Filters */}
      <form method="get" className="bg-white rounded-xl border border-feather/20 p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label htmlFor="q" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">Search</label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-feather" aria-hidden />
              <input
                id="q"
                type="search"
                name="q"
                defaultValue={sp.q}
                placeholder="Reference, name, email..."
                className="w-full h-10 pl-9 pr-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring"
              />
            </div>
          </div>
          <div>
            <label htmlFor="status" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">Status</label>
            <select id="status" name="status" defaultValue={sp.status ?? ""} className="mt-1 h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring">
              <option value="">Any</option>
              {statuses.map((s) => (
                <option key={s} value={s}>{REQUEST_STATUS_META[s].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="type" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">Type</label>
            <select id="type" name="type" defaultValue={sp.type ?? ""} className="mt-1 h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring">
              <option value="">Any</option>
              <option value="PARROT_PURCHASE">Parrot purchase</option>
              <option value="ACCESSORY_ORDER">Accessory order</option>
              <option value="AVIAN_CONSULTATION">Avian consultation</option>
            </select>
          </div>
          <div>
            <label htmlFor="agentId" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">Agent</label>
            <select id="agentId" name="agentId" defaultValue={sp.agentId ?? ""} className="mt-1 h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring">
              <option value="">Any</option>
              <option value="unassigned">— Unassigned —</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="h-10 px-5 rounded-md bg-tail-red hover:bg-tail-red-dark text-white text-[13px] font-body font-semibold inline-flex items-center gap-2">
            <Filter className="h-4 w-4" aria-hidden /> Filter
          </button>
          <a href="/admin/requests" className="h-10 px-3 rounded-md border border-feather/30 hover:bg-feather/10 text-feather text-[13px] font-body font-semibold inline-flex items-center">
            Reset
          </a>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl border border-feather/20 overflow-hidden">
        {requests.length === 0 ? (
          <p className="p-12 text-center text-feather text-[14px] font-body">
            No requests match these filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[14px] font-body">
              <thead className="bg-ivory border-b border-feather/20 text-feather text-[11px] uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Reference</th>
                  <th className="text-left px-4 py-3 font-semibold">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold">Type</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Agent</th>
                  <th className="text-right px-4 py-3 font-semibold">Total</th>
                  <th className="text-left px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-feather/10">
                {requests.map((r) => {
                  const meta = REQUEST_STATUS_META[r.status];
                  return (
                    <tr key={r.id} className="hover:bg-feather/5 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/admin/requests/${r.id}`} className="font-heading text-slate font-bold hover:text-tail-red">
                          {r.reference}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate">
                        <p className="font-medium">{r.customerName}</p>
                        <p className="text-feather text-[12px]">{r.customerEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-feather">
                        {r.type === "PARROT_PURCHASE" ? "Parrot" : r.type === "ACCESSORY_ORDER" ? "Accessory" : "Consultation"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`status-badge ${meta.className} text-[11px]`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-feather">
                        {r.agent?.name ?? <span className="italic text-tail-red">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-slate font-semibold">
                        {r.totalQuoteUsd != null ? formatUsd(Number(r.totalQuoteUsd)) : "—"}
                      </td>
                      <td className="px-4 py-3 text-feather text-[12px]">
                        {formatDateUTC(r.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/requests/${r.id}`}
                          className="inline-flex items-center gap-1 text-tail-red hover:text-tail-red-dark text-[12px] font-body font-semibold"
                        >
                          Open <ArrowRight className="h-3 w-3" aria-hidden />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-feather text-[13px] font-body">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={`?${new URLSearchParams({ ...sp, page: String(page - 1) }).toString()}`}
                className="h-9 px-3 rounded-md border border-feather/30 hover:bg-feather/10 text-slate text-[13px] font-body font-semibold inline-flex items-center"
              >
                ← Previous
              </a>
            )}
            {page * pageSize < total && (
              <a
                href={`?${new URLSearchParams({ ...sp, page: String(page + 1) }).toString()}`}
                className="h-9 px-3 rounded-md border border-feather/30 hover:bg-feather/10 text-slate text-[13px] font-body font-semibold inline-flex items-center"
              >
                Next →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
