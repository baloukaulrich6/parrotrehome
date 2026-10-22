import { z } from "zod";
import { normalizeWhatsAppPhone } from "./whatsapp";
export const publicPhoneSchema = z.string().trim().max(60).nullable().optional().transform((value, ctx) => {
  if (value == null) return value;
  if (!value) return null;
  const phone = normalizeWhatsAppPhone(value);
  if (!phone) { ctx.addIssue({ code: "custom", message: "Enter an international WhatsApp number with its country code, for example +1 503 555 0123 or +237 6 12 34 56 78." }); return z.NEVER; }
  return phone;
});
