import { db } from "./db";
import { readSiteSettings } from "./site-settings";
import { defaultSiteSettings } from "./site-settings-schema";
import { renderReceiptPdf, type ReceiptSnapshot } from "./receipt-pdf";
import { deliverEmail, mailConfiguration } from "./email-transport";
import { resolveEmailTemplate } from "./email-templates";
import { renderEmailHtml } from "./email-design";
import { createHash } from "node:crypto";
export function validateReceivedAmount(expected: number | null, received: number) {
  if (expected == null || !Number.isFinite(received) || received <= 0 || Math.round(expected * 100) !== Math.round(received * 100) || Math.abs(received * 100 - Math.round(received * 100)) > 0.00001) throw new Error("The verified amount must match the agreed order total. Review the quote before confirming full payment.");
}
export async function prepareReceipt(requestId: string, check: { id: string; amount: number; reference: string; verifiedAt: Date }, draft = false) {
  const request = await db.request.findUniqueOrThrow({ where: { id: requestId }, include: { items: { include: { bird: { select: { commonName: true } }, product: { select: { name: true } } } }, selectedPaymentMethod: { select: { name: true } } } });
  validateReceivedAmount(request.finalTotalUsd ?? request.totalQuoteUsd, check.amount);
  if (!check.reference.trim()) throw new Error("Enter the provider payment confirmation reference.");
  const company = readSiteSettings();
  if (company.address === defaultSiteSettings.address) throw new Error("Configure your real company address in Configuration before issuing a payment receipt.");
  const snapshot: ReceiptSnapshot = {
    number: draft ? `DRAFT-${request.reference}` : `RCPT-${request.reference}-${check.id.slice(-8).toUpperCase()}`,
    order: request.reference, issuedAt: new Date().toISOString(), paymentAt: check.verifiedAt.toISOString(), paymentReference: check.reference,
    company: { name: company.name, address: company.address, email: company.email, phone: company.phone === defaultSiteSettings.phone ? "Contact us by email" : company.phone },
    customer: { name: request.customerName, email: request.customerEmail, phone: request.customerPhone || "", address: request.shippingAddress || "", state: request.shippingState || "" },
    items: request.items.map(item => ({ name: item.bird?.commonName || item.product?.name || "Avian service", quantity: item.quantity, unit: item.quotedPriceUsd })),
    subtotal: request.totalQuoteUsd ?? check.amount, discount: request.discountUsd ?? 0, total: request.finalTotalUsd ?? request.totalQuoteUsd ?? check.amount, received: check.amount, method: request.selectedPaymentMethod?.name || "As agreed in order",
  };
  if (!snapshot.items.length) snapshot.items.push({ name: "Service as agreed in order", quantity: 1, unit: snapshot.subtotal });
  const pdf = await renderReceiptPdf(snapshot, draft);
  return { id: `receipt-${check.id}`, paymentCheckId: check.id, requestId, snapshot: JSON.stringify(snapshot), filename: `${snapshot.number.replace(/[^a-zA-Z0-9-]/g, "-")}.pdf`, pdfBase64: pdf.toString("base64") };
}
export async function ensureReceipt(requestId: string) {
  const check = await db.paymentCheck.findFirst({ where: { requestId }, orderBy: { verifiedAt: "desc" } });
  if (!check) throw new Error("No verified payment exists for this order.");
  const existing = await db.paymentReceipt.findUnique({ where: { paymentCheckId: check.id } });
  if (existing) return existing;
  const data = await prepareReceipt(requestId, { ...check, reference: check.reference || "" });
  return db.paymentReceipt.upsert({ where: { paymentCheckId: check.id }, update: {}, create: data });
}
export async function sendReceipt(requestId: string) {
  const receipt = await ensureReceipt(requestId);
  const claim = await db.paymentReceipt.updateMany({ where: { id: receipt.id, deliveryState: { in: ["PENDING", "QUEUED", "FAILED"] } }, data: { deliveryState: "SENDING", errorMessage: null } });
  if (!claim.count) return { receiptId: receipt.id, status: receipt.deliveryState };
  try {
    const s = JSON.parse(receipt.snapshot) as ReceiptSnapshot;
    const template = resolveEmailTemplate("payment-verified", { customerName: s.customer.name, reference: s.order, amount: `$${s.received.toFixed(2)} USD`, message: "", secureLink: `${process.env.NEXTAUTH_URL}/my-requests/${requestId}` });
    const body = `${template.body}\n\nPAYMENT ACKNOWLEDGEMENT\nOrder: ${s.order}\nCustomer: ${s.customer.name}\nItems:\n${s.items.map(item => `- ${item.name} x ${item.quantity}`).join("\n")}\nAmount received: $${s.received.toFixed(2)} USD\nPayment reference: ${s.paymentReference}\nReceipt: ${s.number}\n\nYour payment has been received and manually verified. Your payment receipt PDF is attached. No additional payment is requested by this acknowledgement. For assistance, contact ${mailConfiguration().replyTo}.`;
    const id = `receipt-email-${createHash("sha256").update(receipt.id).digest("hex")}`;
    const message = await db.message.upsert({ where: { id }, update: {}, create: { id, requestId, senderRole: "system", template: "payment-verified", channel: "EMAIL", toAddress: s.customer.email, fromAddress: mailConfiguration().from, subject: template.subject, body, deliveryStatus: "QUEUED" } });
    let status: "QUEUED" | "SENT" | "FAILED"; let errorMessage: string | null = null;
    try { status = await deliverEmail({ toAddress: message.toAddress!, subject: message.subject!, body: message.body!, html: renderEmailHtml(message.subject!, message.body!, process.env.NEXTAUTH_URL), attachments: [{ filename: receipt.filename, content: receipt.pdfBase64 }] }, `receipt:${receipt.id}`); }
    catch (error) { status = "FAILED"; errorMessage = error instanceof Error ? error.message : "Provider delivery failed"; }
    await db.$transaction([db.message.update({ where: { id }, data: { deliveryStatus: status, errorMessage } }), db.paymentReceipt.update({ where: { id: receipt.id }, data: { deliveryState: status, errorMessage } })]);
    return { receiptId: receipt.id, status };
  } catch (error) {
    await db.paymentReceipt.update({ where: { id: receipt.id }, data: { deliveryState: "FAILED", errorMessage: "Receipt notification could not be prepared." } });
    throw error;
  }
}
