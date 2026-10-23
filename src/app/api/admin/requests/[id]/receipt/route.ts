import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { prepareReceipt, sendReceipt } from "@/lib/payment-receipts";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser();
  if (!user) return new Response(null, { status: 401 });
  if (!can(user.role, "payment:validate") || req.headers.get("origin") !== new URL(process.env.NEXTAUTH_URL || req.url).origin) return new Response(null, { status: 403 });
  if (!rateLimit(`receipt:${user.id}`, 30, 3600000).ok) return new Response(null, { status: 429 });
  const { id } = await params;
  const parsed = z.discriminatedUnion("action", [z.object({ action: z.literal("preview"), amount: z.number().positive(), reference: z.string().trim().min(1).max(200) }).strict(), z.object({ action: z.literal("send") }).strict()]).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });
  const request = await db.request.findUnique({ where: { id }, select: { status: true } });
  if (!request) return new Response(null, { status: 404 });
  try {
    if (parsed.data.action === "preview") {
      if (!["INSTRUCTIONS_SENT", "PAYMENT_TO_VERIFY"].includes(request.status)) return new Response(null, { status: 409 });
      const draft = await prepareReceipt(id, { id: "draft", amount: parsed.data.amount, reference: parsed.data.reference, verifiedAt: new Date() }, true);
      return new Response(new Uint8Array(Buffer.from(draft.pdfBase64, "base64")), { headers: { "content-type": "application/pdf", "content-disposition": 'inline; filename="draft-payment-receipt.pdf"', "cache-control": "no-store" } });
    }
    if (!["PAID_VERIFIED", "READY_FOR_FULFILLMENT", "COMPLETED"].includes(request.status)) return NextResponse.json({ error: "Verify the payment first." }, { status: 409 });
    const result = await sendReceipt(id);
    await audit({ actorId: user.id, actorRole: user.role, objectType: "PaymentReceipt", objectId: result.receiptId, action: "UPDATE", metadata: { event: "RECEIPT_EMAIL_REQUESTED", status: result.status } });
    return NextResponse.json(result);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Receipt unavailable" }, { status: 400 }); }
}
