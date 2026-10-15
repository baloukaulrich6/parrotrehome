import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";
import {
  sendEmail,
  buildInstructionsReadyEmail,
  generateSecureLinkHash,
  buildSecureInstructionsLink,
} from "@/lib/email";
import { canTransition } from "@/lib/constants";
import { paymentExpiry } from "@/lib/payment-window";
import { z } from "zod";

// POST /api/admin/requests/[id]/instructions
// A-07 + T-04: Create approved instructions + secure time-limited link.
// Only an authorized agent can publish; expiration is effectively controlled.

const schema = z.object({
  paymentMethodId: z.string().min(1).optional(),
  body: z.string().min(20, "Instructions body is too short").max(5000),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!can(user.role, "payment:prepare_instructions")) {
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

    const request = await db.request.findUnique({
      where: { id },
      include: { selectedPaymentMethod: true },
    });
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // RBAC: agents only on their assigned dossiers
    if (user.role === "AGENT" && request.agentId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!["RECEIVED", "PENDING_REVIEW", "AWAITING_INSTRUCTIONS", "INSTRUCTIONS_SENT"].includes(request.status)) {
      return NextResponse.json(
        { error: `Cannot create instructions in status ${request.status}` },
        { status: 400 }
      );
    }
    const paymentMethod = await db.paymentMethod.findFirst({ where: { id: parsed.data.paymentMethodId || request.selectedPaymentMethodId || "", active: true } });
    if (!paymentMethod) return NextResponse.json({ error: "Choose an active payment method before sending instructions." }, { status: 400 });

    const newStatus = "INSTRUCTIONS_SENT";
    if (request.status !== newStatus && !canTransition(request.status, newStatus)) {
      return NextResponse.json({ error: "Invalid transition" }, { status: 400 });
    }

    // T-04: generate non-guessable secure link hash
    const secureLinkHash = generateSecureLinkHash();
    const expiryAt = paymentExpiry();

    // Publish a new version and revoke the old link atomically.
    const instruction = await db.$transaction(async (tx) => {
      if (!await tx.paymentMethod.findFirst({ where: { id: paymentMethod.id, active: true } })) throw new Error("Payment method was disabled. Please refresh.");
      const changed = await tx.request.updateMany({
        where: { id, status: request.status, selectedPaymentMethodId: request.selectedPaymentMethodId },
        data: { status: newStatus, selectedPaymentMethodId: paymentMethod.id, instructionsSentAt: new Date() },
      });
      if (changed.count !== 1) throw new Error("Request changed. Refresh before sending instructions.");
      const previous = await tx.paymentInstruction.findFirst({
        where: { requestId: id }, orderBy: { version: "desc" },
      });
      await tx.paymentInstruction.updateMany({
        where: { requestId: id, status: "ACTIVE" },
        data: { status: "REVOKED", revokedAt: new Date() },
      });
      return tx.paymentInstruction.create({ data: {
        requestId: id, agentId: user.id, secureLinkHash,
        body: parsed.data.body, expiryAt, status: "ACTIVE",
        version: (previous?.version ?? 0) + 1,
      } });
    });

    // Audit (A-11)
    await auditLog.instructionSend(
      user.id,
      user.role,
      id,
      instruction.id,
      expiryAt
    );
    await auditLog.requestStatusChange(
      user.id,
      user.role,
      id,
      request.status,
      newStatus,
      { instructionId: instruction.id }
    );

    // Send agent-signed email to customer (F-25 / Message Agent Official)
    const host = process.env.NEXTAUTH_URL || new URL(req.url).origin;
    const secureLink = buildSecureInstructionsLink(host, secureLinkHash);
    const emailPayload = buildInstructionsReadyEmail({
      reference: request.reference,
      customerName: request.customerName,
      customerEmail: request.customerEmail,
      agentName: user.name ?? "ParrotRehome Agent",
      agentRole: user.role.replace(/_/g, " ").toLowerCase(),
      secureLink,
      expiryAt,
      paymentMethodName: paymentMethod.name,
      totalUsd: request.totalQuoteUsd == null ? null : Number(request.finalTotalUsd ?? request.totalQuoteUsd),
    });
    emailPayload.requestId = id;
    emailPayload.eventId = instruction.id;
    const delivery = await sendEmail(emailPayload);

    return NextResponse.json({
      ok: true,
      emailStatus: delivery.status,
      instructionId: instruction.id,
      secureLink,
      expiresAt: expiryAt.toISOString(),
    });
  } catch (err) {
    console.error("[instructions] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
