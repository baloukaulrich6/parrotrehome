"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Check, X, Clock } from "lucide-react";
import { formatDateUTC } from "@/lib/constants";

interface AppointmentInfo {
  id: string;
  slotStartUtc: string;
  proposedSlotStartUtc: string | null;
  status: string;
  durationMinutes: number;
  rescheduleReason?: string | null;
  originalSlotStartUtc?: string | null;
}

export function AdminRescheduleActions({ appt }: { appt: AppointmentInfo }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<"confirm" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  // No pending proposal → nothing to do
  if (!appt.proposedSlotStartUtc) {
    return (
      <div className="text-[12px] font-body text-feather">
        Slot: <strong className="text-slate">{formatDateUTC(new Date(appt.slotStartUtc))}</strong>
      </div>
    );
  }

  async function confirm() {
    setSubmitting("confirm");
    try {
      const res = await fetch(`/api/appointments/${appt.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Reschedule confirmed.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(null);
    }
  }

  async function reject() {
    setSubmitting("reject");
    try {
      const res = await fetch(`/api/appointments/${appt.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          reason: rejectReason.trim() || "Proposal rejected by staff",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Reschedule proposal rejected.");
      setShowRejectForm(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="bg-iris/5 border border-iris/30 rounded-lg p-3 space-y-2">
      <p className="text-[12px] font-body font-semibold text-slate flex items-center gap-1.5">
        <CalendarClock className="h-3.5 w-3.5 text-iris-dark" aria-hidden /> Pending reschedule proposal
      </p>
      <div className="text-[12px] font-body text-slate space-y-0.5">
        <p><strong>Current slot:</strong> {formatDateUTC(new Date(appt.slotStartUtc))}</p>
        <p><strong>Proposed slot:</strong> {formatDateUTC(new Date(appt.proposedSlotStartUtc))}</p>
        {appt.originalSlotStartUtc && (
          <p className="text-feather text-[11px]">Original (pre-reschedule): {formatDateUTC(new Date(appt.originalSlotStartUtc))}</p>
        )}
        {appt.rescheduleReason && (
          <p className="italic text-feather">Customer reason: {appt.rescheduleReason}</p>
        )}
      </div>
      {!showRejectForm ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={confirm}
            disabled={submitting !== null}
            className="flex-1 h-8 rounded-md bg-forest hover:bg-forest-dark text-white text-[12px] font-body font-semibold inline-flex items-center justify-center gap-1 disabled:bg-feather/40"
          >
            {submitting === "confirm" ? <Clock className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Confirm new slot
          </button>
          <button
            type="button"
            onClick={() => setShowRejectForm(true)}
            disabled={submitting !== null}
            className="flex-1 h-8 rounded-md border border-tail-red/30 hover:bg-tail-red/5 text-tail-red text-[12px] font-body font-semibold inline-flex items-center justify-center gap-1"
          >
            <X className="h-3 w-3" /> Reject
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={2}
            placeholder="Reason for rejection (optional)"
            className="w-full px-2 py-1 rounded-md border border-feather/30 bg-white text-[12px] focus-ring"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowRejectForm(false)}
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
      )}
    </div>
  );
}
