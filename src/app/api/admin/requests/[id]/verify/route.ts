import { prepareReceipt, sendReceipt, validateReceivedAmount } from "@/lib/payment-receipts";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { auditLog, audit } from "@/lib/audit";
import { canTransition } from "@/lib/constants";
import { z } from "zod";

// POST /api/admin/requests/[id]/verify
// A-08 + T-06: Manual payment verification.
// - Records verified amount, reference, notes, verifier, timestamp
// - Transitions PAYMENT_TO_VERIFY → PAID_VERIFIED
// - Writes immutable audit trail
// - Releases bird reservation (bird stays in RESERVED until fulfillment completes)

const schema = z.object({
  amount: z.number().positive(),
  reference: z.string().trim().min(1).max(200).optional(),
  notes: z.string().max(1000).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!can(user.role, "payment:validate")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (req.headers.get("origin") !== new URL(process.env.NEXTAUTH_URL || req.url).origin) return new Response(null, { status: 403 });
    const { id } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid" },
        { status: 400 }
      );
    }

    let request = await db.request.findUnique({ where: { id } });
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

    try { validateReceivedAmount(request.finalTotalUsd ?? request.totalQuoteUsd, parsed.data.amount); } catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
    parsed.data.reference = parsed.data.reference || request.paymentReference?.trim() || undefined;
    if (!parsed.data.reference) return NextResponse.json({ error: "Enter the verified provider payment reference." }, { status: 400 });
    // Validate issuer details and prepare the document before changing payment state.
    const checkId = randomUUID(); const verifiedAt = new Date();
    let receiptData;
    try { receiptData = await prepareReceipt(id, { id: checkId, amount: parsed.data.amount, reference: parsed.data.reference, verifiedAt }); }
    catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }

    // An authorized staff member can record a reference received by email.
    if (request.status === "INSTRUCTIONS_SENT") {
      if (!parsed.data.reference) return NextResponse.json({ error: "Enter the payment confirmation reference received from the client." }, { status: 400 });
      const recorded = await db.request.updateMany({ where: { id, status: "INSTRUCTIONS_SENT" }, data: { status: "PAYMENT_TO_VERIFY", paymentReference: parsed.data.reference } });
      if (!recorded.count) return NextResponse.json({ error: "Request changed. Refresh before verifying." }, { status: 409 });
      await auditLog.requestStatusChange(user.id, user.role, id, "INSTRUCTIONS_SENT", "PAYMENT_TO_VERIFY", { source: "STAFF_RECORDED_REFERENCE" });
      request = { ...request, status: "PAYMENT_TO_VERIFY", paymentReference: parsed.data.reference };
    }

    if (request.status !== "PAYMENT_TO_VERIFY") {
      return NextResponse.json(
        { error: `Cannot verify in status ${request.status}` },
        { status: 400 }
      );
    }

    // A-09: Double validation for high-value payment verification (>= $1000)
    // For amounts >= $1000, defer to PendingAction for 2-person approval.
    const HIGH_VALUE_THRESHOLD = 1000;
    if (parsed.data.amount >= HIGH_VALUE_THRESHOLD) {
      const existing = await db.pendingAction.findFirst({ where: { requestId: id, actionType: "PAYMENT_VERIFY_HIGH_VALUE", status: "PENDING", expiresAt: { gt: new Date() } } });
      if (existing) return NextResponse.json({ error: "This payment is already awaiting second approval." }, { status: 409 });
      const action = await db.pendingAction.create({
        data: {
          requestId: id,
          objectType: "Request",
          objectId: id,
          actionType: "PAYMENT_VERIFY_HIGH_VALUE",
          proposedById: user.id,
          proposedByName: user.name ?? user.email,
          proposedChanges: JSON.stringify({
            requestId: id,
            reference: parsed.data.reference,
            amount: parsed.data.amount,
            notes: parsed.data.notes,
          }),
          reason: `Payment verification for ${request.reference} — amount $${parsed.data.amount.toFixed(2)} >= $${HIGH_VALUE_THRESHOLD} threshold (A-09)`,
          thresholdValue: HIGH_VALUE_THRESHOLD,
          status: "PENDING",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      await audit({
        actorId: user.id,
        actorRole: user.role,
        objectType: "PendingAction",
        objectId: action.id,
        action: "CREATE",
        metadata: { actionType: "PAYMENT_VERIFY_HIGH_VALUE", requestId: id, amount: parsed.data.amount },
      });

      return NextResponse.json({
        ok: true,
        pendingActionId: action.id,
        status: "PENDING_APPROVAL",
        message: `Amount $${parsed.data.amount.toFixed(2)} >= $${HIGH_VALUE_THRESHOLD} threshold — submitted for 2-person approval. A different authorized agent must approve in /admin/pending-actions.`,
      });
    }

    // For amounts < $1000, proceed with direct verification (existing flow)

    const newStatus = "PAID_VERIFIED";
    if (!canTransition("PAYMENT_TO_VERIFY", newStatus)) {
      return NextResponse.json({ error: "Invalid transition" }, { status: 400 });
    }

    // Transaction: payment check + status update + audit
    await db.$transaction(async (tx) => {
      const changed = await tx.request.updateMany({ where: { id, status: "PAYMENT_TO_VERIFY" }, data: { status: newStatus, paidAt: verifiedAt } });
      if (!changed.count) throw new Error("Request changed. Refresh before verifying payment.");
      await tx.paymentCheck.create({
        data: {
          id: checkId, verifiedAt,
          requestId: id,
          reference: parsed.data.reference,
          amount: parsed.data.amount,
          verifiedBy: user.id,
          notes: parsed.data.notes,
        },
      });
      await tx.paymentReceipt.create({ data: receiptData });
    });

    await auditLog.paymentVerify(
      user.id,
      user.role,
      id,
      parsed.data.reference ?? null,
      parsed.data.amount
    );
    await auditLog.requestStatusChange(
      user.id,
      user.role,
      id,
      request.status,
      newStatus,
      { verifiedAmount: parsed.data.amount }
    );

    const delivery = await sendReceipt(id).catch(() => ({ receiptId: receiptData.id, status: "FAILED" }));
    return NextResponse.json({ ok: true, status: newStatus, receiptId: delivery.receiptId, emailStatus: delivery.status });
  } catch (err) {
    console.error("[verify] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
