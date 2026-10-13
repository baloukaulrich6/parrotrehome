"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Tag, Check, X, Loader2 } from "lucide-react";
import { formatUsd } from "@/lib/constants";
import { trackConversion } from "@/components/google-analytics";

interface ValidationResult {
  valid: boolean;
  couponId?: string;
  code?: string;
  type?: "PERCENTAGE" | "FLAT_USD" | "FREE_SHIPPING";
  value?: number;
  description?: string;
  discountUsd?: number;
  freeShipping?: boolean;
  finalTotalUsd?: number;
  error?: string;
}

export function CouponInput({
  subtotal,
  onApply,
}: {
  subtotal: number;
  onApply: (result: ValidationResult | null) => void;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);

  async function validate() {
    if (!code.trim()) {
      toast.error("Enter a coupon code.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), subtotalUsd: subtotal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ valid: false, error: data.error });
        onApply(null);
        toast.error(data.error || "Invalid coupon");
        return;
      }
      setResult(data);
      onApply(data);
      trackConversion("coupon_applied", { value: data.discountUsd, currency: "USD", transaction_id: data.code });
      toast.success(`Coupon ${data.code} applied — you save ${formatUsd(data.discountUsd || 0)}${data.freeShipping ? " + free shipping" : ""}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setCode("");
    setResult(null);
    onApply(null);
  }

  return (
    <div className="bg-ivory border border-feather/30 rounded-lg p-4">
      <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide flex items-center gap-1">
        <Tag className="h-3.5 w-3.5 text-iris" aria-hidden /> Coupon code
      </label>
      {result?.valid ? (
        <div className="mt-2 flex items-center justify-between gap-2 p-2 rounded-md bg-forest/5 border border-forest/30">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-forest" aria-hidden />
            <div>
              <p className="font-mono font-bold text-slate text-[13px]">{result.code}</p>
              <p className="text-[11px] text-feather font-body">
                {result.description ?? "Coupon applied"} — you save {formatUsd(result.discountUsd ?? 0)}{result.freeShipping ? " + free shipping" : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={clear}
            className="text-feather hover:text-tail-red text-[12px] font-body font-semibold inline-flex items-center gap-1"
          >
            <X className="h-3 w-3" /> Remove
          </button>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g., WELCOME10"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); validate(); } }}
            className="flex-1 h-10 px-3 rounded-md border border-feather/30 bg-white text-[14px] font-mono uppercase focus-ring"
          />
          <button
            type="button"
            onClick={validate}
            disabled={loading || !code.trim()}
            className="inline-flex items-center gap-1 h-10 px-4 rounded-md bg-slate hover:bg-slate-dark text-ivory text-[13px] font-body font-semibold disabled:bg-feather/40"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Tag className="h-3.5 w-3.5" />}
            Apply
          </button>
        </div>
      )}
      {result && !result.valid && (
        <p className="text-[12px] text-tail-red font-body mt-1">{result.error}</p>
      )}
      <p className="text-[11px] text-feather font-body mt-2">
        Try <code className="bg-ivory px-1 rounded">WELCOME10</code> for 10% off your first request.
      </p>
    </div>
  );
}
