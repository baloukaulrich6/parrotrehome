import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { requireStaff } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";
import { canTransition } from "@/lib/constants";

// POST /api/admin/requests/[id]/advance
// Move a request forward through its lifecycle after payment is verified:
//   PAID_VERIFIED → READY_FOR_FULFILLMENT
//   READY_FOR_FULFILLMENT → COMPLETED

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await requireStaff(user.role);

    const { id } = await params;
    const request = await db.request.findUnique({ where: { id } });
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let newStatus: string | null = null;
    if (request.status === "PAID_VERIFIED") newStatus = "READY_FOR_FULFILLMENT";
    else if (request.status === "READY_FOR_FULFILLMENT") newStatus = "COMPLETED";
    else {
      return NextResponse.json(
        { error: `Cannot advance from status ${request.status}` },
        { status: 400 }
      );
    }

    if (!canTransition(request.status, newStatus)) {
      return NextResponse.json({ error: "Invalid transition" }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      await tx.request.update({
        where: { id },
        data: {
          status: newStatus!,
          ...(newStatus === "COMPLETED" && { completedAt: new Date() }),
        },
      });
      // Mark birds as sold when request completes
      if (newStatus === "COMPLETED") {
        const items = await tx.requestItem.findMany({
          where: { requestId: id },
          select: { birdId: true },
        });
        for (const item of items) {
          if (item.birdId) {
            await tx.bird.update({
              where: { id: item.birdId },
              data: { status: "SOLD", reservedByRequestId: null, reservedUntil: null },
            });
          }
        }
        // Mark appointments as completed
        await tx.appointment.updateMany({
          where: { requestId: id },
          data: { status: "COMPLETED" },
        });
      }
    });

    await auditLog.requestStatusChange(
      user.id,
      user.role,
      id,
      request.status,
      newStatus
    );

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (err) {
    console.error("[advance] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
