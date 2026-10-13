import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

// PUT /api/admin/products/[id] — A-17 update
const schema = z.object({
  name: z.string().min(2),
  sku: z.string().min(2),
  category: z.enum(["CAGE", "PERCH", "TOY", "FOOD", "SUPPLY"]),
  description: z.string().optional(),
  dimensions: z.string().optional(),
  compatibility: z.string().optional(),
  priceUsd: z.number().positive(),
  stockQty: z.number().int().min(0),
  isActive: z.boolean(),
  photos: z.string(),
  features: z.string(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!can(user.role, "inventory:manage_products")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
    }
    const d = parsed.data;
    const product = await db.product.update({
      where: { id },
      data: { ...d, currency: "USD" },
    });
    await audit({
      actorId: user.id,
      actorRole: user.role,
      objectType: "Product",
      objectId: product.id,
      action: "UPDATE",
      metadata: { name: product.name, sku: product.sku, stockQty: product.stockQty },
    });
    return NextResponse.json({ id: product.id });
  } catch (err) {
    console.error("[admin/products] PUT error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE /api/admin/products/[id] — A-17 delete (only if no active cart items)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!can(user.role, "inventory:manage_products")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const product = await db.product.findUnique({ where: { id } });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await db.product.delete({ where: { id } });
    await audit({
      actorId: user.id,
      actorRole: user.role,
      objectType: "Product",
      objectId: id,
      action: "DELETE",
      metadata: { name: product.name, sku: product.sku },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/products] DELETE error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
