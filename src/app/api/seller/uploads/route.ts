import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { storeImage } from "@/lib/store-image";
import { sameOrigin } from "@/lib/seller-listings";
import { rateLimit } from "@/lib/rate-limit";
export const runtime = "nodejs";
export async function POST(req: Request) {
  const user = await getServerUser();
  if (!user) return new Response(null, { status: 401 });
  if (!sameOrigin(req)) return new Response(null, { status: 403 });
  if (!rateLimit(`seller-upload:${user.id}`, 50, 86400000).ok || await db.sellerUpload.count({ where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 86400000) } } }) >= 50) return new Response(null, { status: 429 });
  const response = await storeImage(req);
  if (response.status === 201) {
    const { url } = await response.clone().json();
    await db.sellerUpload.create({ data: { userId: user.id, url } });
  }
  return response;
}
