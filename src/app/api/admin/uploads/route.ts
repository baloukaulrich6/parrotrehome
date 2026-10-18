import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { storeImage } from "@/lib/store-image";
export const runtime = "nodejs";
export async function POST(req: Request) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(user.role, "inventory:manage_birds") && !can(user.role, "inventory:manage_products")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (req.headers.get("origin") !== new URL(process.env.NEXTAUTH_URL || req.url).origin) return new Response(null, { status: 403 });
  return storeImage(req);
}
