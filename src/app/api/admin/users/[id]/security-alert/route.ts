import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { requestSecurityAlert, deliverAccountNotification } from "@/lib/account-notifications";
import { sameOrigin } from "@/lib/seller-listings";
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser();
  if (!user) return new Response(null, { status: 401 });
  if (user.role !== "SUPER_ADMIN" || !sameOrigin(req)) return new Response(null, { status: 403 });
  const data = await req.json().catch(() => null);
  if (data?.reviewed !== true) return NextResponse.json({ error: "Confirm your review before sending this one-time advice." }, { status: 400 });
  const { id } = await params;
  if (!await db.user.findUnique({ where: { id } })) return new Response(null, { status: 404 });
  try {
    const result = await requestSecurityAlert(id, user);
    if (result.duplicate) return NextResponse.json({ error: "This account already has a security advice notification. Use delivery retry only if it failed." }, { status: 409 });
    const status = await deliverAccountNotification(result.id);
    return NextResponse.json({ id: result.id, status });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return new Response(null, { status: 409 });
    throw error;
  }
}
