"use client";

import { useState } from "react";
import { Download, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function PeriodicReportsPanel() {
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [loading, setLoading] = useState(false);

  // Default to current month
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);

  function buildHref(range: "month" | "quarter" | "year") {
    const end = new Date();
    let start = new Date();
    if (range === "month") start = new Date(end.getFullYear(), end.getMonth(), 1);
    if (range === "quarter") start = new Date(end.getFullYear(), Math.floor(end.getMonth() / 3) * 3, 1);
    if (range === "year") start = new Date(end.getFullYear(), 0, 1);
    return `/api/admin/reports/periodic?from=${start.toISOString()}&until=${end.toISOString()}`;
  }

  async function customDownload() {
    setLoading(true);
    try {
      const fromIso = from ? new Date(from).toISOString() : new Date(firstOfMonth).toISOString();
      const untilIso = until ? new Date(until).toISOString() : new Date().toISOString();
      const res = await fetch(`/api/admin/reports/periodic?from=${fromIso}&until=${untilIso}`);
      if (!res.ok) throw new Error("Failed to generate report");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `parrotrehome-report-${from || firstOfMonth}-to-${until || todayStr}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-white rounded-xl border border-feather/20 p-5">
      <h2 className="font-heading text-slate text-[16px] font-semibold mb-3 flex items-center gap-2">
        <Download className="h-4 w-4 text-iris" aria-hidden /> Periodic operational reports (A-27)
      </h2>
      <p className="text-feather text-[13px] font-body mb-4">
        Download a CSV with KPIs (conversion, revenue, by-type, by-channel, by-status) + per-request detail for the selected period.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <a
          href={buildHref("month")}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-slate hover:bg-slate-dark text-ivory text-[12px] font-body font-semibold"
        >
          <Calendar className="h-3.5 w-3.5" /> This month
        </a>
        <a
          href={buildHref("quarter")}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-slate hover:bg-slate-dark text-ivory text-[12px] font-body font-semibold"
        >
          <Calendar className="h-3.5 w-3.5" /> This quarter
        </a>
        <a
          href={buildHref("year")}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-slate hover:bg-slate-dark text-ivory text-[12px] font-body font-semibold"
        >
          <Calendar className="h-3.5 w-3.5" /> This year
        </a>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 items-end">
        <div>
          <label htmlFor="from" className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">From</label>
          <input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 h-9 px-2 rounded-md border border-feather/30 bg-ivory text-[13px] focus-ring" />
        </div>
        <div>
          <label htmlFor="until" className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Until</label>
          <input id="until" type="date" value={until} onChange={(e) => setUntil(e.target.value)} className="mt-1 h-9 px-2 rounded-md border border-feather/30 bg-ivory text-[13px] focus-ring" />
        </div>
        <button
          type="button"
          onClick={customDownload}
          disabled={loading}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-iris hover:bg-iris-dark text-slate text-[12px] font-body font-semibold disabled:bg-feather/40"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Custom range
        </button>
      </div>
    </section>
  );
}
