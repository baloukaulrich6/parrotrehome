import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { sameOrigin } from "@/lib/seller-listings";
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser();
  if (!user) return new Response(null, { status: 401 });
  if (!sameOrigin(req)) return new Response(null, { status: 403 });
  const { id } = await params;
  try {
    const result = await db.$transaction(async tx => {
      const listing = await tx.sellerListing.findFirst({ where: { id, sellerId: user.id } });
      if (!listing) return 404;
      if (listing.status === "WITHDRAWN") return 200;
      if (listing.birdId) {
        const changed = await tx.bird.updateMany({ where: { id: listing.birdId, status: { in: ["AVAILABLE", "UNAVAILABLE"] }, reservedByRequestId: null }, data: { status: "UNAVAILABLE" } });
        if (!changed.count) return 409;
      }
      await tx.sellerListing.update({ where: { id }, data: { status: "WITHDRAWN" } });
      await tx.auditLog.create({ data: { actorId: user.id, actorRole: user.role, objectType: "SellerListing", objectId: id, action: "UPDATE", metadata: JSON.stringify({ event: "SELLER_LISTING_WITHDRAWN" }) } });
      return 200;
    });
    return NextResponse.json({ ok: result === 200, error: result === 409 ? "An order is in progress. Contact support before withdrawing." : undefined }, { status: result });
  } catch { return new Response(null, { status: 500 }); }
}
