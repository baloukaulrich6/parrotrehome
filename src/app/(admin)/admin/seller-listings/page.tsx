import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/staff-page";
import { canReviewSellers } from "@/lib/seller-listings";
import { SellerReview } from "@/components/admin/seller-review";
import { parsePhotos } from "@/lib/photo-data";
import { formatBirdAge } from "@/lib/bird-age";
export const metadata = { title: "Seller listings — review" };
export default async function SellerListings({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireStaffPage(); if (!canReviewSellers(user.role)) redirect("/admin");
  const { status } = await searchParams;
  const selected = ["PENDING", "APPROVED", "REJECTED", "WITHDRAWN"].includes(status || "") ? status! : "PENDING";
  const listings = await db.sellerListing.findMany({ where: { status: selected }, include: { seller: { select: { email: true, status: true } } }, orderBy: { createdAt: "desc" }, take: 50 });
  return <section className="space-y-5"><h1 className="font-heading text-3xl">Seller listing verification</h1><p>Check identity/contact details, lawful ownership, photos and proposed payout recipient before publishing. Approval does not transfer funds or guarantee veterinary health.</p><nav className="flex flex-wrap gap-4">{["PENDING", "APPROVED", "REJECTED", "WITHDRAWN"].map(state => <Link className="underline" key={state} href={`/admin/seller-listings?status=${state}`}>{state}</Link>)}</nav>{!listings.length && <p>No listings in this status.</p>}{listings.map(listing => <article key={listing.id} className="border rounded-xl bg-white p-5 space-y-4"><h2 className="font-heading text-xl">{listing.title} · {listing.status}</h2><p>{listing.species} · {formatBirdAge(listing.ageYears)} · ${listing.priceUsd.toFixed(2)} · {listing.location}</p><p className="whitespace-pre-wrap">{listing.description}</p><div className="flex flex-wrap gap-3">{parsePhotos(listing.photos).map((photo, index) => <img key={photo} src={photo} alt={`Seller photo ${index + 1}`} className="h-32 w-32 rounded object-cover" />)}</div><div className="rounded bg-ivory p-4 space-y-2"><h3 className="font-semibold">Private verification / payout details</h3><p>{listing.contactName} · {listing.seller.email} · {listing.contactPhone}</p><p>{listing.contactAddress}</p><p>Public WhatsApp contact: {listing.publicPhone || "Not provided — private telephone will not be published"}</p><p>Payout preference: {listing.payoutMethod} · {listing.payoutRecipient}</p><p>Account status: {listing.seller.status}</p></div>{listing.reviewNote && <p>Review note: {listing.reviewNote}</p>}{listing.status === "PENDING" && <SellerReview id={listing.id} />}{listing.birdId && <Link href={`/parrots/${listing.birdId}`} className="underline">Public catalog record</Link>}</article>)}</section>;
}
