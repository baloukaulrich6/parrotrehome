import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";
import { REQUEST_STATUS_META, formatDateUTC } from "@/lib/constants";

// GET /api/admin/requests/export
// A-02: CSV export of requests matching current filters

export async function GET(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!can(user.role, "request:export")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const type = url.searchParams.get("type");
    const q = url.searchParams.get("q");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (q) {
      where.OR = [
        { reference: { contains: q } },
        { customerName: { contains: q } },
        { customerEmail: { contains: q } },
      ];
    }

    const requests = await db.request.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { agent: true, selectedPaymentMethod: true, items: true },
    });

    await auditLog.export(user.id, user.role, { status, type, q });

    // Build CSV
    const header = [
      "Reference",
      "Type",
      "Status",
      "Customer",
      "Email",
      "Phone",
      "State",
      "Agent",
      "Payment method",
      "Items count",
      "Total USD",
      "Created",
      "Paid at",
      "Completed at",
      "Canceled at",
      "Cancel reason",
    ].join(",");

    const rows = requests.map((r) => {
      const statusMeta = REQUEST_STATUS_META[r.status] ?? { label: r.status };
      return [
        r.reference,
        r.type,
        statusMeta.label,
        escapeCsv(r.customerName),
        r.customerEmail,
        r.customerPhone ?? "",
        r.shippingState,
        r.agent?.name ?? "",
        r.selectedPaymentMethod?.name ?? "",
        r.items.length.toString(),
        r.totalQuoteUsd != null ? Number(r.totalQuoteUsd).toFixed(2) : "",
        r.paidAt ? formatDateUTC(r.paidAt) : "",
        r.completedAt ? formatDateUTC(r.completedAt) : "",
        r.canceledAt ? formatDateUTC(r.canceledAt) : "",
        escapeCsv(r.cancelReason ?? ""),
      ].join(",");
    });

    const csv = [header, ...rows].join("\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="parrotrehome-requests-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    console.error("[export] error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

function escapeCsv(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
