"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Clock, Check, X } from "lucide-react";
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

export function AppointmentRescheduleButton({ appt }: { appt: AppointmentInfo }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const hasPendingProposal = appt.proposedSlotStartUtc != null;
  const canReschedule = !["COMPLETED", "CANCELED"].includes(appt.status);

  if (!canReschedule) return null;

  // If there's a pending proposal from the client, show the "pending review" state
  if (hasPendingProposal) {
    return (
      <div className="bg-iris/5 border border-iris/30 rounded-lg p-3 text-[13px] font-body text-slate">
        <p className="flex items-center gap-2 font-semibold">
          <Clock className="h-3.5 w-3.5 text-iris-dark" aria-hidden /> Awaiting reschedule confirmation
        </p>
        <p className="text-feather text-[12px] mt-1">
          You proposed: <strong className="text-slate">{formatDateUTC(new Date(appt.proposedSlotStartUtc!))}</strong>
        </p>
        <p className="text-feather text-[12px] mt-0.5">
          Original slot: <strong className="text-slate">{formatDateUTC(new Date(appt.slotStartUtc))}</strong>
        </p>
        {appt.rescheduleReason && (
          <p className="text-feather text-[12px] italic mt-1">Reason: {appt.rescheduleReason}</p>
        )}
        <p className="text-feather text-[12px] mt-2">Our team will confirm or reply shortly.</p>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time) {
      toast.error("Please pick a date and time for the new slot.");
      return;
    }
    const localDate = new Date(`${date}T${time}:00`);
    if (localDate.getTime() < Date.now()) {
      toast.error("Please pick a future date and time.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/appointments/${appt.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "propose",
          proposedSlotStartUtc: localDate.toISOString(),
          reason: reason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Reschedule request submitted. Our team will confirm shortly.");
      setOpen(false);
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
        className="w-full inline-flex items-center justify-center gap-2 h-10 px-3 rounded-full border border-feather/40 hover:bg-feather/10 text-slate text-[13px] font-body font-semibold transition-colors focus-ring"
      >
        <CalendarClock className="h-3.5 w-3.5" /> Request reschedule
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="bg-ivory border border-feather/30 rounded-lg p-3 space-y-2">
      <p className="text-[12px] font-body font-semibold text-slate flex items-center gap-1.5">
        <CalendarClock className="h-3.5 w-3.5 text-tail-red" /> Propose new slot
      </p>
      <p className="text-[11px] text-feather font-body">
        Current: {formatDateUTC(new Date(appt.slotStartUtc))} ({appt.durationMinutes} min)
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="reschedule-date" className="text-[10px] font-body font-semibold text-feather uppercase tracking-wide">New date</label>
          <input
            id="reschedule-date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            className="w-full h-9 px-2 rounded-md border border-feather/30 bg-white text-[13px] focus-ring"
          />
        </div>
        <div>
          <label htmlFor="reschedule-time" className="text-[10px] font-body font-semibold text-feather uppercase tracking-wide">New time</label>
          <input
            id="reschedule-time"
            type="time"
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full h-9 px-2 rounded-md border border-feather/30 bg-white text-[13px] focus-ring"
          />
        </div>
      </div>
      <div>
        <label htmlFor="reschedule-reason" className="text-[10px] font-body font-semibold text-feather uppercase tracking-wide">Reason (optional)</label>
        <input
          id="reschedule-reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g., scheduling conflict"
          className="w-full h-9 px-2 rounded-md border border-feather/30 bg-white text-[13px] focus-ring"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 h-9 rounded-md border border-feather/30 hover:bg-feather/10 text-feather text-[12px] font-body font-semibold inline-flex items-center justify-center gap-1"
        >
          <X className="h-3.5 w-3.5" /> Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 h-9 rounded-md bg-iris hover:bg-iris-dark text-slate text-[12px] font-body font-semibold inline-flex items-center justify-center gap-1 disabled:bg-feather/40"
        >
          {submitting ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          {submitting ? "Submitting..." : "Submit proposal"}
        </button>
      </div>
    </form>
  );
}
