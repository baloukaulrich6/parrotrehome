import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { photosSchema } from "@/lib/photo-schema";
import { z } from "zod";

const schema = z.object({
  species: z.string().optional(),
  commonName: z.string().min(2, "Common name is required"),
  individualId: z.string().optional(),
  ageYears: z.number().nullable().optional(),
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

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!can(user.role, "inventory:manage_birds")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
    }
    const d = parsed.data;
    const bird = await db.bird.create({
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
        sourceDocuments: "[]",
        healthDocuments: "[]",
      },
    });
    await audit({
      actorId: user.id,
      actorRole: user.role,
      objectType: "Bird",
      objectId: bird.id,
      action: "CREATE",
      metadata: { commonName: bird.commonName, individualId: bird.individualId },
    });
    return NextResponse.json({ id: bird.id });
  } catch (err) {
    console.error("[admin/birds] POST error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
