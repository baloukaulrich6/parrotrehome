"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { CreditCard, ShieldCheck, Send, Clock } from "lucide-react";

interface PaymentMethod {
  id: string;
  name: string;
  officialProvider: string;
}

export function PaymentMethodChooser({ requestId }: { requestId: string }) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/payment-methods?context=active")
      .then((r) => r.json())
      .then((d) => {
        setMethods(d.methods ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function submit() {
    if (!selectedId) {
      toast.error("Please select a payment method.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/select-method`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: selectedId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Payment method selected — agent notified.");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-feather/20 p-5 text-feather text-[13px]">
        Loading payment options...
      </div>
    );
  }

  if (methods.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-feather/20 p-5">
        <p className="text-[13px] font-body text-slate">
          No payment methods currently available. Our team will reach out
          directly.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-feather/20 p-5">
      <p className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide mb-2 flex items-center gap-1">
        <CreditCard className="h-3.5 w-3.5" aria-hidden /> Choose payment method
      </p>
      <p className="text-[13px] font-body text-slate mb-4 leading-relaxed">
        Select how you&apos;d like to pay. An agent will send secure, official
        payment instructions through your selected channel. The button below
        does <strong>not</strong> process payment — it only sends your
        preference to the agent (T-03).
      </p>
      <ul className="space-y-2">
        {methods.map((m) => (
          <li key={m.id}>
            <label className="flex items-start gap-3 p-3 rounded-lg border border-feather/20 hover:border-tail-red cursor-pointer focus-ring transition-colors">
              <input
                type="radio"
                name="payment-method"
                value={m.id}
                checked={selectedId === m.id}
                onChange={() => setSelectedId(m.id)}
                className="mt-1 h-4 w-4 text-tail-red focus-ring"
              />
              <span className="flex-1">
                <span className="block font-body font-semibold text-slate text-[14px]">
                  {m.name}
                </span>
                <span className="block text-[12px] text-feather font-body italic">
                  via {m.officialProvider}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={submit}
        disabled={!selectedId || submitting}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-full bg-tail-red hover:bg-tail-red-dark text-white text-[14px] font-body font-semibold transition-colors focus-ring disabled:bg-feather/40"
      >
        {submitting ? (
          <>
            <Clock className="h-4 w-4 animate-spin" /> Sending preference...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" /> Notify agent
          </>
        )}
      </button>
      <div className="mt-3 p-3 bg-forest/5 border border-forest/20 rounded-lg">
        <div className="flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-forest flex-shrink-0 mt-0.5" aria-hidden />
          <p className="text-[12px] font-body text-slate leading-relaxed">
            <strong>Security:</strong> We never ask you to send card numbers
            or passwords by email. The agent will provide a secure, traceable
            link with limited validity.
          </p>
        </div>
      </div>
    </div>
  );
}
