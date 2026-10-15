import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { MAX_IMAGE_BYTES, mediaDirectory } from "@/lib/media";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(user.role, "inventory:manage_birds") && !can(user.role, "inventory:manage_products")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (req.headers.get("origin") !== new URL(process.env.NEXTAUTH_URL || req.url).origin) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  // Raw file body allows bounding memory before parsing/decoding the image.
  if (!req.body || !["image/jpeg", "image/png", "image/webp"].includes(req.headers.get("content-type") || "")) {
    return NextResponse.json({ error: "Choose a JPEG, PNG or WebP image." }, { status: 400 });
  }
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_IMAGE_BYTES) {
      await reader.cancel();
      return NextResponse.json({ error: "Images must be at most 5 MB." }, { status: 413 });
    }
    chunks.push(value);
  }
  let image: Buffer;
  try {
    const input = sharp(Buffer.concat(chunks), { limitInputPixels: 25_000_000 });
    const metadata = await input.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format || "") || (metadata.pages || 1) > 1) throw new Error("Unsupported image");
    image = await input.rotate().resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  } catch {
    return NextResponse.json({ error: "Invalid image. Upload a still JPEG, PNG or WebP." }, { status: 400 });
  }
  try {
    const name = `${randomUUID()}.webp`;
    await mkdir(mediaDirectory(), { recursive: true });
    await writeFile(path.join(mediaDirectory(), name), image, { flag: "wx" });
    return NextResponse.json({ url: `/api/media/${name}` }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Image storage is unavailable." }, { status: 500 });
  }
}
