import { z } from "zod";
import { BRAND } from "./constants";
const line = z.string().trim().min(1).max(200).regex(/^[^\r\n]+$/);
export const siteSettingsSchema = z.object({
  name: line, tagline: line, subTagline: line,
  email: z.string().trim().email().max(254),
  phone: line, secondaryPhone: z.string().trim().max(100),
  address: z.string().trim().min(1).max(500), hours: line,
});
export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export const defaultSiteSettings: SiteSettings = {
  name: BRAND.name, tagline: BRAND.tagline, subTagline: BRAND.subTagline,
  email: BRAND.email, phone: BRAND.phone, secondaryPhone: "", address: BRAND.address, hours: BRAND.hours,
};
export const siteSettingLabels: Record<keyof SiteSettings, string> = {
  name: "Site name", tagline: "Tagline", subTagline: "Secondary tagline", email: "Contact email",
  phone: "Phone number", secondaryPhone: "Additional phone number (optional)", address: "Address", hours: "Opening hours",
};
