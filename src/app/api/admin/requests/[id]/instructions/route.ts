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
import { z } from "zod";

// POST /api/admin/requests/[id]/instructions
// A-07 + T-04: Create approved instructions + secure time-limited link.
// Only an authorized agent can publish; expiration is effectively controlled.

const schema = z.object({
  body: z.string().min(20, "Instructions body is too short").max(5000),
  expiresHours: z.number().int().min(1).max(168),
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

    if (request.status !== "AWAITING_INSTRUCTIONS") {
      return NextResponse.json(
        { error: `Cannot create instructions in status ${request.status}` },
        { status: 400 }
      );
    }
    if (!request.selectedPaymentMethod) {
      return NextResponse.json(
        { error: "Customer has not selected a payment method yet" },
        { status: 400 }
      );
    }

    const newStatus = "INSTRUCTIONS_SENT";
    if (!canTransition(request.status, newStatus)) {
      return NextResponse.json({ error: "Invalid transition" }, { status: 400 });
    }

    // T-04: generate non-guessable secure link hash
    const secureLinkHash = generateSecureLinkHash();
    const expiryAt = new Date(Date.now() + parsed.data.expiresHours * 60 * 60 * 1000);

    // Revoke any previous active instructions
    await db.paymentInstruction.updateMany({
      where: { requestId: id, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: new Date() },
    });

    // Create new instruction
    const instruction = await db.paymentInstruction.create({
      data: {
        requestId: id,
        agentId: user.id,
        secureLinkHash,
        body: parsed.data.body,
        expiryAt,
        status: "ACTIVE",
        version: 1,
      },
    });

    // Update request status
    await db.request.update({
      where: { id },
      data: { status: newStatus, instructionsSentAt: new Date() },
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
    const host = req.headers.get("origin") ?? "https://parrotrehome.com";
    const secureLink = buildSecureInstructionsLink(host, secureLinkHash);
    const emailPayload = buildInstructionsReadyEmail({
      reference: request.reference,
      customerName: request.customerName,
      customerEmail: request.customerEmail,
      agentName: user.name ?? "ParrotRehome Agent",
      agentRole: user.role.replace(/_/g, " ").toLowerCase(),
      secureLink,
      expiryAt,
    });
    emailPayload.requestId = id;
    await sendEmail(emailPayload);

    return NextResponse.json({
      ok: true,
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
