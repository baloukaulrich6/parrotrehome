"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export function CustomerCancelRequestButton({
  requestId,
  currentStatus,
}: {
  requestId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Per policy: customer can cancel only BEFORE payment verification
  const cancellable = [
    "RECEIVED",
    "PENDING_REVIEW",
    "AWAITING_INSTRUCTIONS",
    "INSTRUCTIONS_SENT",
    "PAYMENT_TO_VERIFY",
  ].includes(currentStatus);

  if (!cancellable) {
    return (
      <div className="bg-feather/10 border border-feather/30 rounded-xl p-4 text-[13px] font-body text-slate">
        <p className="font-semibold mb-1">Cancellation not available</p>
        <p className="text-feather text-[12px]">
          Your request is past the customer-cancellation threshold.
          Please contact our team to discuss your options.
        </p>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 5) {
      toast.error("Please provide a brief reason (min 5 characters).");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/cancel-customer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Your request has been canceled. Stock/slot released.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-full border border-tail-red/40 hover:bg-tail-red/5 text-tail-red text-[14px] font-body font-semibold transition-colors focus-ring">
          <XCircle className="h-4 w-4" /> Cancel this request
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading text-slate">Cancel this request?</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <p className="text-[14px] font-body text-slate">
            You can cancel your request <strong>before payment is verified</strong>.
            After verification, please contact our team to discuss changes.
          </p>
          <p className="text-[13px] font-body text-feather">
            Canceling will:
          </p>
          <ul className="text-[13px] font-body text-feather space-y-1 list-disc pl-5">
            <li>Release any reserved bird back to the catalog</li>
            <li>Cancel any pending appointment slots</li>
            <li>Write a cancellation motif to the immutable audit log</li>
            <li>Cannot be undone</li>
          </ul>
          <div>
            <label htmlFor="cancel-reason" className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">
              Reason for cancellation *
            </label>
            <textarea
              id="cancel-reason"
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Found another bird, changed my mind, scheduling conflict..."
              className="mt-1 w-full px-3 py-2 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-feather/15">
            <button type="button" onClick={() => setOpen(false)} className="h-10 px-4 rounded-md border border-feather/30 hover:bg-feather/10 text-slate text-[13px] font-body font-semibold">Keep request</button>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 px-4 rounded-md bg-tail-red hover:bg-tail-red-dark text-white text-[13px] font-body font-semibold inline-flex items-center gap-2 disabled:bg-feather/40"
            >
              {submitting ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              {submitting ? "Canceling..." : "Yes, cancel request"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
