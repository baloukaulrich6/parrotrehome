/// <reference types="bun-types" />
import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PAYMENT_WINDOW_MINUTES, paymentExpiry, instructionsUsable } from "../src/lib/payment-window";
import { parsePhotos } from "../src/lib/photo-data";
import { escapeHtml, renderEmailHtml } from "../src/lib/email-design";
import { resolveEmailTemplate, saveEmailTemplate } from "../src/lib/email-templates";

const directory = mkdtempSync(path.join(tmpdir(), "parrot-templates-"));
const previous = process.env.EMAIL_TEMPLATES_FILE;
process.env.EMAIL_TEMPLATES_FILE = path.join(directory, "templates.json");
afterAll(() => { if (previous) process.env.EMAIL_TEMPLATES_FILE = previous; else delete process.env.EMAIL_TEMPLATES_FILE; rmSync(directory, { recursive: true }); });

describe("20 minute payment window", () => {
  test("expires at the exact boundary and revocations cannot be used", () => {
    const issued = 1000000;
    const expiry = paymentExpiry(issued);
    expect(PAYMENT_WINDOW_MINUTES).toBe(20);
    expect(expiry.getTime() - issued).toBe(1_200_000);
    expect(instructionsUsable("ACTIVE", expiry, expiry.getTime() - 1)).toBe(true);
    expect(instructionsUsable("ACTIVE", expiry, expiry.getTime())).toBe(false);
    expect(instructionsUsable("REVOKED", expiry, issued)).toBe(false);
  });
});
test("existing photos survive editing and invalid data is handled", () => {
  expect(parsePhotos('["/api/media/one.webp","https://example.com/old.jpg"]')).toHaveLength(2);
  expect(parsePhotos("https://example.com/old.jpg")).toEqual(["https://example.com/old.jpg"]);
  expect(parsePhotos("[]")).toEqual([]);
});
test("email HTML escapes client text and uses the brand palette", () => {
  const html = renderEmailHtml("<script>bad</script>", 'Client <img onerror="bad">');
  expect(html).not.toContain("<script>");
  expect(html).not.toContain("<img onerror=");
  expect(html).toContain("#F7F6F1");
  expect(html).toContain("#47745B");
  expect(escapeHtml('"')).toBe("&quot;");
});
test("payment emails contain details, configurable validity and support without a payment link", () => {
  const email = resolveEmailTemplate("instructions-ready", { customerName: "Alex", reference: "DEMO-001", paymentLabel: "Zelle", selectedMethod: "Zelle", agentName: "Agent", expiry: "12:30 UTC", paymentDetails: "Recipient: Demo Company\nContact: payments@example.com", validityMinutes: "30", supportEmail: "support@parrotrehome.com", amount: "$250.00 USD" });
  expect(email.body).toContain("30 minutes");
  expect(email.body).toContain("12:30 UTC");
  expect(email.body).toContain("Recipient: Demo Company");
  expect(email.html).toContain('href="mailto:support@parrotrehome.com"');
  expect(email.body).not.toContain("https://");
  expect(email.body).toContain("does not confirm payment");
  expect(email.subject).toContain("Zelle");
});
test("installed link-only payment templates upgrade to direct details", () => {
  saveEmailTemplate("instructions-ready", { subject: "Instructions {{reference}}", body: "Follow {{secureLink}} before {{expiry}}." });
  const email = resolveEmailTemplate("instructions-ready", { reference: "NEW", paymentDetails: "Recipient: Demo account", validityMinutes: "45", supportEmail: "support@parrotrehome.com", expiry: "Tomorrow" });
  expect(email.body).toContain("Recipient: Demo account");
  expect(email.body).toContain("45 minutes");
  expect(email.body).not.toContain("Follow");
});
test("saved template is used by the next email and user text remains escaped", () => {
  saveEmailTemplate("request-received", { subject: "Request {{reference}}", body: "Hello {{customerName}},\n{{message}}" });
  const email = resolveEmailTemplate("request-received", { reference: "NEW", customerName: "<script>x</script>", message: "Received" });
  expect(email.subject).toBe("Request NEW");
  expect(email.body).toContain("Received");
  expect(email.html).not.toContain("<script>");
});

test("email paragraphs and line breaks remain readable without CSS whitespace support", () => {
  const html = renderEmailHtml("Request received", "Dear Alex,\nYour request is saved.\n\nNext steps:\nReview your request.");
  expect(html).toContain("Dear Alex,<br>Your request is saved.");
  expect(html).toContain("Next steps:<br>Review your request.");
  expect(html).not.toContain("white-space:pre-wrap");
});
