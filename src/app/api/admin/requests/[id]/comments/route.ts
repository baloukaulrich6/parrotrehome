import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { requireStaff } from "@/lib/rbac";
import { z } from "zod";

const schema = z.object({
  body: z.string().min(2, "Comment too short").max(2000),
});

// POST /api/admin/requests/[id]/comments
// A-03: Internal comments on the dossier

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await requireStaff(user.role);

    const { id } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid" }, { status: 400 });
    }

    const request = await db.request.findUnique({ where: { id } });
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const comment = await db.internalComment.create({
      data: {
        requestId: id,
        userId: user.id,
        body: parsed.data.body,
      },
    });

    return NextResponse.json({ id: comment.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
