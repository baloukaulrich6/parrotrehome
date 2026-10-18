import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { canReviewSellers, sameOrigin } from "@/lib/seller-listings";
const schema = z.discriminatedUnion("decision", [z.object({ decision: z.literal("APPROVE"), coordinatesVerified: z.literal(true) }).strict(), z.object({ decision: z.literal("REJECT"), note: z.string().trim().min(5).max(1000) }).strict()]);
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser();
  if (!user) return new Response(null, { status: 401 });
  if (!canReviewSellers(user.role) || !sameOrigin(req)) return new Response(null, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Verify contact and payout details before approval, or give a rejection reason." }, { status: 400 });
  const { id } = await params;
  const decision = parsed.data;
  const result = await db.$transaction(async tx => {
    const listing = await tx.sellerListing.findUnique({ where: { id }, include: { seller: { select: { status: true } } } });
    if (!listing) return { status: 404 };
    if (listing.seller.status !== "ACTIVE") return { status: 409 };
    const changed = await tx.sellerListing.updateMany({ where: { id, status: "PENDING", birdId: null }, data: { status: decision.decision === "APPROVE" ? "APPROVED" : "REJECTED", reviewedById: user.id, reviewedAt: new Date(), reviewNote: decision.decision === "REJECT" ? decision.note : null } });
    if (!changed.count) return { status: 409 };
    let birdId: string | null = null;
    if (decision.decision === "APPROVE") {
      const bird = await tx.bird.create({ data: { species: listing.species, commonName: listing.title, ageYears: listing.ageYears, priceUsd: listing.priceUsd, location: listing.location, shortDescription: listing.description.slice(0, 200), longDescription: listing.description, photos: listing.photos, status: "AVAILABLE" } });
      birdId = bird.id;
      await tx.sellerListing.update({ where: { id }, data: { birdId } });
    }
    await tx.auditLog.create({ data: { actorId: user.id, actorRole: user.role, objectType: "SellerListing", objectId: id, action: "UPDATE", metadata: JSON.stringify({ event: decision.decision === "APPROVE" ? "SELLER_APPROVED_COORDINATES_CHECKED" : "SELLER_REJECTED", birdId }) } });
    return { status: 200, birdId };
  });
  return NextResponse.json({ birdId: result.birdId }, { status: result.status });
}
