import path from "node:path";
// PDFKit ships its own CommonJS runtime; the project has no PDFKit TS package.
const PDFDocument = require("pdfkit");
export interface ReceiptSnapshot {
  number: string; order: string; issuedAt: string; paymentAt: string; paymentReference: string;
  company: { name: string; address: string; email: string; phone: string };
  customer: { name: string; email: string; phone: string; address: string; state: string };
  items: { name: string; quantity: number; unit: number }[];
  subtotal: number; discount: number; total: number; received: number; method: string;
}
export function renderReceiptPdf(data: ReceiptSnapshot, draft = false): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margins: { top: 45, bottom: 45, left: 45, right: 45 }, bufferPages: true, info: { Title: draft ? "Draft payment receipt - not confirmation" : `Payment receipt ${data.number}`, Author: data.company.name } });
    doc.registerFont("ReceiptBody", path.join(process.cwd(), "public/brand/receipt-fonts/LiberationSans-Regular.ttf"));
    doc.registerFont("ReceiptBold", path.join(process.cwd(), "public/brand/receipt-fonts/LiberationSans-Bold.ttf"));
    const chunks: Buffer[] = []; doc.on("data", (chunk: Buffer) => chunks.push(chunk)); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject);
    const clean = (text: string) => text.replace(/[\u0000-\u001f\u007f]/g, " ");
    const localDate = (value: string) => new Date(value).toLocaleString("en-GB", { timeZone: "Africa/Douala", dateStyle: "medium", timeStyle: "short" });
    const money = (value: number) => `$${value.toFixed(2)} USD`;
    try {
      doc.image(path.join(process.cwd(), "public/brand/parrotrehome-emblem.png"), 45, 43, { fit: [55, 55] });
      doc.font("ReceiptBold").fontSize(23).fillColor("#47745B").text(clean(data.company.name), 115, 48, { width: 430 });
      doc.fontSize(15).fillColor("#424B50").text(draft ? "DRAFT — NOT PROOF OF PAYMENT" : "PAYMENT RECEIPT", 115, 79);
      doc.x = 45; doc.y = 115; doc.font("ReceiptBody").fontSize(10).fillColor("#424B50");
      const paragraph = (label: string, text: string) => { doc.font("ReceiptBold").text(label); doc.font("ReceiptBody").text(clean(text), { width: 505 }); doc.moveDown(0.65); };
      paragraph("Issuer", `${data.company.address}\n${data.company.email} | ${data.company.phone}`.replace(/\n/g, " / "));
      paragraph("Receipt / order", `${data.number} / ${data.order}`);
      paragraph("Dates (UTC+1)", `Issued: ${localDate(data.issuedAt)} | Payment verified: ${localDate(data.paymentAt)}`);
      paragraph("Customer", `${data.customer.name} / ${data.customer.email} / ${data.customer.phone} / ${data.customer.address}, ${data.customer.state}`);
      paragraph("Payment", `${data.method} / Provider confirmation reference: ${data.paymentReference}`);
      doc.moveDown(0.4); doc.font("ReceiptBold").fontSize(12).text("ORDER DETAILS"); doc.moveDown(0.5);
      for (const item of data.items) {
        if (doc.y > 675) doc.addPage();
        doc.font("ReceiptBold").fontSize(10).text(clean(item.name), { width: 505 });
        doc.font("ReceiptBody").text(`Quantity: ${item.quantity} | Unit: ${money(item.unit)} | Line: ${money(item.quantity * item.unit)}`); doc.moveDown(0.6);
      }
      if (doc.y > 570) doc.addPage();
      paragraph("Agreed order subtotal", money(data.subtotal));
      if (data.discount) paragraph("Discount", money(data.discount));
      paragraph("Agreed order total", money(data.total));
      paragraph(draft ? "Proposed amount — not yet verified" : "Amount received and verified", money(data.received));
      paragraph("Balance on this order", money(Math.max(0, data.total - data.received)));
      if (doc.y > 615) doc.addPage();
      const y = doc.y + 8;
      doc.roundedRect(45, y, 260, 62, 5).lineWidth(1.5).strokeColor("#47745B").stroke();
      doc.fillColor("#47745B").font("ReceiptBold").fontSize(12).text(draft ? "DRAFT - NOT VALID AS A RECEIPT" : "PAYMENT RECEIVED", 57, y + 10, { width: 235 });
      doc.fontSize(9).text(clean(data.company.name), 57, y + 28, { width: 235 });
      doc.font("ReceiptBody").fontSize(8).text("Electronic acknowledgement", 57, y + 44, { width: 235 });
      doc.y = y + 78; doc.x = 45; doc.fillColor("#424B50").fontSize(9).text(draft ? "Preview only. No payment is confirmed by this document." : "This receipt acknowledges the verified payment above. It does not confirm dispatch or a delivery date. Keep it with your order and agreed purchase terms.", { width: 505 });
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) { doc.switchToPage(i); doc.fontSize(8).fillColor("#89959A").text(`${clean(data.number)} | Page ${i + 1} of ${pages.count}`, 45, 780, { width: 505, lineBreak: false }); }
      doc.end();
    } catch (error) { reject(error); doc.destroy(); }
  });
}
