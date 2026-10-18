import Link from "next/link";
export function PolicyLinks() {
  return <nav aria-label="Purchase policies" className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-forest">
    <Link href="/cms/sellers" className="underline">Seller terms</Link><Link href="/policies" className="underline">All policies</Link><Link href="/cms/terms" className="underline">Terms of service</Link><Link href="/cms/payment" className="underline">Payment</Link><Link href="/cms/refunds" className="underline">Refunds &amp; cancellations</Link><Link href="/cms/delivery" className="underline">Locations &amp; delivery</Link><Link href="/cms/privacy" className="underline">Privacy</Link><Link href="/cms/cookies" className="underline">Cookies</Link>
  </nav>;
}
