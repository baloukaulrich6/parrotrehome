"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, Clock } from "lucide-react";

export function SendRemindersButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function send() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/appointments/send-reminders", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(`Reminders sent: ${data.sent24h} × 24h, ${data.sent1h} × 1h (scanned ${data.total} appointments).`);
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
      onClick={send}
      disabled={submitting}
      className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-iris hover:bg-iris-dark text-slate text-[13px] font-body font-semibold disabled:bg-feather/40"
      title="Scan upcoming appointments and send 24h + 1h reminders (F-19)"
    >
      {submitting ? <Clock className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
      Send reminders
    </button>
  );
}
