import { sendRequestNotification } from "@/lib/email";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { auditLog, audit } from "@/lib/audit";
import { canTransition } from "@/lib/constants";

// POST /api/admin/pending-actions/[id]/approve
// A-09: Second agent approves the pending action — executes it.
// Cannot approve own action (must be a different user).

export async function POST(
  _req: Request,
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
    // Cannot approve your own action (2-person rule)
    if (action.proposedById === user.id) {
      return NextResponse.json(
        { error: "You cannot approve your own proposed action. A different authorized agent must approve." },
        { status: 403 }
      );
    }

    // Mark approved
    await db.pendingAction.update({
      where: { id },
      data: {
        status: "APPROVED",
        approverId: user.id,
        approverName: user.name ?? user.email,
        approvedAt: new Date(),
      },
    });

    // Execute the actual action
    const changes = JSON.parse(action.proposedChanges) as Record<string, unknown>;

    if (action.actionType === "PAYMENT_VERIFY_HIGH_VALUE") {
      // Execute the payment verification
      const requestId = action.requestId ?? (changes.requestId as string);
      if (!requestId) return NextResponse.json({ error: "Missing requestId" }, { status: 400 });

      const request = await db.request.findUnique({ where: { id: requestId } });
      if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
      if (request.status !== "PAYMENT_TO_VERIFY") {
        return NextResponse.json(
          { error: `Cannot verify in status ${request.status}` },
          { status: 400 }
        );
      }
      const newStatus = "PAID_VERIFIED";
      if (!canTransition("PAYMENT_TO_VERIFY", newStatus)) {
        return NextResponse.json({ error: "Invalid transition" }, { status: 400 });
      }

      await db.$transaction(async (tx) => {
        await tx.paymentCheck.create({
          data: {
            requestId,
            reference: (changes.reference as string) ?? null,
            amount: changes.amount as number,
            verifiedBy: user.id,
            notes: (changes.notes as string) ?? `Approved via 2-person rule by ${user.name}`,
          },
        });
        await tx.request.update({
          where: { id: requestId },
          data: { status: newStatus, paidAt: new Date() },
        });
      });

      await sendRequestNotification(requestId, "payment-verified", "", `payment-verified:${requestId}`);

      await auditLog.paymentVerify(user.id, user.role, requestId, changes.reference as string, changes.amount as number);
      await auditLog.requestStatusChange(user.id, user.role, requestId, request.status, newStatus, { approvedVia: action.id });
    }

    await audit({
      actorId: user.id,
      actorRole: user.role,
      objectType: "PendingAction",
      objectId: id,
      action: "UPDATE",
      changes: { status: "APPROVED", executed: true },
    });

    return NextResponse.json({ ok: true, status: "APPROVED", executed: true });
  } catch (err) {
    console.error("[pending-actions/approve] error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
