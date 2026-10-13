import { db } from "@/lib/db";
import { Globe, Smartphone, Search, Mail, Share2 } from "lucide-react";

// A-26: Channel analytics — show requests grouped by attribution channel.
// Channel is captured on each new request (defaults to "web").

const CHANNEL_META: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }> }> = {
  web: { label: "Web (desktop)", color: "bg-slate", icon: Globe },
  mobile: { label: "Mobile", color: "bg-tail-red", icon: Smartphone },
  search: { label: "Search engine", color: "bg-forest", icon: Search },
  referral: { label: "Referral", color: "bg-iris", icon: Share2 },
  email: { label: "Email campaign", color: "bg-feather", icon: Mail },
  direct: { label: "Direct", color: "bg-slate-dark", icon: Globe },
};

export async function ChannelAnalytics() {
  const total = await db.request.count();
  const rows = await db.request.groupBy({
    by: ["channel"],
    _count: true,
    where: { channel: { not: null } },
    orderBy: { _count: { channel: "desc" } },
  });

  const unattributedCount = await db.request.count({ where: { channel: null } });
  const attributedCount = rows.reduce((s, r) => s + r._count, 0);

  // Compose final dataset (include unattributed as a row)
  const data = [
    ...rows.map((r) => ({
      channel: (r.channel ?? "direct") as string,
      count: r._count,
      pct: total > 0 ? (r._count / total) * 100 : 0,
    })),
    ...(unattributedCount > 0 ? [{
      channel: "direct",
      count: unattributedCount,
      pct: total > 0 ? (unattributedCount / total) * 100 : 0,
    }] : []),
  ];

  return (
    <section className="bg-white rounded-xl border border-feather/20 p-5">
      <h2 className="font-heading text-slate text-[16px] font-semibold mb-3 flex items-center gap-2">
        <Globe className="h-4 w-4 text-forest" aria-hidden /> Channel analytics (A-26)
      </h2>
      <p className="text-feather text-[13px] font-body mb-4">
        {total} total request{total !== 1 ? "s" : ""} — {attributedCount} attributed to a channel, {unattributedCount} unattributed (defaults to direct).
      </p>

      {data.length === 0 ? (
        <p className="text-feather text-[13px] font-body italic py-6 text-center">
          No requests yet — channel analytics will appear here.
        </p>
      ) : (
        <div className="space-y-3">
          {data.map((d) => {
            const meta = CHANNEL_META[d.channel] ?? { label: d.channel, color: "bg-feather", icon: Globe };
            return (
              <div key={d.channel}>
                <div className="flex items-center justify-between text-[13px] font-body mb-1">
                  <span className="inline-flex items-center gap-2 text-slate font-semibold">
                    <meta.icon className="h-3.5 w-3.5 text-feather" aria-hidden />
                    {meta.label}
                  </span>
                  <span className="text-feather">
                    <strong className="text-slate">{d.count}</strong> ({d.pct.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-3 rounded-full bg-feather/15 overflow-hidden">
                  <div
                    className={`h-full ${meta.color} rounded-full transition-all`}
                    style={{ width: `${d.pct}%`, minWidth: d.count > 0 ? "8px" : "0" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
