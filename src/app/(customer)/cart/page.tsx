"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-store";
import { formatUsd } from "@/lib/constants";
import { CouponInput } from "@/components/parrotrehome/coupon-input";
import { Trash2, Minus, Plus, ShoppingCart, ArrowRight, ShieldCheck } from "lucide-react";

interface CouponResult {
  valid: boolean;
  couponId?: string;
  code?: string;
  discountUsd?: number;
  freeShipping?: boolean;
  finalTotalUsd?: number;
}

export default function CartPage() {
  const cart = useCart();
  const router = useRouter();
  const items = cart.items;
  const subtotal = items.reduce((s, i) => s + i.priceUsd * i.qty, 0);
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null);

  const discount = couponResult?.discountUsd ?? 0;
  const finalTotal = couponResult?.finalTotalUsd ?? subtotal;

  if (items.length === 0) {
    return (
      <div className="bg-ivory min-h-[60vh]">
        <section className="bg-white border-b border-feather/20 py-12">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <p className="eyebrow mb-3">Your request cart</p>
            <h1 className="display-heading text-slate text-[36px] lg:text-[44px] mb-4">
              Your cart is empty
            </h1>
            <p className="text-feather text-[15px] font-body max-w-md mx-auto mb-8">
              Browse parrots, cages &amp; supplies, or book an avian advice
              session. Add items to your cart — no payment is collected on this
              site.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/parrots" className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-tail-red hover:bg-tail-red-dark text-white text-[14px] font-body font-semibold transition-colors">
                Explore parrots <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/supplies" className="inline-flex items-center gap-2 h-11 px-6 rounded-full border border-slate/30 hover:bg-slate/5 text-slate text-[14px] font-body font-semibold transition-colors">
                Browse supplies
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  function handleCouponApply(result: CouponResult | null) {
    setCouponResult(result);
  }

  return (
    <div className="bg-ivory min-h-[60vh]">
      <section className="bg-white border-b border-feather/20 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="eyebrow mb-2">Request cart</p>
          <h1 className="display-heading text-slate text-[28px] lg:text-[36px]">
            Your request cart
          </h1>
          <p className="text-feather text-[14px] font-body mt-2">
            {items.length} {items.length === 1 ? "item" : "items"} · subtotal{" "}
            <strong className="text-slate">{formatUsd(subtotal)}</strong>
            {couponResult?.valid && couponResult.discountUsd ? (
              <span className="text-forest"> · you save {formatUsd(discount)}</span>
            ) : null}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Items list */}
          <div className="lg:col-span-8 space-y-3">
            {items.map((item) => (
              <div
                key={item.refId}
                className="bg-white rounded-xl border border-feather/20 p-4 flex gap-4"
              >
                <div className="h-20 w-20 flex-shrink-0 rounded-md overflow-hidden bg-feather/10">
                  {item.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-body text-feather uppercase tracking-wide">
                        {item.type === "BIRD" ? "Parrot (individual)" : item.type === "PRODUCT" ? "Accessory" : "Consultation"}
                      </p>
                      <h3 className="font-heading text-slate text-[16px] font-semibold leading-tight">
                        {item.name}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => cart.remove(item.refId)}
                      className="text-feather hover:text-tail-red focus-ring rounded p-1"
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    {/* Quantity stepper */}
                    {item.type === "PRODUCT" ? (
                      <div className="inline-flex items-center border border-feather/30 rounded-md bg-ivory">
                        <button
                          type="button"
                          onClick={() => cart.updateQty(item.refId, item.qty - 1)}
                          className="h-8 w-8 flex items-center justify-center text-slate hover:bg-feather/10 focus-ring"
                          aria-label={`Decrease ${item.name} quantity`}
                        >
                          <Minus className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        <span className="w-10 text-center text-[14px] font-body font-semibold text-slate">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => cart.updateQty(item.refId, item.qty + 1)}
                          className="h-8 w-8 flex items-center justify-center text-slate hover:bg-feather/10 focus-ring"
                          aria-label={`Increase ${item.name} quantity`}
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[12px] font-body text-feather italic">
                        {item.type === "BIRD" ? "1 of 1 — unique individual" : "1 session"}
                      </span>
                    )}
                    <div className="text-right">
                      <p className="text-[13px] font-body text-feather">
                        {formatUsd(item.priceUsd)} × {item.qty}
                      </p>
                      <p className="font-heading text-slate text-[16px] font-bold">
                        {formatUsd(item.priceUsd * item.qty)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Coupon input */}
            <CouponInput subtotal={subtotal} onApply={handleCouponApply} />

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => cart.clear()}
                className="text-[13px] font-body text-feather hover:text-tail-red focus-ring rounded"
              >
                Clear all items
              </button>
              <Link href="/parrots" className="text-[13px] font-body text-tail-red hover:underline font-semibold">
                Continue browsing
              </Link>
            </div>
          </div>

          {/* Summary + checkout */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-xl border border-feather/20 p-6 sticky top-24">
              <h2 className="font-heading text-slate text-[18px] font-semibold mb-4 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-feather" aria-hidden /> Order summary
              </h2>
              <dl className="space-y-2 text-[14px] font-body">
                <div className="flex justify-between">
                  <dt className="text-feather">Items ({items.length})</dt>
                  <dd className="text-slate font-semibold">{formatUsd(subtotal)}</dd>
                </div>
                {couponResult?.valid && couponResult.discountUsd ? (
                  <div className="flex justify-between text-forest">
                    <dt>Discount ({couponResult.code})</dt>
                    <dd className="font-semibold">−{formatUsd(discount)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <dt className="text-feather">Estimated shipping</dt>
                  <dd className="text-slate">{couponResult?.freeShipping ? <span className="text-forest font-semibold">FREE</span> : "Quoted by agent"}</dd>
                </div>
              </dl>
              <div className="border-t border-feather/15 my-4" />
              <div className="flex justify-between items-baseline">
                <span className="text-slate font-heading text-[16px] font-semibold">
                  {couponResult?.valid ? "Final total" : "Estimated total"}
                </span>
                <span className="font-heading text-slate text-[22px] font-bold">
                  {formatUsd(finalTotal)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  // Pass coupon data to request form via sessionStorage
                  if (couponResult?.valid) {
                    sessionStorage.setItem("parrotrehome-coupon", JSON.stringify({
                      couponId: couponResult.couponId,
                      code: couponResult.code,
                      discountUsd: couponResult.discountUsd,
                      finalTotalUsd: couponResult.finalTotalUsd,
                    }));
                  } else {
                    sessionStorage.removeItem("parrotrehome-coupon");
                  }
                  router.push("/request");
                }}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-tail-red hover:bg-tail-red-dark text-white text-[14px] font-body font-semibold transition-colors focus-ring shadow-sm"
              >
                Submit request <ArrowRight className="h-4 w-4" />
              </button>
              <div className="mt-4 p-3 bg-forest/5 border border-forest/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-forest flex-shrink-0 mt-0.5" aria-hidden />
                  <p className="text-[12px] font-body text-slate leading-relaxed">
                    <strong>No payment collected here.</strong> An identified agent
                    will reach out with secure, traceable payment instructions.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

