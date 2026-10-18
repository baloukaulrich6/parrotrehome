import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { deliverAccountNotification } from "@/lib/account-notifications";
import { sameOrigin } from "@/lib/seller-listings";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser();
  if (!user) return new Response(null, { status: 401 });
  if (user.role !== "SUPER_ADMIN" || !sameOrigin(req)) return new Response(null, { status: 403 });
  if (!rateLimit(`account-email-retry:${user.id}`, 10, 3600000).ok) return new Response(null, { status: 429 });
  const { id } = await params;
  const record = await db.accountNotification.findUnique({ where: { id } });
  if (!record) return new Response(null, { status: 404 });
  if (!["FAILED", "QUEUED"].includes(record.status)) return new Response(null, { status: 409 });
  const status = await deliverAccountNotification(id);
  await audit({ actorId: user.id, actorRole: user.role, objectType: "AccountNotification", objectId: id, action: "UPDATE", metadata: { event: "DELIVERY_RETRIED", status } });
  return NextResponse.json({ status });
}
