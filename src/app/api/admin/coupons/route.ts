import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({
  code: z.string().min(3, "Code too short").max(30, "Code too long").regex(/^[A-Z0-9_-]+$/, "Code must be uppercase A-Z, 0-9, _ or -"),
  description: z.string().max(200).optional(),
  type: z.enum(["PERCENTAGE", "FLAT_USD", "FREE_SHIPPING"]),
  value: z.number().positive(),
  active: z.boolean().default(true),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  usageLimit: z.number().int().positive().optional(),
  minSubtotalUsd: z.number().positive().optional(),
});

// POST /api/admin/coupons — create coupon (A-23)
export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!can(user.role, "cms:manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
    }
    const d = parsed.data;
    const coupon = await db.coupon.create({
      data: {
        code: d.code.toUpperCase(),
        description: d.description,
        type: d.type,
        value: d.value,
        active: d.active,
        validFrom: d.validFrom ? new Date(d.validFrom) : new Date(),
        validUntil: d.validUntil ? new Date(d.validUntil) : null,
        usageLimit: d.usageLimit,
        minSubtotalUsd: d.minSubtotalUsd,
      },
    });
    await audit({
      actorId: user.id,
      actorRole: user.role,
      objectType: "Coupon",
      objectId: coupon.id,
      action: "CREATE",
      metadata: { code: coupon.code, type: coupon.type, value: coupon.value },
    });
    return NextResponse.json({ id: coupon.id, code: coupon.code });
  } catch (err) {
    console.error("[admin/coupons] POST error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// GET /api/admin/coupons — list coupons
export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!can(user.role, "cms:manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const coupons = await db.coupon.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { requests: true } } },
    });
    return NextResponse.json({ coupons });
  } catch (err) {
    console.error("[admin/coupons] GET error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
