import { requireStaffPage } from "@/lib/staff-page";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { formatDateUTC, formatUsd } from "@/lib/constants";
import { PendingActionButtons } from "@/components/admin/pending-action-buttons";
import { ShieldCheck, AlertCircle } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Pending actions — Admin" };

const ACTION_LABELS: Record<string, string> = {
  PAYMENT_VERIFY_HIGH_VALUE: "High-value payment verification",
  PAYMENT_INSTRUCTION_HIGH_VALUE: "High-value payment instructions",
  REQUEST_CANCEL_AFTER_PAID: "Cancel a paid request",
  BIRD_DELETE: "Delete bird dossier",
};

export default async function AdminPendingActionsPage() {
  await requireStaffPage();
  const user = await getServerUser();
  if (!user) return null;
  if (!can(user.role, "payment:validate") && !can(user.role, "inventory:manage_birds")) {
    return (
      <div className="bg-white rounded-xl border border-feather/20 p-12 text-center">
        <ShieldCheck className="h-10 w-10 text-feather mx-auto mb-3" aria-hidden />
        <h1 className="font-heading text-slate text-[20px] mb-2">Access restricted</h1>
        <p className="text-feather text-[14px] font-body mb-4">
          Only authorized staff can review pending actions.
        </p>
        <Link href="/admin" className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-tail-red text-white text-[13px] font-body font-semibold">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const actions = await db.pendingAction.findMany({
    where: { status: "PENDING" },
    orderBy: { proposedAt: "desc" },
    include: {
      proposedBy: { select: { name: true, role: true } },
    },
  });

  // Recent approved/rejected for context
  const recent = await db.pendingAction.findMany({
    where: { status: { in: ["APPROVED", "REJECTED"] } },
    orderBy: { approvedAt: "desc" },
    take: 5,
    include: { proposedBy: { select: { name: true } } },
  });

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow mb-1">Compliance</p>
        <h1 className="font-heading text-slate text-[26px] lg:text-[32px] font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-tail-red" aria-hidden /> Pending actions (A-09)
        </h1>
        <p className="text-feather text-[14px] font-body mt-1">
          {actions.length} pending action{actions.length !== 1 ? "s" : ""} awaiting 2-person approval · 24h expiry
        </p>
      </div>

      <div className="bg-tail-red/5 border border-tail-red/20 rounded-xl p-4 text-[13px] font-body text-slate">
        <strong className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-tail-red" aria-hidden /> 2-person rule (A-09)</strong>
        <p className="mt-1">
          Sensitive changes (high-value payment verification ≥ $1,000, cancelling a paid request, deleting a bird dossier)
          require approval from a <strong>different</strong> authorized agent. The proposer cannot approve their own action.
          Each approval/rejection is permanently recorded in the audit log.
        </p>
      </div>

      {/* Pending actions list */}
      <div className="bg-white rounded-xl border border-feather/20">
        {actions.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldCheck className="h-10 w-10 text-forest mx-auto mb-3" aria-hidden />
            <h2 className="font-heading text-slate text-[20px] mb-2">All clear</h2>
            <p className="text-feather text-[14px] font-body">
              No pending actions awaiting approval. High-value operations will appear here when proposed.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-feather/10">
            {actions.map((a) => {
              const changes = JSON.parse(a.proposedChanges);
              const isOwnAction = a.proposedById === user.id;
              return (
                <li key={a.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-heading text-slate text-[16px] font-semibold">
                          {ACTION_LABELS[a.actionType] ?? a.actionType}
                        </span>
                        {isOwnAction && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-feather/15 text-feather text-[11px] font-body font-semibold">
                            Your action — cannot self-approve
                          </span>
                        )}
                        {a.thresholdValue && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-tail-red/10 text-tail-red text-[11px] font-body font-semibold">
                            Threshold: ${a.thresholdValue}
                          </span>
                        )}
                      </div>
                      <p className="text-feather text-[12px] font-body">
                        Proposed by <strong className="text-slate">{a.proposedByName}</strong> ({a.proposedBy?.role.replace(/_/g, " ").toLowerCase()})
                        {" · "}
                        {formatDateUTC(a.proposedAt)}
                        {" · "}
                        Expires {formatDateUTC(a.expiresAt)}
                      </p>
                      {a.reason && (
                        <p className="text-feather text-[12px] font-body italic mt-1">{a.reason}</p>
                      )}
                    </div>
                  </div>

                  {/* Proposed changes preview */}
                  <div className="bg-ivory border border-feather/20 rounded-md p-3 text-[12px] font-body">
                    <p className="text-feather uppercase font-semibold tracking-wide mb-1">Proposed changes</p>
                    <pre className="text-slate whitespace-pre-wrap">{JSON.stringify(changes, null, 2)}</pre>
                    {changes.amount && (
                      <p className="mt-2 text-slate font-semibold">
                        Amount: {formatUsd(Number(changes.amount))}
                      </p>
                    )}
                  </div>

                  {/* Approve / Reject buttons — disabled if it's the user's own action */}
                  <div className="mt-3">
                    <PendingActionButtons actionId={a.id} disabled={isOwnAction} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Recent history */}
      {recent.length > 0 && (
        <section className="bg-white rounded-xl border border-feather/20">
          <div className="px-5 py-3 border-b border-feather/15">
            <h2 className="font-heading text-slate text-[16px] font-semibold">Recent decisions</h2>
          </div>
          <ul className="divide-y divide-feather/10">
            {recent.map((a) => (
              <li key={a.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-slate font-body font-semibold text-[14px]">
                    {ACTION_LABELS[a.actionType] ?? a.actionType}
                  </p>
                  <p className="text-feather text-[12px] font-body">
                    Proposed by {a.proposedByName} · {a.status === "APPROVED" ? "Approved" : "Rejected"} by {a.approverName} · {a.approvedAt ? formatDateUTC(a.approvedAt) : "—"}
                  </p>
                  {a.rejectedReason && (
                    <p className="text-feather text-[11px] italic mt-0.5">Reason: {a.rejectedReason}</p>
                  )}
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-body font-semibold ${a.status === "APPROVED" ? "bg-forest/15 text-forest" : "bg-tail-red/15 text-tail-red"}`}>
                  {a.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
