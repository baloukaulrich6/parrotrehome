import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canTransition } from "@/lib/constants";
import { z } from "zod";

// POST /api/requests/[id]/select-method
// Customer selects a payment method (F-23).
// T-03: does NOT mark paid; just notifies the agent.

const schema = z.object({
  paymentMethodId: z.string().min(1),
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

    const request = await db.request.findUnique({
      where: { id },
      include: { selectedPaymentMethod: true },
    });
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // T-05: ownership check — clients can select method if customerId matches OR email matches (guest linking)
    if (user.role === "CLIENT") {
      const isOwner = request.customerId === user.id || request.customerEmail.toLowerCase() === user.email.toLowerCase();
      if (!isOwner) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (request.status !== "PENDING_REVIEW") {
      return NextResponse.json(
        { error: `Cannot select payment method in status ${request.status}` },
        { status: 400 }
      );
    }

    const method = await db.paymentMethod.findUnique({
      where: { id: parsed.data.paymentMethodId },
    });
    if (!method || !method.active) {
      return NextResponse.json(
        { error: "Selected payment method is not available." },
        { status: 400 }
      );
    }

    const newStatus = "AWAITING_INSTRUCTIONS";
    if (!canTransition(request.status, newStatus)) {
      return NextResponse.json(
        { error: `Invalid transition ${request.status} → ${newStatus}` },
        { status: 400 }
      );
    }

    await db.request.update({
      where: { id },
      data: {
        status: newStatus,
        selectedPaymentMethodId: method.id,
      },
    });

    await audit({
      actorId: user.id,
      actorRole: user.role,
      objectType: "Request",
      objectId: id,
      action: "STATUS_CHANGE",
      changes: { from: request.status, to: newStatus, paymentMethod: method.name },
    });

    // Agent notification (F-24)
    if (request.agentId) {
      await db.message.create({
        data: {
          requestId: id,
          senderId: user.id,
          senderRole: "system",
          template: "agent-notification-payment-selected",
          channel: "IN_APP",
          toAddress: "agents@parrotrehome.com",
          fromAddress: "no-reply@parrotrehome.com",
          subject: `Customer selected ${method.name} for ${request.reference}`,
          body: `Customer ${request.customerName} selected payment method "${method.name}" for request ${request.reference}. Please prepare secure payment instructions.`,
          deliveryStatus: "SENT",
        },
      });
    }

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (err) {
    console.error("[select-method] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
