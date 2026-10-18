import { publicContent } from "@/lib/public-content";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { listingSchema, sameOrigin } from "@/lib/seller-listings";
import { rateLimit } from "@/lib/rate-limit";
export async function POST(req: Request) {
  const user = await getServerUser();
  if (!user) return new Response(null, { status: 401 });
  if (!sameOrigin(req)) return new Response(null, { status: 403 });
  if (!rateLimit(`seller-submit:${user.id}`, 10, 3600000).ok) return new Response(null, { status: 429 });
  const parsed = listingSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid listing" }, { status: 400 });
  const { consent, photos, ...data } = parsed.data;
  if (await db.sellerUpload.count({ where: { userId: user.id, url: { in: photos } } }) !== photos.length) return NextResponse.json({ error: "Upload your own listing photos first." }, { status: 400 });
  const policy = await publicContent("sellers");
  if (!policy) return NextResponse.json({ error: "Seller terms unavailable. Contact support." }, { status: 409 });
  const listing = await db.$transaction(async tx => {
    const created = await tx.sellerListing.create({ data: { ...data, photos: JSON.stringify(photos), sellerId: user.id } });
    const preference = await tx.accountPreference.findUnique({ where: { userId: user.id } });
    await tx.accountPreference.upsert({ where: { userId: user.id }, create: { userId: user.id, intent: "BOTH" }, update: { intent: preference?.intent === "SELL" ? "SELL" : "BOTH" } });
    await tx.auditLog.create({ data: { actorId: user.id, actorRole: user.role, objectType: "SellerListing", objectId: created.id, action: "CREATE", metadata: JSON.stringify({ event: "SELLER_LISTING_SUBMITTED", policyVersion: policy.version, policyDigest: createHash("sha256").update(policy.body).digest("hex") }) } });
    return created;
  });
  return NextResponse.json({ id: listing.id, status: listing.status }, { status: 201 });
}
