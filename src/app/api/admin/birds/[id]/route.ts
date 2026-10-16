import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { photosSchema } from "@/lib/photo-schema";
import { z } from "zod";

// PUT /api/admin/birds/[id] — A-13 CRUD update

const schema = z.object({
  species: z.string().optional(),
  commonName: z.string().min(2),
  individualId: z.string().optional(),
  ageYears: z.number().min(0).max(150).nullable().optional(),
  sex: z.string().optional(),
  photos: photosSchema,
  status: z.enum(["AVAILABLE", "RESERVED", "UNAVAILABLE", "SOLD"]),
  location: z.string().optional(),
  priceUsd: z.number().nullable().optional(),
  shortDescription: z.string().optional(),
  longDescription: z.string().optional(),
  careNotes: z.string().optional(),
  breederName: z.string().optional(),
  originState: z.string().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!can(user.role, "inventory:manage_birds")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
    }
    const d = parsed.data;
    const bird = await db.bird.update({
      where: { id },
      data: {
        species: d.species ?? "Unknown",
        commonName: d.commonName,
        individualId: d.individualId || null,
        ageYears: d.ageYears ?? null,
        sex: d.sex ?? "Unknown",
        photos: d.photos || "[]",
        status: d.status,
        location: d.location ?? null,
        priceUsd: d.priceUsd ?? null,
        shortDescription: d.shortDescription ?? null,
        longDescription: d.longDescription ?? null,
        careNotes: d.careNotes ?? null,
        breederName: d.breederName ?? null,
        originState: d.originState ?? null,
      },
    });
    await audit({
      actorId: user.id,
      actorRole: user.role,
      objectType: "Bird",
      objectId: bird.id,
      action: "UPDATE",
      metadata: { commonName: bird.commonName, individualId: bird.individualId, status: bird.status },
    });
    return NextResponse.json({ id: bird.id });
  } catch (err) {
    console.error("[admin/birds] PUT error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE /api/admin/birds/[id] — A-13 CRUD delete (only if not reserved)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!can(user.role, "inventory:manage_birds")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const bird = await db.bird.findUnique({ where: { id } });
    if (!bird) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (bird.status === "RESERVED") {
      return NextResponse.json(
        { error: "Cannot delete a reserved bird — cancel the request first." },
        { status: 409 }
      );
    }
    await db.bird.delete({ where: { id } });
    await audit({
      actorId: user.id,
      actorRole: user.role,
      objectType: "Bird",
      objectId: id,
      action: "DELETE",
      metadata: { commonName: bird.commonName, individualId: bird.individualId },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/birds] DELETE error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
