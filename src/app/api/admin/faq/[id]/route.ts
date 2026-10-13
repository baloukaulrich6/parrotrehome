import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({
  question: z.string().min(5).optional(),
  answer: z.string().min(10).optional(),
  category: z.string().optional(),
  displayOrder: z.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
});

// PUT /api/admin/faq/[id] — A-21 update FAQ entry
export async function PUT(
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
    const faq = await db.faqEntry.update({
      where: { id },
      data: parsed.data,
    });
    await audit({
      actorId: user.id,
      actorRole: user.role,
      objectType: "FaqEntry",
      objectId: faq.id,
      action: "UPDATE",
      metadata: { question: faq.question },
    });
    return NextResponse.json({ id: faq.id });
  } catch (err) {
    console.error("[admin/faq] PUT error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE /api/admin/faq/[id] — A-21 delete FAQ entry
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
    await db.faqEntry.delete({ where: { id } });
    await audit({
      actorId: user.id,
      actorRole: user.role,
      objectType: "FaqEntry",
      objectId: id,
      action: "DELETE",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/faq] DELETE error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
