import { requireStaffPage } from "@/lib/staff-page";
import { LiveRequestRefresh } from "@/components/parrotrehome/live-request-refresh";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { isAdminRole, can } from "@/lib/rbac";
import {
  REQUEST_STATUS_META,
  formatUsd,
  formatDateUTC,
  canTransition,
} from "@/lib/constants";
import {
  AssignAgentForm,
  CreateInstructionsForm,
  VerifyPaymentForm,
  CancelRequestForm,
  InternalCommentForm,
  AdvanceButton,
} from "@/components/admin/request-actions";
import { ChatThread } from "@/components/parrotrehome/chat-thread";
import { AdminRescheduleActions } from "@/components/admin/admin-reschedule-actions";
import {
  ArrowLeft,
  Bird,
  Package,
  Stethoscope,
  Mail,
  Phone,
  MapPin,
  User,
  Clock,
  History,
  FileText,
  ShieldCheck,
  Lock,
  MessageSquare,
} from "lucide-react";

export const metadata = { title: "Dossier — Admin" };

export default async function DossierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaffPage();
  const { id } = await params;
  const user = await getServerUser();
  if (!user || !isAdminRole(user.role)) {
    redirect(`/sign-in?callbackUrl=/admin/requests/${id}`);
  }

  const request = await db.request.findUnique({
    where: { id },
    include: {
      items: { include: { bird: true, product: true } },
      appointments: { include: { professional: true } },
      messages: { orderBy: { sentAt: "asc" } },
      paymentInstructions: { orderBy: { createdAt: "desc" } },
      paymentChecks: { orderBy: { verifiedAt: "desc" }, include: { verifier: true } },
      comments: { orderBy: { createdAt: "asc" }, include: { user: true } },
      selectedPaymentMethod: true,
      customer: true,
      agent: true,
    },
  });

  if (!request) return notFound();
  const auditLogs = await db.auditLog.findMany({ where: { objectType: "Request", objectId: id }, orderBy: { timestamp: "asc" } });

  // RBAC: agents only see assigned requests (T-05)
  if (user.role === "AGENT" && request.agentId !== user.id) {
    return notFound();
  }

  const meta = REQUEST_STATUS_META[request.status];
  const agents = await db.user.findMany({
    where: { role: { in: ["AGENT", "MANAGER", "SUPER_ADMIN"] }, status: "ACTIVE" },
    orderBy: { name: "asc" },
  });
  const paymentMethods = await db.paymentMethod.findMany({
    where: { active: true },
    orderBy: { displayOrder: "asc" },
  });
  const activeInstruction = request.paymentInstructions.find((i) => i.status === "ACTIVE");
  const canAssign = can(user.role, "request:assign");
  const canPrepareInstructions = can(user.role, "payment:prepare_instructions") && (user.role !== "AGENT" || request.agentId === user.id);
  const canVerify = can(user.role, "payment:validate");
  const canCancel = can(user.role, "request:cancel");

  return (
    <div className="space-y-5">
      <LiveRequestRefresh />
      {/* Header */}
      <div>
        <Link
          href="/admin/requests"
          className="inline-flex items-center gap-1 text-feather hover:text-tail-red text-[13px] font-body font-semibold mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to requests
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-heading text-slate text-[24px] lg:text-[30px] font-bold">
                {request.reference}
              </h1>
              <span className={`status-badge ${meta.className}`}>{meta.label}</span>
            </div>
            <p className="text-feather text-[14px] font-body">
              {meta.description}
            </p>
          </div>
          {request.totalQuoteUsd != null && (
            <div className="text-right">
              <p className="text-feather text-[11px] font-body font-semibold uppercase tracking-wide">
                Estimated total
              </p>
              <p className="font-heading text-slate text-[26px] font-bold">
                {formatUsd(Number(request.totalQuoteUsd))}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — main details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Items */}
          <section className="bg-white rounded-xl border border-feather/20">
            <div className="px-5 py-3 border-b border-feather/15">
              <h2 className="font-heading text-slate text-[16px] font-semibold">
                Items ({request.items.length})
              </h2>
            </div>
            <ul className="divide-y divide-feather/10">
              {request.items.map((item) => {
                const name = item.bird?.commonName ?? item.product?.name ?? "Item";
                const sub = item.bird?.individualId ? `ID: ${item.bird.individualId}` : item.product?.sku ? `SKU: ${item.product.sku}` : "";
                return (
                  <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="h-10 w-10 flex-shrink-0 rounded-md bg-feather/10 flex items-center justify-center">
                      {item.birdId ? (
                        <Bird className="h-4 w-4 text-slate" aria-hidden />
                      ) : (
                        <Package className="h-4 w-4 text-slate" aria-hidden />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate font-body font-semibold text-[14px]">{name}</p>
                      {sub && <p className="text-feather text-[12px] font-body">{sub}</p>}
                    </div>
                    <div className="text-right text-[13px] font-body">
                      <p className="text-feather">{formatUsd(Number(item.quotedPriceUsd))} × {item.quantity}</p>
                      <p className="text-slate font-semibold">{formatUsd(Number(item.quotedPriceUsd) * item.quantity)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Appointment */}
          {request.appointments.length > 0 && (
            <section className="bg-white rounded-xl border border-feather/20">
              <div className="px-5 py-3 border-b border-feather/15">
                <h2 className="font-heading text-slate text-[16px] font-semibold flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-forest" aria-hidden /> Consultation
                </h2>
              </div>
              <div className="px-5 py-3 space-y-3 text-[14px] font-body">
                {request.appointments.map((a) => (
                  <div key={a.id} className="border-b border-feather/10 pb-3 last:border-0 last:pb-0">
                    <p className="text-slate"><strong>Professional:</strong> {a.professional.name}</p>
                    <p className="text-slate"><strong>Slot (UTC):</strong> {formatDateUTC(a.slotStartUtc)}</p>
                    <p className="text-slate"><strong>Duration:</strong> {a.durationMinutes} minutes</p>
                    <p className="text-slate"><strong>Subject:</strong> {a.subject}</p>
                    <p className="text-slate"><strong>Status:</strong> <span className="font-semibold">{a.status}</span></p>
                    <p className="text-slate"><strong>Price:</strong> {formatUsd(Number(a.priceUsd))}</p>
                    {a.animalInfo && (
                      <pre className="mt-2 p-2 bg-ivory rounded text-[12px] font-body text-feather whitespace-pre-wrap">
                        {a.animalInfo}
                      </pre>
                    )}
                    {/* F-20: Admin reschedule confirm/reject UI */}
                    <div className="mt-2">
                      <AdminRescheduleActions
                        appt={{
                          id: a.id,
                          slotStartUtc: a.slotStartUtc.toISOString(),
                          proposedSlotStartUtc: a.proposedSlotStartUtc?.toISOString() ?? null,
                          status: a.status,
                          durationMinutes: a.durationMinutes,
                          rescheduleReason: a.rescheduleReason,
                          originalSlotStartUtc: a.originalSlotStartUtc?.toISOString() ?? null,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Customer info */}
          <section className="bg-white rounded-xl border border-feather/20">
            <div className="px-5 py-3 border-b border-feather/15">
              <h2 className="font-heading text-slate text-[16px] font-semibold">
                Customer
              </h2>
            </div>
            <div className="px-5 py-4">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[14px] font-body">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-feather mt-0.5" aria-hidden />
                  <div>
                    <dt className="text-feather text-[11px] uppercase font-semibold tracking-wide">Name</dt>
                    <dd className="text-slate">{request.customerName}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-feather mt-0.5" aria-hidden />
                  <div>
                    <dt className="text-feather text-[11px] uppercase font-semibold tracking-wide">Email</dt>
                    <dd className="text-slate">{request.customerEmail}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-feather mt-0.5" aria-hidden />
                  <div>
                    <dt className="text-feather text-[11px] uppercase font-semibold tracking-wide">Phone</dt>
                    <dd className="text-slate">{request.customerPhone ?? "—"}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-feather mt-0.5" aria-hidden />
                  <div>
                    <dt className="text-feather text-[11px] uppercase font-semibold tracking-wide">State</dt>
                    <dd className="text-slate">{request.shippingState}</dd>
                  </div>
                </div>
              </dl>
              {request.experience && (
                <p className="mt-3 text-[13px] font-body text-slate">
                  <strong>Experience:</strong> {request.experience}
                </p>
              )}
              {request.habitat && (
                <p className="mt-1 text-[13px] font-body text-slate">
                  <strong>Habitat:</strong> {request.habitat}
                </p>
              )}
              {request.preferences && (
                <p className="mt-1 text-[13px] font-body text-slate">
                  <strong>Preferences:</strong> {request.preferences}
                </p>
              )}
            </div>
          </section>

          {/* Customer ↔ Agent secure messaging (F-28) */}
          {!["COMPLETED", "CANCELED", "REJECTED"].includes(request.status) && (
            <section className="bg-white rounded-xl border border-feather/20">
              <div className="px-5 py-3 border-b border-feather/15">
                <h2 className="font-heading text-slate text-[16px] font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-tail-red" aria-hidden /> Customer messages
                </h2>
              </div>
              <div className="p-4">
                <ChatThread
                  requestId={request.id}
                  currentUserId={user.id}
                  currentUserRole={user.role}
                  variant="admin"
                  canReply={true}
                />
              </div>
            </section>
          )}

          {/* Internal comments */}
          <section className="bg-white rounded-xl border border-feather/20">
            <div className="px-5 py-3 border-b border-feather/15">
              <h2 className="font-heading text-slate text-[16px] font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-feather" aria-hidden /> Internal comments
              </h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              {request.comments.length === 0 ? (
                <p className="text-feather text-[13px] font-body italic">No comments yet.</p>
              ) : (
                <ul className="space-y-3">
                  {request.comments.map((c) => (
                    <li key={c.id} className="border-l-2 border-feather/30 pl-3">
                      <p className="text-slate text-[14px] font-body">{c.body}</p>
                      <p className="text-feather text-[11px] font-body mt-1">
                        {c.user?.name ?? "Unknown"} · {formatDateUTC(c.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <InternalCommentForm requestId={request.id} />
            </div>
          </section>

          {/* Audit timeline */}
          <section className="bg-white rounded-xl border border-feather/20">
            <div className="px-5 py-3 border-b border-feather/15">
              <h2 className="font-heading text-slate text-[16px] font-semibold flex items-center gap-2">
                <History className="h-4 w-4 text-feather" aria-hidden /> Audit trail (immutable)
              </h2>
            </div>
            <div className="px-5 py-4">
              <ol className="space-y-3">
                {auditLogs.length === 0 ? (
                  <p className="text-feather text-[13px] font-body italic">No history yet.</p>
                ) : (
                  auditLogs.map((log) => (
                    <li key={log.id} className="flex gap-3 text-[13px] font-body">
                      <span className="flex-shrink-0 inline-flex h-2 w-2 mt-1.5 rounded-full bg-tail-red" aria-hidden />
                      <div className="flex-1">
                        <p className="text-slate font-semibold">
                          {log.action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                          <span className="text-feather font-normal"> · {log.actorRole}</span>
                        </p>
                        <p className="text-feather">{formatDateUTC(log.timestamp)}</p>
                        {log.changes && (
                          <p className="text-feather text-[12px] italic mt-0.5">{log.changes}</p>
                        )}
                        {log.metadata && (
                          <p className="text-feather text-[12px] italic mt-0.5">{log.metadata}</p>
                        )}
                      </div>
                    </li>
                  ))
                )}
              </ol>
            </div>
          </section>
        </div>

        {/* Right — action panel */}
        <aside className="space-y-4">
          {/* Status card */}
          <div className="bg-white rounded-xl border border-feather/20 p-5">
            <p className="text-feather text-[11px] uppercase font-semibold tracking-wide mb-1">Current status</p>
            <p className={`status-badge ${meta.className} text-[14px] mb-2`}>{meta.label}</p>
            <p className="text-[12px] font-body text-feather leading-relaxed">
              {meta.description}
            </p>
            {request.agent && (
              <p className="mt-2 text-[12px] font-body text-slate">
                <strong>Agent:</strong> {request.agent.name}
              </p>
            )}
            {request.selectedPaymentMethod && (
              <p className="mt-1 text-[12px] font-body text-slate">
                <strong>Payment:</strong> {request.selectedPaymentMethod.name}
              </p>
            )}
            {request.paymentReference && (
              <p className="mt-1 text-[12px] font-body text-slate">
                <strong>Customer ref:</strong>{" "}
                <code className="bg-ivory px-1 rounded text-[11px]">{request.paymentReference}</code>
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl border border-feather/20 p-5 space-y-4">
            <h3 className="font-heading text-slate text-[14px] font-semibold">Actions</h3>

            {/* Assign / transfer */}
            {canAssign && request.status === "RECEIVED" && (
              <AssignAgentForm requestId={request.id} agents={agents} currentAgentId={request.agentId} />
            )}
            {canAssign && ["PENDING_REVIEW", "AWAITING_INSTRUCTIONS"].includes(request.status) && (
              <AssignAgentForm requestId={request.id} agents={agents} currentAgentId={request.agentId} allowTransfer={!!request.agentId} />
            )}

            {/* Create payment instructions */}
            {canPrepareInstructions && ["RECEIVED", "PENDING_REVIEW", "AWAITING_INSTRUCTIONS", "INSTRUCTIONS_SENT"].includes(request.status) && (
              <CreateInstructionsForm
                requestId={request.id}
                paymentMethod={request.selectedPaymentMethod}
                paymentMethods={paymentMethods}
                totalUsd={Number(request.finalTotalUsd ?? request.totalQuoteUsd ?? 0)}
                reference={request.reference}
              />
            )}

            {/* Active instruction preview (read-only) */}
            {activeInstruction && (
              <div className="bg-iris/5 border border-iris/30 rounded-lg p-3">
                <p className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Lock className="h-3 w-3 text-iris" aria-hidden /> Active instruction
                </p>
                <pre className="text-[12px] font-body text-slate whitespace-pre-wrap max-h-32 overflow-y-auto custom-scroll">
                  {activeInstruction.body}
                </pre>
                <p className="text-[11px] text-feather font-body mt-1">
                  Expires: {formatDateUTC(activeInstruction.expiryAt)}
                </p>
              </div>
            )}

            {/* Verify payment */}
            {canVerify && request.status === "PAYMENT_TO_VERIFY" && (
              <VerifyPaymentForm
                requestId={request.id}
                amount={Number(request.totalQuoteUsd ?? 0)}
                reference={request.reference}
                customerReference={request.paymentReference}
              />
            )}

            {/* Advance button — paid → fulfillment → completed */}
            {(request.status === "PAID_VERIFIED" || request.status === "READY_FOR_FULFILLMENT") && (
              <AdvanceButton requestId={request.id} currentStatus={request.status} />
            )}

            {/* Cancel / reject */}
            {canCancel && !["COMPLETED", "CANCELED", "REJECTED"].includes(request.status) && (
              <CancelRequestForm requestId={request.id} />
            )}

            {/* If completed */}
            {request.status === "COMPLETED" && (
              <div className="bg-forest/5 border border-forest/30 rounded-lg p-3 text-center">
                <ShieldCheck className="h-5 w-5 text-forest mx-auto mb-1" aria-hidden />
                <p className="text-[13px] font-body text-slate">
                  <strong>Request completed.</strong>
                </p>
                <p className="text-[12px] text-feather font-body">
                  {formatDateUTC(request.completedAt ?? request.updatedAt)}
                </p>
              </div>
            )}

            {/* Cancellation reason */}
            {(request.status === "CANCELED" || request.status === "REJECTED") && request.cancelReason && (
              <div className="bg-feather/10 border border-feather/30 rounded-lg p-3">
                <p className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide mb-1">
                  Reason
                </p>
                <p className="text-[13px] font-body text-slate">{request.cancelReason}</p>
              </div>
            )}
          </div>

          {/* Verification log */}
          {request.paymentChecks.length > 0 && (
            <div className="bg-white rounded-xl border border-feather/20 p-5">
              <h3 className="font-heading text-slate text-[14px] font-semibold mb-3 flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-forest" aria-hidden /> Payment verification
              </h3>
              {request.paymentChecks.map((c) => (
                <div key={c.id} className="text-[13px] font-body text-slate space-y-1">
                  <p><strong>Amount:</strong> {formatUsd(Number(c.amount))}</p>
                  {c.reference && <p><strong>Reference:</strong> <code className="bg-ivory px-1 rounded text-[12px]">{c.reference}</code></p>}
                  <p><strong>Verified by:</strong> {c.verifier?.name ?? "—"}</p>
                  <p><strong>At:</strong> {formatDateUTC(c.verifiedAt)}</p>
                  {c.notes && <p><strong>Notes:</strong> {c.notes}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Email log */}
          {request.messages.length > 0 && (
            <div className="bg-white rounded-xl border border-feather/20 p-5">
              <h3 className="font-heading text-slate text-[14px] font-semibold mb-3 flex items-center gap-1">
                <FileText className="h-4 w-4 text-feather" aria-hidden /> Email log
              </h3>
              <ul className="space-y-2 text-[12px] font-body">
                {request.messages.map((m) => (
                  <li key={m.id} className="border-b border-feather/10 pb-2 last:border-0">
                    <p className="text-slate font-semibold">{m.subject}</p>
                    <p className="text-feather">
                      {m.deliveryStatus === "SENT" ? "✓" : "✗"} {m.deliveryStatus} · {m.channel} · {formatDateUTC(m.sentAt)}
                    </p>
                    <details className="mt-2"><summary className="cursor-pointer text-forest">View message</summary><p className="whitespace-pre-wrap break-words mt-2">{m.body}</p>{m.errorMessage && <p className="text-tail-red mt-2">{m.errorMessage}</p>}</details>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
