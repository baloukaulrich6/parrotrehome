import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";
import { formatUsd, formatDateUTC } from "@/lib/constants";

// GET /api/admin/reports/periodic
// A-27: Periodic operational reports. Generates a CSV with KPIs over a date range.

export async function GET(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!can(user.role, "metrics:view")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const fromStr = url.searchParams.get("from");
    const untilStr = url.searchParams.get("until");
    const now = new Date();
    const from = fromStr ? new Date(fromStr) : new Date(now.getFullYear(), now.getMonth(), 1); // first of month
    const until = untilStr ? new Date(untilStr) : now;

    if (from.getTime() > until.getTime()) {
      return NextResponse.json({ error: "from must be before until" }, { status: 400 });
    }

    // Fetch all requests in the period
    const requests = await db.request.findMany({
      where: { createdAt: { gte: from, lte: until } },
      include: {
        items: true,
        appointments: true,
        paymentChecks: true,
        coupon: true,
      },
    });

    // Compute KPIs
    const total = requests.length;
    const completed = requests.filter((r) => r.status === "COMPLETED").length;
    const canceled = requests.filter((r) => ["CANCELED", "REJECTED"].includes(r.status)).length;
    const pending = requests.filter((r) => !["COMPLETED", "CANCELED", "REJECTED"].includes(r.status)).length;
    const revenue = requests
      .filter((r) => r.status === "COMPLETED")
      .reduce((s, r) => s + Number(r.finalTotalUsd ?? r.totalQuoteUsd ?? 0), 0);
    const avgValue = total > 0 ? requests.reduce((s, r) => s + Number(r.totalQuoteUsd ?? 0), 0) / total : 0;
    const conversion = total > 0 ? ((completed / total) * 100).toFixed(1) : "0";
    const couponUsage = requests.filter((r) => r.couponId).length;
    const discountGiven = requests.reduce((s, r) => s + Number(r.discountUsd ?? 0), 0);
    const byType: Record<string, number> = {};
    requests.forEach((r) => { byType[r.type] = (byType[r.type] ?? 0) + 1; });
    const byChannel: Record<string, number> = {};
    requests.forEach((r) => { byChannel[r.channel ?? "unattributed"] = (byChannel[r.channel ?? "unattributed"] ?? 0) + 1; });
    const byStatus: Record<string, number> = {};
    requests.forEach((r) => { byStatus[r.status] = (byStatus[r.status] ?? 0) + 1; });

    // Build CSV
    const lines: string[] = [];
    lines.push(`ParrotRehome Operational Report`);
    lines.push(`Period: ${formatDateUTC(from)} to ${formatDateUTC(until)}`);
    lines.push(`Generated: ${formatDateUTC(new Date())} by ${user.email} (${user.role})`);
    lines.push("");
    lines.push("=== Overview ===");
    lines.push(`Total requests,${total}`);
    lines.push(`Completed,${completed}`);
    lines.push(`Pending / in-flight,${pending}`);
    lines.push(`Canceled / rejected,${canceled}`);
    lines.push(`Conversion rate (completed / total),${conversion}%`);
    lines.push(`Verified revenue (USD),${revenue.toFixed(2)}`);
    lines.push(`Avg request value (USD),${avgValue.toFixed(2)}`);
    lines.push("");
    lines.push("=== Coupons ===");
    lines.push(`Coupons used,${couponUsage}`);
    lines.push(`Total discount given (USD),${discountGiven.toFixed(2)}`);
    lines.push("");
    lines.push("=== Requests by type ===");
    Object.entries(byType).forEach(([k, v]) => lines.push(`${k},${v}`));
    lines.push("");
    lines.push("=== Requests by channel ===");
    Object.entries(byChannel).forEach(([k, v]) => lines.push(`${k},${v}`));
    lines.push("");
    lines.push("=== Requests by status ===");
    Object.entries(byStatus).forEach(([k, v]) => lines.push(`${k},${v}`));
    lines.push("");
    lines.push("=== Per-request detail ===");
    lines.push("reference,createdAt,status,type,totalUsd,discountUsd,finalTotalUsd,couponCode,channel,customerEmail,agentId");
    requests.forEach((r) => {
      const row = [
        r.reference,
        r.createdAt.toISOString(),
        r.status,
        r.type,
        (Number(r.totalQuoteUsd ?? 0)).toFixed(2),
        (Number(r.discountUsd ?? 0)).toFixed(2),
        (Number(r.finalTotalUsd ?? r.totalQuoteUsd ?? 0)).toFixed(2),
        r.coupon?.code ?? "",
        r.channel ?? "unattributed",
        r.customerEmail,
        r.agentId ?? "unassigned",
      ].map((s) => (s.includes(",") ? `"${s}"` : s)).join(",");
      lines.push(row);
    });

    await auditLog.export(user.id, user.role, { report: "periodic", from: from.toISOString(), until: until.toISOString(), total });

    const csv = lines.join("\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="parrotrehome-report-${from.toISOString().slice(0, 10)}-to-${until.toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    console.error("[periodic report] error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
