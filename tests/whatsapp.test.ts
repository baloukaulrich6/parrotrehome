import { expect, test } from "bun:test";
import { normalizeWhatsAppPhone, whatsAppUrl } from "../src/lib/whatsapp";
import { publicPhoneSchema } from "../src/lib/public-phone-schema";
test("formats international contacts and builds a fixed WhatsApp destination", () => {
  expect(normalizeWhatsAppPhone(" +237 6 12 34 56 78 ")).toBe("+237612345678");
  expect(whatsAppUrl("001 (503) 555-0123")).toBe("https://wa.me/15035550123");
  expect(publicPhoneSchema.parse("+1 (503) 555-0123")).toBe("+15035550123");
  expect(publicPhoneSchema.parse("")).toBeNull();
  expect(publicPhoneSchema.parse(undefined)).toBeUndefined();
  expect(publicPhoneSchema.parse(null)).toBeNull();
});
test("rejects ambiguous local numbers and unsafe or malformed contact links", () => {
  for (const value of ["5035550123", "+0123456789", "+123", "+1234567890123456", "javascript:alert(1)", "https://evil.example", "+15035550123?text=bad"]) {
    expect(whatsAppUrl(value)).toBeNull(); expect(publicPhoneSchema.safeParse(value).success).toBe(false);
  }
});
