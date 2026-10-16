import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({
  active: z.boolean().optional(),
  name: z.string().trim().min(2).max(100).optional(),
  officialProvider: z.string().trim().min(2).max(100).optional(),
  instructionsTemplate: z.string().trim().min(20).max(5000).optional(),
}).refine((value) => Object.keys(value).length > 0);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!can(user.role, "payment:configure")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (req.headers.get("origin") !== new URL(process.env.NEXTAUTH_URL || req.url).origin) return new Response(null, { status: 403 });
    const { id } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid" }, { status: 400 });
    }
    const method = await db.paymentMethod.update({
      where: { id },
      data: parsed.data,
    });
    await audit({
      actorId: user.id,
      actorRole: user.role,
      objectType: "PaymentMethod",
      objectId: id,
      action: "UPDATE",
      changes: { active: parsed.data.active, name: method.name },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
