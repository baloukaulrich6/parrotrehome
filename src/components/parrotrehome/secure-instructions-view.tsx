"use client";

import { PaymentCountdown, usePaymentCountdown } from "./payment-countdown";
import { useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  Lock,
  Clock,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { formatDateUTC } from "@/lib/constants";

export function SecureInstructionsView({
  instructionId,
  secureLinkHash,
  body,
  expiryAt,
  status,
}: {
  instructionId: string;
  secureLinkHash: string;
  body: string;
  expiryAt: Date;
  status: string;
}) {
  const [copied, setCopied] = useState(false);
  const remaining = usePaymentCountdown(expiryAt);
  const isExpired = remaining === 0 || new Date(expiryAt).getTime() <= Date.now() || status === "EXPIRED";
  const isRevoked = status === "REVOKED";

  async function copyLink() {
    const link = `${window.location.origin}/my-requests/instructions?token=${secureLinkHash}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Secure link copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link.");
    }
  }

  return (
    <div className={`bg-white rounded-xl border p-5 ${isExpired ? "border-feather/30" : "border-iris/40 shadow-sm"}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide flex items-center gap-1">
          <Lock className="h-3.5 w-3.5 text-iris" aria-hidden /> Secure payment instructions
        </p>
        <span className={`text-[11px] font-body font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
          isExpired ? "bg-feather/20 text-feather" : isRevoked ? "bg-tail-red/10 text-tail-red" : "bg-iris/20 text-slate"
        }`}>
          {isExpired ? "Expired" : isRevoked ? "Revoked" : "Active"}
        </span>
      </div>

      <PaymentCountdown expiryAt={expiryAt} />
      {!isExpired && !isRevoked && <div className="bg-ivory border border-feather/20 rounded-lg p-4 my-3">
        <pre className="whitespace-pre-wrap font-body text-[13px] text-slate leading-relaxed">
          {body}
        </pre>
      </div>}

      <p className="text-[12px] font-body text-feather flex items-center gap-1 mb-3">
        <Clock className="h-3 w-3" aria-hidden />
        {isExpired ? "Link expired on" : "Link valid until"}: {formatDateUTC(new Date(expiryAt))}
      </p>

      {!isExpired && !isRevoked && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={copyLink}
            className="w-full inline-flex items-center justify-center gap-2 h-10 px-3 rounded-full bg-slate hover:bg-slate-dark text-ivory text-[13px] font-body font-semibold transition-colors focus-ring"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy secure link"}
          </button>
          <a
            href={`/my-requests/instructions?token=${secureLinkHash}`}
            className="w-full inline-flex items-center justify-center gap-2 h-10 px-3 rounded-full border border-slate/30 hover:bg-slate/5 text-slate text-[13px] font-body font-semibold transition-colors focus-ring"
          >
            <ExternalLink className="h-4 w-4" /> Open in full page
          </a>
        </div>
      )}

      <div className="mt-3 p-3 bg-forest/5 border border-forest/20 rounded-lg">
        <div className="flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-forest flex-shrink-0 mt-0.5" aria-hidden />
          <p className="text-[12px] font-body text-slate leading-relaxed">
            <strong>Traceable &amp; signed.</strong> This link is personal,
            non-guessable, and recorded in your request history. A status of <em>Paid - verified</em> requires the
            agent&apos;s manual confirmation through the official provider —
            never just a click.
          </p>
        </div>
      </div>
    </div>
  );
}
