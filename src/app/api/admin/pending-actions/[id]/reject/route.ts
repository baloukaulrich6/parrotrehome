import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

// POST /api/admin/pending-actions/[id]/reject
// A-09: Second agent rejects the pending action with a reason.

const schema = z.object({
  reason: z.string().min(3, "Reason too short").max(500),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!can(user.role, "payment:validate") && !can(user.role, "inventory:manage_birds")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const action = await db.pendingAction.findUnique({ where: { id } });
    if (!action) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (action.status !== "PENDING") {
      return NextResponse.json(
        { error: `Action already ${action.status.toLowerCase()}` },
        { status: 400 }
      );
    }
    if (action.proposedById === user.id) {
      return NextResponse.json(
        { error: "You cannot reject your own proposed action." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid" },
        { status: 400 }
      );
    }

    await db.pendingAction.update({
      where: { id },
      data: {
        status: "REJECTED",
        approverId: user.id,
        approverName: user.name ?? user.email,
        approvedAt: new Date(),
        rejectedReason: parsed.data.reason,
      },
    });

    await audit({
      actorId: user.id,
      actorRole: user.role,
      objectType: "PendingAction",
      objectId: id,
      action: "UPDATE",
      changes: { status: "REJECTED", reason: parsed.data.reason, actionType: action.actionType },
    });

    return NextResponse.json({ ok: true, status: "REJECTED" });
  } catch (err) {
    console.error("[pending-actions/reject] error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
