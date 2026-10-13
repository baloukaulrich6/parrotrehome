import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";
import { canTransition } from "@/lib/constants";
import { z } from "zod";

// POST /api/admin/pending-actions
// A-09: Create a pending action for 2-person approval.
// Used by other actions (e.g., VerifyPaymentForm for amount >= $1000) to defer execution.

const schema = z.object({
  requestId: z.string().optional(),
  objectType: z.enum(["Request", "Bird", "PaymentInstruction"]),
  objectId: z.string(),
  actionType: z.enum(["PAYMENT_VERIFY_HIGH_VALUE", "PAYMENT_INSTRUCTION_HIGH_VALUE", "REQUEST_CANCEL_AFTER_PAID", "BIRD_DELETE"]),
  proposedChanges: z.record(z.unknown()),
  reason: z.string().max(500).optional(),
  thresholdValue: z.number().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!can(user.role, "payment:validate") && !can(user.role, "inventory:manage_birds")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid" },
        { status: 400 }
      );
    }
    const d = parsed.data;

    const action = await db.pendingAction.create({
      data: {
        requestId: d.requestId ?? null,
        objectType: d.objectType,
        objectId: d.objectId,
        actionType: d.actionType,
        proposedById: user.id,
        proposedByName: user.name ?? user.email,
        proposedChanges: JSON.stringify(d.proposedChanges),
        reason: d.reason ?? null,
        thresholdValue: d.thresholdValue ?? null,
        status: "PENDING",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h default
      },
    });

    await audit({
      actorId: user.id,
      actorRole: user.role,
      objectType: "PendingAction",
      objectId: action.id,
      action: "CREATE",
      metadata: { actionType: d.actionType, requestId: d.requestId, threshold: d.thresholdValue },
    });

    return NextResponse.json({
      id: action.id,
      status: "PENDING",
      message: "Action submitted for 2-person approval. A second authorized agent must approve before it executes.",
    });
  } catch (err) {
    console.error("[pending-actions] POST error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// GET /api/admin/pending-actions — list all pending actions
export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!can(user.role, "payment:validate") && !can(user.role, "inventory:manage_birds")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const actions = await db.pendingAction.findMany({
      where: { status: "PENDING" },
      orderBy: { proposedAt: "desc" },
      include: {
        proposedBy: { select: { name: true, role: true } },
      },
    });

    return NextResponse.json({
      actions: actions.map((a) => ({
        id: a.id,
        requestId: a.requestId,
        objectType: a.objectType,
        objectId: a.objectId,
        actionType: a.actionType,
        proposedById: a.proposedById,
        proposedByName: a.proposedByName,
        proposedByRole: a.proposedBy?.role,
        proposedAt: a.proposedAt.toISOString(),
        proposedChanges: a.proposedChanges,
        reason: a.reason,
        thresholdValue: a.thresholdValue,
        expiresAt: a.expiresAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[pending-actions] GET error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
