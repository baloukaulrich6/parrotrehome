import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { SellerForm } from "@/components/parrotrehome/seller-form";
import { WithdrawListing } from "@/components/parrotrehome/withdraw-listing";
export const metadata = { title: "Sell a parrot — seller listings" };
export default async function SellPage() {
  const user = await getServerUser();
  if (!user) redirect("/sign-in?callbackUrl=/sell");
  const listings = await db.sellerListing.findMany({ where: { sellerId: user.id }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, title: true, status: true, birdId: true, reviewNote: true } });
  return <section className="max-w-4xl mx-auto px-4 py-10 space-y-6"><h1 className="font-heading text-3xl">Sell through ParrotRehome</h1><p className="text-feather">Submit a listing for staff review. Contact and seller payout details stay private. Only approved listings appear in the public parrot catalog.</p><Link href="/cms/sellers" className="underline text-forest">Seller terms and verification process</Link><div className="space-y-3"><h2 className="font-heading text-xl">My listings</h2>{listings.length ? listings.map(listing => <article key={listing.id} className="rounded-xl border bg-white p-4 space-y-2"><h3 className="font-semibold">{listing.title}</h3><p className="text-sm">Status: {listing.status}</p>{listing.reviewNote && <p className="text-sm">Review note: {listing.reviewNote}</p>}{listing.birdId && listing.status === "APPROVED" && <Link className="underline text-sm" href={`/parrots/${listing.birdId}`}>View public listing</Link>}{listing.status !== "WITHDRAWN" && <WithdrawListing id={listing.id} />}</article>) : <p>No submitted listings yet.</p>}</div><SellerForm name={user.name || ""} /></section>;
}
