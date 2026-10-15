"use client";

import { usePaymentCountdown } from "./payment-countdown";
import { useState } from "react";
import { toast } from "sonner";
import { Upload, ShieldCheck, Send, Clock, Check } from "lucide-react";

export function PaymentReferenceDeposit({
  requestId,
  existingReference,
  expiryAt,
}: {
  requestId: string;
  expiryAt: Date | string;
  existingReference?: string | null;
}) {
  const remaining = usePaymentCountdown(expiryAt);
  const [reference, setReference] = useState(existingReference ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reference.trim()) {
      toast.error("Please enter a payment reference (e.g., wire confirmation ID).");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/deposit-reference`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: reference.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setSubmitted(true);
      toast.success("Payment reference deposited. Our agent will verify it.");
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-feather/20 p-5">
      <p className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide mb-2 flex items-center gap-1">
        <Upload className="h-3.5 w-3.5" aria-hidden /> Deposit payment reference (optional)
      </p>
      <p className="text-[13px] font-body text-slate mb-3 leading-relaxed">
        Once you&apos;ve sent your payment via the secure instructions, deposit
        your payment reference (e.g., wire confirmation ID, Zelle confirmation,
        CashApp tag). This will move your request to{" "}
        <em>Payment to verify</em> state.
      </p>
      <label htmlFor="ref" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">
        Payment reference / confirmation ID
      </label>
      <input
        id="ref"
        type="text"
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        placeholder="e.g., WIRE-2026-001234"
        className="mt-1 w-full h-11 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring"
      />
      {remaining === 0 && <p className="text-sm text-tail-red mt-2">Instructions expired. Ask your agent for new payment details.</p>}
      <button
        type="submit"
        disabled={submitting || submitted || remaining === null || remaining === 0}
        className="mt-3 w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-full bg-forest hover:bg-forest-dark text-white text-[14px] font-body font-semibold transition-colors focus-ring disabled:bg-feather/40"
      >
        {submitted ? (
          <>
            <Check className="h-4 w-4" /> Deposited
          </>
        ) : submitting ? (
          <>
            <Clock className="h-4 w-4 animate-spin" /> Submitting...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" /> Deposit reference
          </>
        )}
      </button>
      <div className="mt-3 p-3 bg-tail-red/5 border border-tail-red/20 rounded-lg">
        <div className="flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-tail-red flex-shrink-0 mt-0.5" aria-hidden />
          <p className="text-[12px] font-body text-slate leading-relaxed">
            <strong>Do not enter card numbers or passwords.</strong> Only the
            reference / confirmation ID your bank or payment app provided.
            Deposit is optional — you can also wait for the agent to confirm.
          </p>
        </div>
      </div>
    </form>
  );
}
