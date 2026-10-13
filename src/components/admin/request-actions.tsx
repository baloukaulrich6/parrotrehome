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
  totalUsd,
  reference,
}: {
  requestId: string;
  paymentMethod: { id: string; name: string; instructionsTemplate: string; officialProvider: string };
  totalUsd: number;
  reference: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState(
    paymentMethod.instructionsTemplate
      .replace("{{requestReference}}", reference)
      .replace("{{totalQuoteUsd}}", totalUsd.toFixed(2))
  );
  const [hours, setHours] = useState(48);
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
        body: JSON.stringify({ body: body.trim(), expiresHours: hours }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Secure instructions sent to customer.");
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
        <Lock className="h-3.5 w-3.5 text-iris" aria-hidden /> Create secure instructions (A-07)
      </p>
      <p className="text-[12px] text-feather font-body mb-2">
        Method: <strong className="text-slate">{paymentMethod.name}</strong> via {paymentMethod.officialProvider}
      </p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={8}
        className="w-full px-2 py-2 rounded-md border border-feather/30 bg-white text-[12px] font-body focus-ring"
      />
      <div className="mt-2 flex items-center gap-2">
        <label className="text-[11px] font-body font-semibold text-feather">Expiry:</label>
        <select
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="h-8 px-2 rounded-md border border-feather/30 bg-white text-[12px] font-body focus-ring"
        >
          <option value={6}>6 hours</option>
          <option value={24}>24 hours</option>
          <option value={48}>48 hours</option>
          <option value={72}>72 hours</option>
        </select>
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="mt-2 w-full h-9 rounded-md bg-iris hover:bg-iris-dark text-slate text-[13px] font-body font-semibold inline-flex items-center justify-center gap-2 disabled:bg-feather/40"
      >
        {submitting ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        Send secure instructions
      </button>
      <p className="text-[11px] text-feather font-body mt-2">
        A non-guessable, signed link will be generated. The customer receives an agent-signed email.
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
          reference: customerReference ?? reference,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Payment verified — audit trail updated.");
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
        disabled={submitting}
        className="mt-2 w-full h-9 rounded-md bg-forest hover:bg-forest-dark text-white text-[13px] font-body font-semibold inline-flex items-center justify-center gap-2 disabled:bg-feather/40"
      >
        {submitting ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
        Mark as Paid - verified
      </button>
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
