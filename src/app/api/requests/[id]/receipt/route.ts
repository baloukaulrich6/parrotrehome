import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { ensureReceipt } from "@/lib/payment-receipts";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser();
  if (!user) return new Response(null, { status: 401 });
  const { id } = await params;
  const request = await db.request.findUnique({ where: { id }, select: { customerId: true, customerEmail: true } });
  if (!request) return new Response(null, { status: 404 });
  const owner = user.role === "CLIENT" && (request.customerId === user.id || request.customerEmail.toLowerCase() === user.email.toLowerCase());
  if (!owner && !can(user.role, "payment:validate")) return new Response(null, { status: 404 });
  try {
    const receipt = await ensureReceipt(id);
    return new Response(new Uint8Array(Buffer.from(receipt.pdfBase64, "base64")), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${receipt.filename}"`, "cache-control": "private, no-store" } });
  } catch { return new Response(null, { status: 404 }); }
}
