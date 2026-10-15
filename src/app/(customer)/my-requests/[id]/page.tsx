import { LiveRequestRefresh } from "@/components/parrotrehome/live-request-refresh";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import {
  REQUEST_STATUS_META,
  formatUsd,
  formatDateUTC,
  formatDateOnly,
} from "@/lib/constants";
import { PaymentMethodChooser } from "@/components/parrotrehome/payment-method-chooser";
import { PaymentReferenceDeposit } from "@/components/parrotrehome/payment-reference-deposit";
import { SecureInstructionsView } from "@/components/parrotrehome/secure-instructions-view";
import { CustomerCancelRequestButton } from "@/components/parrotrehome/customer-cancel-button";
import { ReviewForm } from "@/components/parrotrehome/review-form";
import { ChatThread } from "@/components/parrotrehome/chat-thread";
import { AppointmentRescheduleButton } from "@/components/parrotrehome/appointment-reschedule-button";
import {
  ArrowLeft,
  Bird,
  Package,
  Stethoscope,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  History,
  ShieldCheck,
  FileText,
  Calendar,
  Video,
} from "lucide-react";

export const metadata = { title: "Request details" };

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getServerUser();
  if (!user) redirect(`/sign-in?callbackUrl=/my-requests/${id}`);

  const request = await db.request.findUnique({
    where: { id },
    include: {
      items: { include: { bird: true, product: true } },
      appointments: { include: { professional: true } },
      messages: { where: { channel: "EMAIL" }, orderBy: { sentAt: "asc" } },
      paymentInstructions: { orderBy: { createdAt: "desc" } },
      paymentChecks: { include: { verifier: { select: { name: true } } }, orderBy: { verifiedAt: "desc" } },
    },
  });

  if (!request) return notFound();
  const auditLogs = await db.auditLog.findMany({ where: { objectType: "Request", objectId: id }, orderBy: { timestamp: "asc" } });

  // T-05: server-side ownership check.
  // CLIENT can view if: customerId matches their user ID, OR if the request's
  // customerEmail matches their account email (covers guest-to-account linking).
  if (user.role === "CLIENT") {
    const isOwner = request.customerId === user.id || request.customerEmail.toLowerCase() === user.email.toLowerCase();
    if (!isOwner) {
      return notFound();
    }
    // If request is unlinked (guest), link it now to this user account (F-08)
    if (!request.customerId) {
      await db.request.update({
        where: { id: request.id },
        data: { customerId: user.id },
      });
    }
  }

  const meta = REQUEST_STATUS_META[request.status];
  const activeInstruction = request.paymentInstructions.find(
    (i) => i.status === "ACTIVE"
  );

  // Build timeline from audit logs
  const timeline = auditLogs
    .filter((l) => l.objectType === "Request" || l.objectId === request.id)
    .slice()
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return (
    <div className="bg-ivory min-h-[60vh]">
      <LiveRequestRefresh />
      <section className="bg-white border-b border-feather/20 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/my-requests"
            className="inline-flex items-center gap-1 text-feather hover:text-tail-red text-[13px] font-body font-semibold mb-3 focus-ring rounded"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to my requests
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-heading text-slate text-[26px] lg:text-[32px] font-bold">
                  {request.reference}
                </h1>
                <span className={`status-badge ${meta.className}`}>
                  {meta.label}
                </span>
              </div>
              <p className="text-feather text-[14px] font-body">
                {meta.description}
              </p>
            </div>
            {request.totalQuoteUsd != null && (
              <div className="text-right">
                <p className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">
                  Estimated total
                </p>
                <p className="font-heading text-slate text-[28px] font-bold">
                  {formatUsd(Number(request.totalQuoteUsd))}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: items + customer info */}
          <div className="lg:col-span-8 space-y-6">
            {/* Items */}
            <section className="bg-white rounded-xl border border-feather/20 p-6">
              <h2 className="font-heading text-slate text-[18px] font-semibold mb-4">
                {request.type === "PARROT_PURCHASE" ? "Parrot" : request.type === "ACCESSORY_ORDER" ? "Accessories" : "Consultation"} details
              </h2>
              <ul className="space-y-3">
                {request.items.map((item) => {
                  const name = item.bird?.commonName ?? item.product?.name ?? "Item";
                  const price = Number(item.quotedPriceUsd);
                  return (
                    <li
                      key={item.id}
                      className="flex items-start gap-3 border-b border-feather/10 pb-3 last:border-0"
                    >
                      <div className="h-12 w-12 flex-shrink-0 rounded-md bg-feather/10 flex items-center justify-center">
                        {item.birdId ? (
                          <Bird className="h-5 w-5 text-slate" aria-hidden />
                        ) : (
                          <Package className="h-5 w-5 text-slate" aria-hidden />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-body text-slate font-semibold">
                          {name}
                        </p>
                        {item.bird?.individualId && (
                          <p className="text-[12px] text-feather font-body">
                            ID: {item.bird.individualId}
                          </p>
                        )}
                        {item.product?.sku && (
                          <p className="text-[12px] text-feather font-body">
                            SKU: {item.product.sku}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] text-feather font-body">
                          {formatUsd(price)} × {item.quantity}
                        </p>
                        <p className="font-body text-slate text-[14px] font-bold">
                          {formatUsd(price * item.quantity)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Appointment details */}
              {request.appointments.length > 0 && (
                <div className="mt-4 p-4 rounded-lg bg-forest/5 border border-forest/20">
                  <h3 className="font-body font-semibold text-slate text-[14px] mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-forest" aria-hidden /> Appointment
                  </h3>
                  {request.appointments.map((a) => (
                    <div key={a.id} className="text-[13px] font-body text-slate space-y-1">
                      <p><strong>Professional:</strong> {a.professional.name}</p>
                      <p><strong>Slot (UTC):</strong> {formatDateUTC(a.slotStartUtc)}</p>
                      <p><strong>Duration:</strong> {a.durationMinutes} minutes</p>
                      <p><strong>Subject:</strong> {a.subject}</p>
                      <p><strong>Price:</strong> {formatUsd(Number(a.priceUsd))}</p>
                      <p><strong>Status:</strong> <span className="font-semibold">{a.status.replace(/_/g, " ").toLowerCase()}</span></p>
                      {/* F-19: Join video call button — only when confirmed + video link exists */}
                      {a.status === "CONFIRMED" && a.videoCallUrl && (
                        <Link
                          href={`/my-requests/${request.id}/video-call`}
                          className="mt-2 inline-flex items-center gap-2 h-10 px-4 rounded-full bg-forest hover:bg-forest-dark text-white text-[13px] font-body font-semibold"
                        >
                          <Video className="h-3.5 w-3.5" aria-hidden /> Join video call
                        </Link>
                      )}
                      {/* F-20: Reschedule button */}
                      <div className="mt-2">
                        <AppointmentRescheduleButton
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
              )}
            </section>

            {/* Customer info */}
            <section className="bg-white rounded-xl border border-feather/20 p-6">
              <h2 className="font-heading text-slate text-[18px] font-semibold mb-4">
                Customer information
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[14px] font-body">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-feather mt-0.5 flex-shrink-0" aria-hidden />
                  <div>
                    <dt className="text-feather text-[12px] uppercase font-semibold tracking-wide">Name</dt>
                    <dd className="text-slate">{request.customerName}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-feather mt-0.5 flex-shrink-0" aria-hidden />
                  <div>
                    <dt className="text-feather text-[12px] uppercase font-semibold tracking-wide">Email</dt>
                    <dd className="text-slate">{request.customerEmail}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-feather mt-0.5 flex-shrink-0" aria-hidden />
                  <div>
                    <dt className="text-feather text-[12px] uppercase font-semibold tracking-wide">Phone</dt>
                    <dd className="text-slate">{request.customerPhone ?? "—"}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-feather mt-0.5 flex-shrink-0" aria-hidden />
                  <div>
                    <dt className="text-feather text-[12px] uppercase font-semibold tracking-wide">Shipping state</dt>
                    <dd className="text-slate">{request.shippingState}{request.shippingAddress ? ` — ${request.shippingAddress}` : ""}</dd>
                  </div>
                </div>
              </dl>
            </section>

            {/* Customer ↔ Agent secure messaging (F-28) */}
            {!["COMPLETED", "CANCELED", "REJECTED"].includes(request.status) && (
              <ChatThread
                requestId={request.id}
                currentUserId={user.id}
                currentUserRole={user.role}
                variant="customer"
                canReply={true}
              />
            )}

            {/* Timeline (F-27 — status history) */}
            <section className="bg-white rounded-xl border border-feather/20 p-6">
              <h2 className="font-heading text-slate text-[18px] font-semibold mb-4 flex items-center gap-2">
                <History className="h-4 w-4 text-feather" aria-hidden /> Status timeline
              </h2>
              <ol className="space-y-3">
                {timeline.length === 0 && (
                  <li className="text-feather text-[13px] font-body italic">
                    No history yet.
                  </li>
                )}
                {timeline.map((log) => (
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
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          {/* Right: actions sidebar */}
          <aside className="lg:col-span-4 space-y-4">
            {/* Status summary card */}
            <div className="bg-white rounded-xl border border-feather/20 p-5">
              <p className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide mb-1">
                Current status
              </p>
              <p className={`status-badge ${meta.className} text-[14px] mb-2`}>
                {meta.label}
              </p>
              <p className="text-[13px] font-body text-feather leading-relaxed">
                {meta.description}
              </p>
            </div>

            {/* Payment method chooser — when status = PENDING_REVIEW (F-23) */}
            {request.status === "PENDING_REVIEW" && (
              <PaymentMethodChooser requestId={request.id} />
            )}

            {/* Secure instructions view — when status = INSTRUCTIONS_SENT or PAYMENT_TO_VERIFY */}
            {(request.status === "INSTRUCTIONS_SENT" || request.status === "PAYMENT_TO_VERIFY") && activeInstruction && (
              <SecureInstructionsView
                instructionId={activeInstruction.id}
                secureLinkHash={activeInstruction.secureLinkHash}
                body={activeInstruction.body}
                expiryAt={activeInstruction.expiryAt}
                status={activeInstruction.status}
              />
            )}

            {/* Payment reference deposit — when status = INSTRUCTIONS_SENT or PAYMENT_TO_VERIFY */}
            {(request.status === "INSTRUCTIONS_SENT" || request.status === "PAYMENT_TO_VERIFY") && activeInstruction && (
              <PaymentReferenceDeposit expiryAt={activeInstruction.expiryAt} requestId={request.id} existingReference={request.paymentReference} />
            )}

            {/* Paid verified — read-only confirmation */}
            {(request.status === "PAID_VERIFIED" || request.status === "READY_FOR_FULFILLMENT" || request.status === "COMPLETED") && request.paymentChecks.length > 0 && (
              <div className="bg-forest/5 border border-forest/30 rounded-xl p-5">
                <p className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide mb-2 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-forest" aria-hidden /> Payment verified
                </p>
                {request.paymentChecks.map((c) => (
                  <div key={c.id} className="text-[13px] font-body text-slate space-y-0.5">
                    <p><strong>Amount:</strong> {formatUsd(Number(c.amount))}</p>
                    {c.reference && <p><strong>Reference:</strong> {c.reference}</p>}
                    <p><strong>Verified by:</strong> {c.verifier?.name ?? c.verifiedBy.slice(0, 8)}</p>
                    <p><strong>At:</strong> {formatDateUTC(c.verifiedAt)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Cancellation notice */}
            {(request.status === "CANCELED" || request.status === "REJECTED") && request.cancelReason && (
              <div className="bg-feather/10 border border-feather/30 rounded-xl p-5">
                <p className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide mb-2">
                  Cancellation reason
                </p>
                <p className="text-[14px] font-body text-slate">{request.cancelReason}</p>
              </div>
            )}

            {/* Email history */}
            {request.messages.length > 0 && (
              <div className="bg-white rounded-xl border border-feather/20 p-5">
                <p className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide mb-3 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" aria-hidden /> Email history
                </p>
                <ul className="space-y-2 text-[12px] font-body">
                  {request.messages.map((m) => (
                    <li key={m.id} className="border-b border-feather/10 pb-2 last:border-0 last:pb-0">
                      <p className="text-slate font-semibold">{m.subject}</p>
                      <details className="mt-2"><summary className="cursor-pointer text-forest">Read message</summary><p className="whitespace-pre-wrap mt-2 text-slate">{m.body}</p></details>
                      <p className="text-feather">
                        {m.deliveryStatus === "SENT" ? "✓ Sent" : m.deliveryStatus === "FAILED" ? "✗ Failed" : m.deliveryStatus === "QUEUED" ? "Demo preview — not sent" : m.deliveryStatus.toLowerCase()}
                        {" · "}
                        {formatDateUTC(m.sentAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Help card */}
            <div className="bg-slate text-ivory rounded-xl p-5">
              <p className="font-heading text-[16px] font-semibold mb-1">
                Questions about this request?
              </p>
              <p className="text-ivory/80 text-[13px] font-body mb-3">
                Our team is here to help. Reach us through the contact page.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 text-iris hover:text-iris-dark text-[13px] font-body font-semibold"
              >
                Contact us
              </Link>
            </div>

            {/* F-29: Download recap PDF */}
            <a
              href={`/api/requests/${request.id}/recap`}
              className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-full border border-slate/30 hover:bg-slate/5 text-slate text-[14px] font-body font-semibold transition-colors focus-ring"
            >
              <FileText className="h-4 w-4" aria-hidden /> Download recap (PDF)
            </a>

            {/* Customer-side cancel within policy (F-27 + Cahier p.07) */}
            <CustomerCancelRequestButton requestId={request.id} currentStatus={request.status} />

            {/* F-10: Verified review — only on COMPLETED requests */}
            {request.status === "COMPLETED" && (
              <ReviewForm requestId={request.id} />
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
