import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

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

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!can(user.role, "inventory:manage_products")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
    }
    const d = parsed.data;
    const product = await db.product.create({
      data: {
        ...d,
        currency: "USD",
      },
    });
    await audit({
      actorId: user.id,
      actorRole: user.role,
      objectType: "Product",
      objectId: product.id,
      action: "CREATE",
      metadata: { name: product.name, sku: product.sku },
    });
    return NextResponse.json({ id: product.id });
  } catch (err) {
    console.error("[admin/products] POST error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
