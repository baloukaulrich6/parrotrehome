import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({
  question: z.string().min(5),
  answer: z.string().min(10),
  category: z.string().optional(),
  displayOrder: z.number().int().min(0).default(0),
  isPublished: z.boolean().default(true),
});

// POST /api/admin/faq — A-21 create FAQ entry
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
      return NextResponse.json({ error: "Invalid" }, { status: 400 });
    }
    const faq = await db.faqEntry.create({ data: parsed.data });
    await audit({
      actorId: user.id,
      actorRole: user.role,
      objectType: "FaqEntry",
      objectId: faq.id,
      action: "CREATE",
      metadata: { question: faq.question },
    });
    return NextResponse.json({ id: faq.id });
  } catch (err) {
    console.error("[admin/faq] POST error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
