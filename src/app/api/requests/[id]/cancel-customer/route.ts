import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { z } from "zod";

// POST /api/requests/[id]/cancel-customer
// F-27: Customer cancels their own pending request within policy.
// Allowed only BEFORE payment verification (PAID_VERIFIED).
// After that, must contact support.

const schema = z.object({
  reason: z.string().min(5, "Please provide a brief reason").max(500),
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
      include: { items: { include: { bird: true } }, appointments: true },
    });
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // T-05: ownership check — clients can cancel if:
    //  - customerId matches their user ID, OR
    //  - customerEmail matches their account email (covers guest-to-account linking)
    if (user.role === "CLIENT") {
      const isOwner = request.customerId === user.id || request.customerEmail.toLowerCase() === user.email.toLowerCase();
      if (!isOwner) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Policy: customer can only cancel before payment verification
    const cancellableStatuses = [
      "RECEIVED",
      "PENDING_REVIEW",
      "AWAITING_INSTRUCTIONS",
      "INSTRUCTIONS_SENT",
      "PAYMENT_TO_VERIFY",
    ];
    if (!cancellableStatuses.includes(request.status)) {
      return NextResponse.json(
        {
          error:
            "Your request is past the cancellation threshold. Please contact support to proceed.",
        },
        { status: 400 }
      );
    }

    await db.$transaction(async (tx) => {
      await tx.request.update({
        where: { id },
        data: {
          status: "CANCELED",
          cancelReason: `[Customer] ${parsed.data.reason}`,
          canceledAt: new Date(),
        },
      });
      // Release reserved birds
      const birdIds = request.items
        .filter((i) => i.bird && i.bird.status === "RESERVED" && i.bird.reservedByRequestId === id)
        .map((i) => i.birdId)
        .filter(Boolean) as string[];
      for (const bid of birdIds) {
        await tx.bird.update({
          where: { id: bid },
          data: { status: "AVAILABLE", reservedByRequestId: null, reservedUntil: null },
        });
      }
      // Cancel any appointments
      await tx.appointment.updateMany({
        where: { requestId: id, status: { in: ["REQUESTED", "CONFIRMED"] } },
        data: { status: "CANCELED" },
      });
    });

    await audit({
      actorId: user.id,
      actorRole: user.role,
      objectType: "Request",
      objectId: id,
      action: "STATUS_CHANGE",
      changes: { from: request.status, to: "CANCELED", reason: parsed.data.reason, by: "customer" },
    });

    return NextResponse.json({ ok: true, status: "CANCELED" });
  } catch (err) {
    console.error("[cancel-customer] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
