import { prepareReceipt, sendReceipt } from "@/lib/payment-receipts";
import { randomUUID } from "node:crypto";
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

    if (_req.headers.get("origin") !== new URL(process.env.NEXTAUTH_URL || _req.url).origin) return new Response(null, { status: 403 });
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

    if (action.expiresAt <= new Date()) return NextResponse.json({ error: "This approval has expired." }, { status: 409 });

    // Execute the actual action
    const changes = JSON.parse(action.proposedChanges) as Record<string, unknown>;

    if (action.actionType === "PAYMENT_VERIFY_HIGH_VALUE") {
      if (!can(user.role, "payment:validate")) return new Response(null, { status: 403 });
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

      const checkId = randomUUID(); const verifiedAt = new Date();
      if (typeof changes.amount !== "number" || typeof changes.reference !== "string" || !changes.reference.trim()) return NextResponse.json({ error: "Invalid payment confirmation." }, { status: 400 });
      let receiptData;
      try { receiptData = await prepareReceipt(requestId, { id: checkId, amount: changes.amount, reference: changes.reference, verifiedAt }); }
      catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
      await db.$transaction(async tx => {
        const claimed = await tx.pendingAction.updateMany({ where: { id, status: "PENDING", expiresAt: { gt: new Date() } }, data: { status: "APPROVED", approverId: user.id, approverName: user.name ?? user.email, approvedAt: verifiedAt } });
        if (!claimed.count) throw new Error("Approval changed. Refresh before retrying.");
        const changed = await tx.request.updateMany({ where: { id: requestId, status: "PAYMENT_TO_VERIFY" }, data: { status: newStatus, paidAt: verifiedAt } });
        if (!changed.count) throw new Error("Payment state changed. Refresh before retrying.");
        await tx.paymentCheck.create({ data: { id: checkId, requestId, reference: changes.reference as string, amount: changes.amount as number, verifiedBy: user.id, verifiedAt, notes: (changes.notes as string) ?? `Approved via 2-person rule by ${user.name}` } });
        await tx.paymentReceipt.create({ data: receiptData });
      });
      await sendReceipt(requestId).catch(error => console.error("[receipt] payment verified, delivery needs retry", error));

      await auditLog.paymentVerify(user.id, user.role, requestId, changes.reference as string, changes.amount as number);
      await auditLog.requestStatusChange(user.id, user.role, requestId, request.status, newStatus, { approvedVia: action.id });
    }

    if (action.actionType !== "PAYMENT_VERIFY_HIGH_VALUE") await db.pendingAction.update({ where: { id }, data: { status: "APPROVED", approverId: user.id, approverName: user.name ?? user.email, approvedAt: new Date() } });

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
