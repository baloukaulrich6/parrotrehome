import { contentPages } from "@/lib/policy-content";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

// PUT /api/admin/cms/[slug] — A-21 update CMS page
const schema = z.object({
  title: z.string().min(2),
  body: z.string().min(10),
  isPublished: z.boolean(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!can(user.role, "cms:manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (req.headers.get("origin") !== new URL(process.env.NEXTAUTH_URL || req.url).origin) return new Response(null, { status: 403 });
    const { slug } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid" }, { status: 400 });
    }
    if (!Object.hasOwn(contentPages, slug) && !await db.cmsPage.findUnique({ where: { slug } })) return NextResponse.json({ error: "Page not found" }, { status: 404 });
    const page = await db.cmsPage.upsert({ where: { slug }, update: parsed.data, create: { slug, ...parsed.data } });
    await audit({
      actorId: user.id,
      actorRole: user.role,
      objectType: "CmsPage",
      objectId: page.id,
      action: "UPDATE",
      metadata: { slug, title: page.title, isPublished: page.isPublished },
    });
    return NextResponse.json({ id: page.id });
  } catch (err) {
    console.error("[admin/cms] PUT error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
