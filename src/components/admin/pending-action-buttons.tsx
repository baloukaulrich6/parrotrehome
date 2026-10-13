"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Clock } from "lucide-react";

export function PendingActionButtons({ actionId, disabled }: { actionId: string; disabled: boolean }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  async function approve() {
    setSubmitting("approve");
    try {
      const res = await fetch(`/api/admin/pending-actions/${actionId}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(data.message || "Action approved and executed.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(null);
    }
  }

  async function reject() {
    if (!reason.trim()) {
      toast.error("Please provide a reason for rejection.");
      return;
    }
    setSubmitting("reject");
    try {
      const res = await fetch(`/api/admin/pending-actions/${actionId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Action rejected.");
      setShowReject(false);
      setReason("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(null);
    }
  }

  if (disabled) {
    return (
      <p className="text-feather text-[12px] font-body italic">
        You proposed this action — a different authorized agent must approve or reject it.
      </p>
    );
  }

  if (showReject) {
    return (
      <div className="space-y-2">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="Reason for rejection"
          className="w-full px-3 py-2 rounded-md border border-feather/30 bg-ivory text-[13px] focus-ring"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowReject(false)}
            className="flex-1 h-8 rounded-md border border-feather/30 hover:bg-feather/10 text-feather text-[12px] font-body font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={reject}
            disabled={submitting !== null}
            className="flex-1 h-8 rounded-md bg-tail-red hover:bg-tail-red-dark text-white text-[12px] font-body font-semibold inline-flex items-center justify-center gap-1 disabled:bg-feather/40"
          >
            {submitting === "reject" ? <Clock className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
            Confirm rejection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={approve}
        disabled={submitting !== null}
        className="flex-1 h-9 rounded-md bg-forest hover:bg-forest-dark text-white text-[13px] font-body font-semibold inline-flex items-center justify-center gap-1.5 disabled:bg-feather/40"
      >
        {submitting === "approve" ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        Approve &amp; execute
      </button>
      <button
        type="button"
        onClick={() => setShowReject(true)}
        disabled={submitting !== null}
        className="flex-1 h-9 rounded-md border border-tail-red/30 hover:bg-tail-red/5 text-tail-red text-[13px] font-body font-semibold inline-flex items-center justify-center gap-1.5"
      >
        <X className="h-3.5 w-3.5" /> Reject
      </button>
    </div>
  );
}
