"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserCog, Send, ShieldCheck, XCircle, MessageSquarePlus, Lock, Clock, ArrowRight, Package } from "lucide-react";

interface Agent { id: string; name: string; }

export function AssignAgentForm({
  requestId,
  agents,
  currentAgentId,
  allowTransfer = false,
}: {
  requestId: string;
  agents: Agent[];
  currentAgentId?: string | null;
  allowTransfer?: boolean;
}) {
  const router = useRouter();
  const [agentId, setAgentId] = useState(currentAgentId ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!agentId) {
      toast.error("Please select an agent.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/requests/${requestId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(allowTransfer ? "Request transferred." : "Request assigned.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-feather/5 border border-feather/20 rounded-lg p-3">
      <p className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide mb-2 flex items-center gap-1">
        <UserCog className="h-3.5 w-3.5" aria-hidden /> {allowTransfer ? "Transfer dossier" : "Assign agent"}
      </p>
      <select
        value={agentId}
        onChange={(e) => setAgentId(e.target.value)}
        className="w-full h-9 px-2 rounded-md border border-feather/30 bg-white text-[13px] font-body focus-ring"
      >
        <option value="">Select agent…</option>
        {agents.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={submit}
        disabled={submitting || !agentId}
        className="mt-2 w-full h-9 rounded-md bg-slate hover:bg-slate-dark text-ivory text-[13px] font-body font-semibold inline-flex items-center justify-center gap-2 disabled:bg-feather/40"
      >
        {submitting ? <Clock className="h-3.5 w-3.5 animate-spin" /> : null}
        {allowTransfer ? "Transfer" : "Assign"}
      </button>
    </div>
  );
}

export function CreateInstructionsForm({
  requestId,
  paymentMethod,
  paymentMethods,
  totalUsd,
  reference,
  supportEmail = "support@parrotrehome.com",
}: {
  requestId: string;
  supportEmail?: string;
  paymentMethod: { id: string; name: string; instructionsTemplate: string; officialProvider: string } | null;
  paymentMethods: { id: string; name: string; instructionsTemplate: string; officialProvider: string }[];
  totalUsd: number;
  reference: string;
}) {
  const router = useRouter();
  const initial = paymentMethods.find(method => method.id === paymentMethod?.id) || paymentMethods[0];
  const [methodId, setMethodId] = useState(initial?.id || "");
  const format = (text: string) => text.replaceAll("{{requestReference}}", reference).replaceAll("{{totalQuoteUsd}}", totalUsd.toFixed(2));
  const [body, setBody] = useState(format(initial?.instructionsTemplate || ""));
  const [validityMinutes, setValidityMinutes] = useState(20);

  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!body.trim()) {
      toast.error("Instructions body cannot be empty.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/requests/${requestId}/instructions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim(), paymentMethodId: methodId, validityMinutes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(data.emailStatus === "QUEUED" ? "Instructions created. Demo email saved; no email was sent." : data.emailStatus === "FAILED" ? "Instructions created, but the email failed. Check delivery history." : "Secure instructions sent to customer.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-iris/5 border border-iris/30 rounded-lg p-3">
      <p className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide mb-2 flex items-center gap-1">
        <Lock className="h-3.5 w-3.5 text-iris" aria-hidden /> Email payment instructions
      </p>
      <p className="text-[12px] text-feather font-body mb-2">
        Review the payment details below. They will be sent directly in the customer’s email. No payment link is required.
      </p>
      <label className="block text-sm mb-3">Payment method<select aria-label="Payment method" value={methodId} onChange={event => { setMethodId(event.target.value); setBody(format(paymentMethods.find(method => method.id === event.target.value)?.instructionsTemplate || "")); }} className="block w-full rounded-md border p-2 mt-1"><option value="">Choose an active method</option>{paymentMethods.map(method => <option key={method.id} value={method.id}>{method.name}</option>)}</select></label>
      {!paymentMethods.length && <p className="text-tail-red text-sm">Activate a method in Payment methods before sending.</p>}
      <label htmlFor="payment-instructions" className="block text-sm">Payment information for this customer</label>
      <textarea
        id="payment-instructions"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={8}
        className="w-full px-2 py-2 rounded-md border border-feather/30 bg-white text-[12px] font-body focus-ring"
      />
      <label className="block text-sm mt-3">Validity (minutes)<input type="number" min={1} max={1440} step={1} value={validityMinutes} onChange={event => setValidityMinutes(Number(event.target.value))} className="block border rounded-md p-2 mt-1 w-full" /></label>
      <label className="block text-sm mt-3">Support email<input type="email" value={supportEmail} readOnly className="block border rounded-md p-2 mt-1 w-full" /></label>
      <p className="mt-2 text-xs text-feather">Check the method, recipient, amount and validity before sending. Emailed bank or payment details cannot be removed from the recipient’s inbox after expiry.</p>
      <button
        type="button"
        onClick={submit}
        disabled={submitting || !methodId || body.trim().length < 20 || !Number.isInteger(validityMinutes) || validityMinutes < 1 || validityMinutes > 1440}
        className="mt-2 w-full h-9 rounded-md bg-iris hover:bg-iris-dark text-slate text-[13px] font-body font-semibold inline-flex items-center justify-center gap-2 disabled:bg-feather/40"
      >
        {submitting ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        Email instructions to customer
      </button>
      <p className="text-[11px] text-feather font-body mt-2">
        The customer receives the payment details, expiry time and support address in the email itself.
      </p>
    </div>
  );
}

export function VerifyPaymentForm({
  requestId,
  amount,
  reference,
  customerReference,
}: {
  requestId: string;
  amount: number;
  reference: string;
  customerReference?: string | null;
}) {
  const router = useRouter();
  const [confirmationReference, setConfirmationReference] = useState(customerReference || "");
  const [previewing, setPreviewing] = useState(false);
  async function previewReceipt() {
    setPreviewing(true);
    try {
      const response = await fetch(`/api/admin/requests/${requestId}/receipt`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "preview", amount: Number(verifiedAmount), reference: confirmationReference.trim() }) });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || "Preview unavailable");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = `draft-receipt-${reference}.pdf`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Preview failed"); } finally { setPreviewing(false); }
  }
  const [verifiedAmount, setVerifiedAmount] = useState(amount.toFixed(2));
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/requests/${requestId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(verifiedAmount),
          reference: confirmationReference.trim(),
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(data.status === "PENDING_APPROVAL" ? "Payment submitted for second approval; not yet confirmed." : data.emailStatus === "SENT" ? "Payment verified — receipt accepted by the email provider." : data.emailStatus === "QUEUED" ? "Payment verified — receipt saved in preview; no email was sent." : "Payment verified — receipt email needs retry. See the receipt panel.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-forest/5 border border-forest/30 rounded-lg p-3">
      <p className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide mb-2 flex items-center gap-1">
        <ShieldCheck className="h-3.5 w-3.5 text-forest" aria-hidden /> Verify payment (A-08, T-06)
      </p>
      {customerReference && (
        <p className="text-[12px] text-feather font-body mb-2">
          Customer reference: <code className="bg-ivory px-1 rounded text-[11px]">{customerReference}</code>
        </p>
      )}
      <label className="block text-sm mb-3">Payment confirmation reference (email or client submission)<input value={confirmationReference} maxLength={200} onChange={event => setConfirmationReference(event.target.value)} className="block border rounded-md p-2 w-full mt-1" /></label>
      <label className="text-[11px] font-body font-semibold text-feather">Verified amount (USD)</label>
      <input
        type="number"
        step="0.01"
        value={verifiedAmount}
        onChange={(e) => setVerifiedAmount(e.target.value)}
        className="w-full h-9 px-2 rounded-md border border-feather/30 bg-white text-[13px] font-body focus-ring"
      />
      <label className="text-[11px] font-body font-semibold text-feather mt-2 block">Verification notes (optional, masked justificatif ref)</label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="e.g., Wire confirmation 2026-001234 — verified via bank portal"
        className="w-full px-2 py-2 rounded-md border border-feather/30 bg-white text-[12px] font-body focus-ring"
      />
      <button
        type="button"
        onClick={submit}
        disabled={submitting || !confirmationReference.trim()}
        className="mt-2 w-full h-9 rounded-md bg-forest hover:bg-forest-dark text-white text-[13px] font-body font-semibold inline-flex items-center justify-center gap-2 disabled:bg-feather/40"
      >
        {submitting ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
        Confirm payment and email PDF receipt
      </button>
      <button type="button" disabled={previewing || submitting || !confirmationReference.trim()} onClick={previewReceipt} className="mt-2 w-full rounded border p-2 text-sm">{previewing ? "Preparing preview…" : "Preview draft PDF receipt"}</button>
      <p className="text-xs text-feather mt-2">The final PDF is generated only after payment verification. Payments of $1,000 or more need second approval before the receipt email is sent.</p>
      <p className="text-[11px] text-tail-red font-body mt-2">
        ⚠️ T-06: This requires manual verification through the official provider. Never mark paid based solely on a customer&apos;s claim.
      </p>
    </div>
  );
}

export function CancelRequestForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!reason.trim()) {
      toast.error("Please enter a cancellation reason.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/requests/${requestId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Request canceled. Stock/slot released.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full h-9 rounded-md border border-tail-red/30 hover:bg-tail-red/5 text-tail-red text-[13px] font-body font-semibold inline-flex items-center justify-center gap-2"
      >
        <XCircle className="h-3.5 w-3.5" /> Cancel / reject request
      </button>
    );
  }
  return (
    <div className="bg-tail-red/5 border border-tail-red/30 rounded-lg p-3">
      <p className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide mb-2">
        Cancellation reason (A-10)
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        placeholder="Reason for cancellation / rejection..."
        className="w-full px-2 py-2 rounded-md border border-feather/30 bg-white text-[12px] font-body focus-ring"
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="flex-1 h-9 rounded-md bg-tail-red hover:bg-tail-red-dark text-white text-[13px] font-body font-semibold inline-flex items-center justify-center gap-2 disabled:bg-feather/40"
        >
          {submitting ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
          Confirm cancellation
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-9 px-3 rounded-md border border-feather/30 hover:bg-feather/10 text-feather text-[13px] font-body font-semibold"
        >
          Back
        </button>
      </div>
    </div>
  );
}

export function InternalCommentForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/requests/${requestId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setBody("");
      toast.success("Comment added.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 pt-3 border-t border-feather/15">
      <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide mb-1 block">
        Add internal comment
      </label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        placeholder="Internal note for the team (not visible to customer)..."
        className="w-full px-3 py-2 rounded-md border border-feather/30 bg-ivory text-[13px] font-body focus-ring"
      />
      <button
        type="submit"
        disabled={submitting || !body.trim()}
        className="mt-2 inline-flex items-center gap-2 h-9 px-4 rounded-full bg-slate hover:bg-slate-dark text-ivory text-[13px] font-body font-semibold disabled:bg-feather/40"
      >
        {submitting ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <MessageSquarePlus className="h-3.5 w-3.5" />}
        Add comment
      </button>
    </form>
  );
}

// ── Advance button (PAID_VERIFIED → READY_FOR_FULFILLMENT → COMPLETED) ──
export function AdvanceButton({ requestId, currentStatus }: { requestId: string; currentStatus: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const nextLabel =
    currentStatus === "PAID_VERIFIED" ? "Mark ready for fulfillment" :
    currentStatus === "READY_FOR_FULFILLMENT" ? "Mark as completed" : null;

  if (!nextLabel) return null;

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/requests/${requestId}/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(data.status === "COMPLETED" ? "Request completed." : "Status advanced.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={submit}
      disabled={submitting}
      className="w-full h-9 rounded-md bg-forest hover:bg-forest-dark text-white text-[13px] font-body font-semibold inline-flex items-center justify-center gap-2 disabled:bg-feather/40"
    >
      {submitting ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5" />}
      {nextLabel}
    </button>
  );
}
