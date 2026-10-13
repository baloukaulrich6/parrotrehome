import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({
  reason: z.string().min(5, "Reason is too short").max(500),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!can(user.role, "request:cancel")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid" },
        { status: 400 }
      );
    }

    const request = await db.request.findUnique({
      where: { id },
      include: { items: { include: { bird: true } }, appointments: true },
    });
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (["COMPLETED", "CANCELED", "REJECTED"].includes(request.status)) {
      return NextResponse.json(
        { error: `Cannot cancel request in status ${request.status}` },
        { status: 400 }
      );
    }

    await db.$transaction(async (tx) => {
      await tx.request.update({
        where: { id },
        data: {
          status: "CANCELED",
          cancelReason: parsed.data.reason,
          canceledAt: new Date(),
        },
      });
      // Release reserved birds
      const birdIds = request.items
        .filter((i) => i.bird && i.bird.status === "RESERVED" && i.bird.reservedByRequestId === id)
        .map((i) => i.birdId)
        .filter(Boolean) as string[];
      for (const bid of birdIds) {
        await tx.bird.update({
          where: { id: bid },
          data: { status: "AVAILABLE", reservedByRequestId: null, reservedUntil: null },
        });
      }
      // Cancel appointments
      await tx.appointment.updateMany({
        where: { requestId: id, status: { in: ["REQUESTED", "CONFIRMED"] } },
        data: { status: "CANCELED" },
      });
    });

    await auditLog.requestStatusChange(
      user.id,
      user.role,
      id,
      request.status,
      "CANCELED",
      { reason: parsed.data.reason }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[cancel] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
