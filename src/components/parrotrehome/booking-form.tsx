"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Calendar, Clock, Send, Stethoscope } from "lucide-react";
import { AVIAN_ADVICE_PRICE_PER_HOUR } from "@/lib/constants";
import { trackConversion } from "@/components/google-analytics";

const TIMEZONE_OFFSETS = [
  { label: "PT (UTC-8)", offset: -8 },
  { label: "MT (UTC-7)", offset: -7 },
  { label: "CT (UTC-6)", offset: -6 },
  { label: "ET (UTC-5)", offset: -5 },
];

const DURATIONS = [
  { value: 60, label: "60 minutes — $15" },
];

export function BookingForm({
  professionalId,
  professionalName,
  subjects,
}: {
  professionalId: string;
  professionalName: string;
  subjects: string[];
}) {
  const { data: session } = useSession();
  const router = useRouter();

  const [form, setForm] = useState({
    preferredDate: "",
    preferredTime: "",
    timezone: "ET (UTC-5)",
    durationMinutes: 60,
    subject: subjects[0] ?? "",
    customerName: session?.user?.name ?? "",
    customerEmail: session?.user?.email ?? "",
    customerPhone: "",
    species: "",
    ageYears: "",
    symptoms: "",
    history: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!professionalId) {
      toast.error("No avian professional is currently available.");
      return;
    }
    if (!form.customerEmail || !form.preferredDate || !form.preferredTime) {
      toast.error("Please complete all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      toast.success(`Request ${data.reference} received — check your email.`);
      // Google Ads conversion tracking
      trackConversion("appointment_booked", { value: 15, currency: "USD", transaction_id: data.reference });
      router.push(`/my-requests/${data.requestId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Slot picker */}
      <fieldset className="bg-ivory rounded-xl border border-feather/20 p-5">
        <legend className="px-2 text-[14px] font-body font-semibold text-slate flex items-center gap-2">
          <Calendar className="h-4 w-4 text-tail-red" aria-hidden /> Preferred slot
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div>
            <label htmlFor="date" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">
              Date *
            </label>
            <input
              id="date"
              type="date"
              required
              value={form.preferredDate}
              onChange={(e) => update("preferredDate", e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-white text-[14px] focus-ring"
            />
          </div>
          <div>
            <label htmlFor="time" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">
              Time *
            </label>
            <input
              id="time"
              type="time"
              required
              value={form.preferredTime}
              onChange={(e) => update("preferredTime", e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-white text-[14px] focus-ring"
            />
          </div>
          <div>
            <label htmlFor="tz" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">
              Your timezone
            </label>
            <select
              id="tz"
              value={form.timezone}
              onChange={(e) => update("timezone", e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-white text-[14px] focus-ring"
            >
              {TIMEZONE_OFFSETS.map((t) => (
                <option key={t.label} value={t.label}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dur" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">
              Duration
            </label>
            <select
              id="dur"
              value={form.durationMinutes}
              onChange={(e) => update("durationMinutes", Number(e.target.value))}
              className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-white text-[14px] focus-ring"
            >
              {DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-[12px] text-feather mt-2 font-body">
          Reference price: ${AVIAN_ADVICE_PRICE_PER_HOUR}/hour. Slot confirmed
          after manual payment verification.
        </p>
      </fieldset>

      {/* Contact */}
      <fieldset className="bg-ivory rounded-xl border border-feather/20 p-5">
        <legend className="px-2 text-[14px] font-body font-semibold text-slate">
          Your contact details
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div>
            <label htmlFor="name" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">Name *</label>
            <input
              id="name"
              type="text"
              required
              value={form.customerName}
              onChange={(e) => update("customerName", e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-white text-[14px] focus-ring"
            />
          </div>
          <div>
            <label htmlFor="email" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">Email *</label>
            <input
              id="email"
              type="email"
              required
              value={form.customerEmail}
              onChange={(e) => update("customerEmail", e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-white text-[14px] focus-ring"
            />
          </div>
          <div>
            <label htmlFor="phone" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">Phone</label>
            <input
              id="phone"
              type="tel"
              value={form.customerPhone}
              onChange={(e) => update("customerPhone", e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-white text-[14px] focus-ring"
            />
          </div>
          <div>
            <label htmlFor="subject" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">Subject *</label>
            <select
              id="subject"
              value={form.subject}
              onChange={(e) => update("subject", e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-white text-[14px] focus-ring"
            >
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      {/* Animal info (F-16) */}
      <fieldset className="bg-ivory rounded-xl border border-feather/20 p-5">
        <legend className="px-2 text-[14px] font-body font-semibold text-slate flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-forest" aria-hidden /> About your bird
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div>
            <label htmlFor="species" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">Species *</label>
            <input
              id="species"
              type="text"
              required
              placeholder="e.g., African Grey"
              value={form.species}
              onChange={(e) => update("species", e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-white text-[14px] focus-ring"
            />
          </div>
          <div>
            <label htmlFor="age" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">Age (years)</label>
            <input
              id="age"
              type="number"
              min="0"
              step="0.5"
              value={form.ageYears}
              onChange={(e) => update("ageYears", e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-white text-[14px] focus-ring"
            />
          </div>
        </div>
        <div className="mt-3">
          <label htmlFor="symptoms" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">Symptoms / current concern</label>
          <textarea
            id="symptoms"
            rows={3}
            value={form.symptoms}
            onChange={(e) => update("symptoms", e.target.value)}
            placeholder="What signs prompted you to book?"
            className="mt-1 w-full px-3 py-2 rounded-md border border-feather/30 bg-white text-[14px] focus-ring"
          />
        </div>
        <div className="mt-3">
          <label htmlFor="history" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">Medical history</label>
          <textarea
            id="history"
            rows={3}
            value={form.history}
            onChange={(e) => update("history", e.target.value)}
            placeholder="Past diagnoses, treatments, vet visits..."
            className="mt-1 w-full px-3 py-2 rounded-md border border-feather/30 bg-white text-[14px] focus-ring"
          />
        </div>
        <div className="mt-3">
          <label htmlFor="notes" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">Additional notes</label>
          <textarea
            id="notes"
            rows={2}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Specific questions, scheduling constraints..."
            className="mt-1 w-full px-3 py-2 rounded-md border border-feather/30 bg-white text-[14px] focus-ring"
          />
        </div>
        <p className="text-[12px] text-feather mt-2 font-body">
          File upload (F-16) is V2 — describe documents in your notes for now.
        </p>
      </fieldset>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-feather/15 pt-5">
        <p className="text-[12px] text-feather font-body">
          By submitting, you consent to be contacted by an authorized ParrotRehome
          agent. No payment is collected on this site.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-tail-red hover:bg-tail-red-dark text-white text-[15px] font-body font-semibold transition-colors focus-ring shadow-sm disabled:bg-feather/40"
        >
          {submitting ? (
            <>
              <Clock className="h-4 w-4 animate-spin" aria-hidden /> Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" aria-hidden /> Submit request
            </>
          )}
        </button>
      </div>
    </form>
  );
}
