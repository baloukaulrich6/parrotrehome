import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canTransition } from "@/lib/constants";
import { z } from "zod";

// POST /api/requests/[id]/deposit-reference
// Customer deposits a payment reference (F-26).
// T-06: this does NOT mark paid; just transitions to PAYMENT_TO_VERIFY.

const schema = z.object({
  reference: z.string().min(3, "Reference too short").max(200, "Reference too long"),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
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

    const request = await db.request.findUnique({ where: { id } });
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // T-05: ownership check — clients can deposit reference if customerId matches OR email matches
    if (user.role === "CLIENT") {
      const isOwner = request.customerId === user.id || request.customerEmail.toLowerCase() === user.email.toLowerCase();
      if (!isOwner) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Only allowed when instructions have been sent
    if (!["INSTRUCTIONS_SENT", "PAYMENT_TO_VERIFY"].includes(request.status)) {
      return NextResponse.json(
        { error: `Cannot deposit reference in status ${request.status}` },
        { status: 400 }
      );
    }

    const newStatus = "PAYMENT_TO_VERIFY";
    if (request.status !== newStatus && !canTransition(request.status, newStatus)) {
      // Allow staying in PAYMENT_TO_VERIFY for re-deposit
      return NextResponse.json(
        { error: `Invalid transition ${request.status} → ${newStatus}` },
        { status: 400 }
      );
    }

    await db.request.update({
      where: { id },
      data: {
        status: newStatus,
        paymentReference: parsed.data.reference,
      },
    });

    await audit({
      actorId: user.id,
      actorRole: user.role,
      objectType: "Request",
      objectId: id,
      action: "STATUS_CHANGE",
      changes: {
        from: request.status,
        to: newStatus,
        reference: parsed.data.reference,
      },
    });

    // Notify agent
    await db.message.create({
      data: {
        requestId: id,
        senderId: user.id,
        senderRole: "system",
        template: "agent-notification-reference-deposited",
        channel: "IN_APP",
        toAddress: "agents@parrotrehome.com",
        fromAddress: "no-reply@parrotrehome.com",
        subject: `Reference deposited for ${request.reference}`,
        body: `Customer deposited a payment reference for ${request.reference}: "${parsed.data.reference}". Please verify with the official provider and mark Paid - verified.`,
        deliveryStatus: "SENT",
      },
    });

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (err) {
    console.error("[deposit-reference] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
