import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
const schema = z.object({ name: z.string().trim().min(2).max(100), officialProvider: z.string().trim().min(2).max(100), instructionsTemplate: z.string().trim().min(20).max(5000), active: z.boolean().default(false) }).strict();
export async function POST(req: Request) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!can(user.role, "payment:configure")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (req.headers.get("origin") !== new URL(process.env.NEXTAUTH_URL || req.url).origin) return new Response(null, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a name, provider and instructions of at least 20 characters." }, { status: 400 });
  const last = await db.paymentMethod.findFirst({ orderBy: { displayOrder: "desc" } });
  const method = await db.paymentMethod.create({ data: { ...parsed.data, displayOrder: (last?.displayOrder ?? -1) + 1 } });
  await audit({ actorId: user.id, actorRole: user.role, objectType: "PaymentMethod", objectId: method.id, action: "CREATE", metadata: { name: method.name, active: method.active } });
  return NextResponse.json({ id: method.id, ok: true }, { status: 201 });
}
