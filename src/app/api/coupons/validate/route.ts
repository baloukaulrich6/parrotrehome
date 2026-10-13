import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

// POST /api/coupons/validate
// Public endpoint — validates a coupon code and returns the discount for a given subtotal.
// Does NOT mark the coupon as used (that happens when the request is submitted).

const schema = z.object({
  code: z.string().min(3).max(30).regex(/^[A-Z0-9_-]+$/i, "Invalid code format"),
  subtotalUsd: z.number().positive(),
});

export async function POST(req: Request) {
  try {
    // Rate limit: 10 attempts per 10 minutes per IP (prevents coupon brute-force)
    const rl = checkRateLimit(req, "COUPON_VALIDATE");
    if (!rl.ok && rl.response) return rl.response;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
    }
    const code = parsed.data.code.toUpperCase();
    const subtotal = parsed.data.subtotalUsd;

    const coupon = await db.coupon.findUnique({ where: { code } });
    if (!coupon) {
      return NextResponse.json({ valid: false, error: "Coupon not found." }, { status: 404 });
    }
    if (!coupon.active) {
      return NextResponse.json({ valid: false, error: "This coupon is no longer active." }, { status: 400 });
    }
    if (coupon.validFrom && new Date(coupon.validFrom) > new Date()) {
      return NextResponse.json({ valid: false, error: "This coupon is not yet valid." }, { status: 400 });
    }
    if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) {
      return NextResponse.json({ valid: false, error: "This coupon has expired." }, { status: 400 });
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json({ valid: false, error: "This coupon has reached its usage limit." }, { status: 400 });
    }
    if (coupon.minSubtotalUsd && subtotal < coupon.minSubtotalUsd) {
      return NextResponse.json({
        valid: false,
        error: `Subtotal must be at least $${coupon.minSubtotalUsd.toFixed(2)} to use this coupon.`,
      }, { status: 400 });
    }

    // Compute discount
    let discountUsd = 0;
    let freeShipping = false;
    if (coupon.type === "PERCENTAGE") {
      discountUsd = (subtotal * coupon.value) / 100;
      // Cap at subtotal
      discountUsd = Math.min(discountUsd, subtotal);
    } else if (coupon.type === "FLAT_USD") {
      discountUsd = Math.min(coupon.value, subtotal);
    } else if (coupon.type === "FREE_SHIPPING") {
      freeShipping = true;
    }

    return NextResponse.json({
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      description: coupon.description,
      discountUsd,
      freeShipping,
      finalTotalUsd: subtotal - discountUsd,
    });
  } catch (err) {
    console.error("[coupons/validate] error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
