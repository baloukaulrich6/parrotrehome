import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

// PATCH /api/admin/coupons/[id] — toggle active, edit fields
const schema = z.object({
  code: z.string().regex(/^[A-Z0-9_-]+$/).optional(),
  description: z.string().max(200).optional(),
  type: z.enum(["PERCENTAGE", "FLAT_USD", "FREE_SHIPPING"]).optional(),
  value: z.number().positive().optional(),
  active: z.boolean().optional(),
  validUntil: z.string().optional(),
  usageLimit: z.number().int().positive().optional(),
  minSubtotalUsd: z.number().positive().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!can(user.role, "cms:manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid" }, { status: 400 });
    }
    const coupon = await db.coupon.update({
      where: { id },
      data: {
        ...parsed.data,
        code: parsed.data.code?.toUpperCase(),
        validUntil: parsed.data.validUntil !== undefined
          ? (parsed.data.validUntil ? new Date(parsed.data.validUntil) : null)
          : undefined,
      },
    });
    await audit({
      actorId: user.id,
      actorRole: user.role,
      objectType: "Coupon",
      objectId: id,
      action: "UPDATE",
      metadata: { code: coupon.code, active: coupon.active },
    });
    return NextResponse.json({ id: coupon.id });
  } catch (err) {
    console.error("[admin/coupons] PATCH error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE /api/admin/coupons/[id] — soft-delete by setting active=false (preserves audit history)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!can(user.role, "cms:manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const coupon = await db.coupon.update({
      where: { id },
      data: { active: false },
    });
    await audit({
      actorId: user.id,
      actorRole: user.role,
      objectType: "Coupon",
      objectId: id,
      action: "UPDATE",
      metadata: { code: coupon.code, action: "deactivate" },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/coupons] DELETE error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
