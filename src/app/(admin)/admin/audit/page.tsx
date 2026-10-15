import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { LiveRequestRefresh } from "@/components/parrotrehome/live-request-refresh";
import { AuditAction, type Prisma } from "@prisma/client";
import { requireStaffPage } from "@/lib/staff-page";
import { db } from "@/lib/db";
import { formatDateUTC } from "@/lib/constants";
import { History, Filter } from "lucide-react";

export const metadata = { title: "Audit log — Admin" };

type SearchParams = { action?: string; objectType?: string; q?: string; page?: string };

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireStaffPage();
  const sp = await searchParams;
  const viewer = await getServerUser();
  if (!viewer || !can(viewer.role, "audit:view")) return <p>Access restricted. Your own sign-in history is available in My account.</p>;
  const where: Prisma.AuditLogWhereInput = {};
  if (sp.action && Object.values(AuditAction).includes(sp.action as AuditAction)) where.action = sp.action as AuditAction;
  if (sp.objectType) where.objectType = sp.objectType;

  if (sp.q?.trim()) where.OR = [
    { objectId: { contains: sp.q.trim() } },
    { actor: { email: { contains: sp.q.trim() } } },
    { actor: { name: { contains: sp.q.trim() } } },
    { changes: { contains: sp.q.trim() } },
    { metadata: { contains: sp.q.trim() } },
  ];
  const page = Math.max(1, Math.min(1000000, Number.parseInt(sp.page || "1", 10) || 1));
  const pageSize = 50;
  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { actor: { select: { name: true, email: true, role: true } } },
    }),
    db.auditLog.count({ where }),
  ]);

  const actionTypes = ["CREATE", "UPDATE", "DELETE", "ASSIGN", "TRANSFER", "STATUS_CHANGE", "PAYMENT_VERIFY", "INSTRUCTION_SEND", "INSTRUCTION_EXPIRE", "LOGIN", "LOGIN_FAILED", "EXPORT"];
  const objectTypes = ["User", "Request", "Bird", "Product", "PaymentInstruction", "PaymentMethod"];

  return (
    <div className="space-y-5">
      <LiveRequestRefresh />
      <div>
        <p className="eyebrow mb-1">Compliance</p>
        <h1 className="font-heading text-slate text-[26px] lg:text-[32px] font-bold flex items-center gap-2">
          <History className="h-6 w-6 text-feather" aria-hidden /> Audit log
        </h1>
        <p className="text-feather text-[14px] font-body mt-1">
          Recorded sign-ins, account changes and operational actions. Times are shown in UTC.
          {total} entr{total === 1 ? "y" : "ies"} · Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
        </p>
      </div>

      <form method="get" className="bg-white rounded-xl border border-feather/20 p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
        <label className="text-xs text-feather">Search actor, object or details<input name="q" defaultValue={sp.q} className="block mt-1 p-3 border rounded-md text-slate" placeholder="Email, name, object or action detail" /></label>
        <div>
          <label htmlFor="action" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">Action</label>
          <select id="action" name="action" defaultValue={sp.action ?? ""} className="mt-1 h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring">
            <option value="">Any</option>
            {actionTypes.map((a) => (
              <option key={a} value={a}>{a.replace(/_/g, " ").toLowerCase()}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="objectType" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">Object type</label>
          <select id="objectType" name="objectType" defaultValue={sp.objectType ?? ""} className="mt-1 h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring">
            <option value="">Any</option>
            {objectTypes.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="h-10 px-5 rounded-md bg-tail-red hover:bg-tail-red-dark text-white text-[13px] font-body font-semibold inline-flex items-center gap-2">
          <Filter className="h-4 w-4" /> Filter
        </button>
        <a href="/admin/audit" className="h-10 px-3 rounded-md border border-feather/30 hover:bg-feather/10 text-feather text-[13px] font-body font-semibold inline-flex items-center">
          Reset
        </a>
      </form>

      <div className="bg-white rounded-xl border border-feather/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] font-body">
            <thead className="bg-ivory border-b border-feather/20 text-feather text-[11px] uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Timestamp</th>
                <th className="text-left px-4 py-3 font-semibold">Actor</th>
                <th className="text-left px-4 py-3 font-semibold">Action</th>
                <th className="text-left px-4 py-3 font-semibold">Object</th>
                <th className="text-left px-4 py-3 font-semibold">Changes / metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-feather/10">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-feather/5">
                  <td className="px-4 py-3 text-feather text-[12px] whitespace-nowrap">
                    {formatDateUTC(log.timestamp)}
                  </td>
                  <td className="px-4 py-3 text-slate">
                    {log.actor ? (
                      <>
                        <p className="font-semibold">{log.actor.name}</p>
                        <p className="text-xs">{log.actor.email}</p>
                        <p className="text-feather text-[11px]">{log.actorRole}</p>
                      </>
                    ) : (
                      <span className="text-feather italic">{log.actorRole}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-body font-semibold text-slate">
                      {log.action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-feather text-[12px]">
                    {log.objectType} · <code className="text-slate">{log.objectId.slice(0, 8)}</code>
                  </td>
                  <td className="px-4 py-3 text-feather text-[12px] max-w-md">
                    {log.changes && (
                      <p className="italic">{log.changes}</p>
                    )}
                    {log.metadata && (
                      <p className="italic">{log.metadata}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {total > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-feather text-[13px] font-body">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <a href={`?${new URLSearchParams({ ...sp, page: String(page - 1) }).toString()}`} className="h-9 px-3 rounded-md border border-feather/30 hover:bg-feather/10 text-slate text-[13px] font-body font-semibold inline-flex items-center">
                ← Previous
              </a>
            )}
            {page * pageSize < total && (
              <a href={`?${new URLSearchParams({ ...sp, page: String(page + 1) }).toString()}`} className="h-9 px-3 rounded-md border border-feather/30 hover:bg-feather/10 text-slate text-[13px] font-body font-semibold inline-flex items-center">
                Next →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
