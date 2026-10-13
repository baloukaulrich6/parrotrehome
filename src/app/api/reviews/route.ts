import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { z } from "zod";

// POST /api/reviews
// F-10: Verified reviews — only customers with a COMPLETED request can
// leave a review for that specific request (1 review per request).

const schema = z.object({
  requestId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(3, "Title is too short").max(120),
  body: z.string().min(10, "Review body is too short").max(2000),
});

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    if (user.role !== "CLIENT") {
      return NextResponse.json({ error: "Only clients can leave reviews." }, { status: 403 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid" },
        { status: 400 }
      );
    }

    const { requestId, rating, title, body: reviewBody } = parsed.data;

    // Verify the request belongs to this user AND is COMPLETED
    const request = await db.request.findUnique({ where: { id: requestId } });
    if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    if (request.customerId !== user.id) {
      return NextResponse.json({ error: "Forbidden — you can only review your own request." }, { status: 403 });
    }
    if (request.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Reviews are only available for completed requests." },
        { status: 400 }
      );
    }

    // Check no existing review (1 review per request)
    const existing = await db.review.findUnique({ where: { requestId } });
    if (existing) {
      return NextResponse.json(
        { error: "You have already reviewed this request." },
        { status: 409 }
      );
    }

    // Create review in PENDING_MODERATION state
    const review = await db.review.create({
      data: {
        requestId,
        customerId: user.id,
        customerName: user.name ?? user.email,
        rating,
        title,
        body: reviewBody,
        status: "PENDING_MODERATION",
      },
    });

    await audit({
      actorId: user.id,
      actorRole: user.role,
      objectType: "Review",
      objectId: review.id,
      action: "CREATE",
      metadata: { requestId, rating, title },
    });

    return NextResponse.json({
      id: review.id,
      status: review.status,
      message: "Review submitted for moderation. It will appear once an admin approves it.",
    });
  } catch (err) {
    console.error("[reviews] POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}

// GET /api/reviews — public list of PUBLISHED reviews
export async function GET() {
  const reviews = await db.review.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({ reviews });
}
