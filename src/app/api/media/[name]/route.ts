import { readFile } from "node:fs/promises";
import path from "node:path";
import { mediaDirectory, mediaNamePattern } from "@/lib/media";

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!mediaNamePattern.test(name)) return new Response("Not found", { status: 404 });
  try {
    const bytes = await readFile(path.join(mediaDirectory(), name));
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": "image/webp", "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
    } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
