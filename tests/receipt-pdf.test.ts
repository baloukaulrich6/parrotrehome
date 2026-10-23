import { expect, test } from "bun:test";
import { renderReceiptPdf, type ReceiptSnapshot } from "../src/lib/receipt-pdf";
const sample: ReceiptSnapshot = { number: "RCPT-REQ-1234-EXAMPLE", order: "REQ-1234", issuedAt: "2026-10-23T12:00:00Z", paymentAt: "2026-10-23T11:59:00Z", paymentReference: "BANK-CONFIRMED-123", company: { name: "ParrotRehome", address: "Sample address - draft example only", email: "support@example.com", phone: "Sample contact" }, customer: { name: "Sample Customer", email: "customer@example.com", phone: "Sample telephone", address: "Sample customer address", state: "OR" }, items: [{ name: "African Grey", quantity: 1, unit: 900 }], subtotal: 900, discount: 0, total: 900, received: 900, method: "Zelle" };
test("branded PDF includes a logo and remains valid for multipage orders and explicit drafts", async () => {
  for (const draft of [false, true]) {
    const pdf = await renderReceiptPdf({ ...sample, items: Array.from({ length: 45 }, (_, i) => ({ ...sample.items[0], name: `Item ${i + 1} — African Grey` })) }, draft);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-"); expect(pdf.toString("latin1")).toContain("/Subtype /Image"); expect(pdf.toString("latin1")).toContain("/FontFile2");
    expect(pdf.toString("latin1")).toContain(draft ? "Draft payment receipt - not confirmation" : "Payment receipt RCPT");
    expect((pdf.toString("latin1").match(/\/Type \/Page\b/g) || []).length).toBeGreaterThan(1);
  }
});
