import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({
  active: z.boolean(),
});

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
    const { id } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid" }, { status: 400 });
    }
    const method = await db.paymentMethod.update({
      where: { id },
      data: { active: parsed.data.active },
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
