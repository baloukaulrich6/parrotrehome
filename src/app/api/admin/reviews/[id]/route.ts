import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

// PATCH /api/admin/reviews/[id] — A-24 moderation: publish or reject

const schema = z.object({
  action: z.enum(["publish", "reject"]),
  moderatorNote: z.string().max(500).optional(),
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

    const newStatus = parsed.data.action === "publish" ? "PUBLISHED" : "REJECTED";
    const review = await db.review.update({
      where: { id },
      data: {
        status: newStatus,
        moderatorId: user.id,
        moderatedAt: new Date(),
        moderatorNote: parsed.data.moderatorNote,
      },
    });

    await audit({
      actorId: user.id,
      actorRole: user.role,
      objectType: "Review",
      objectId: id,
      action: "UPDATE",
      changes: { status: newStatus, moderatorNote: parsed.data.moderatorNote },
    });

    return NextResponse.json({ id, status: newStatus });
  } catch (err) {
    console.error("[admin/reviews] PATCH error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
