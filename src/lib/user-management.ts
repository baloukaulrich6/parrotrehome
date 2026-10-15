import { z } from "zod";
export const accountRoles = ["CLIENT", "SUPER_ADMIN", "MANAGER", "AGENT", "STOCK_MANAGER", "AVIAN_PROFESSIONAL"] as const;
export const accountSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(12).max(72).refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Password must be at most 72 UTF-8 bytes."),
  role: z.enum(accountRoles),
});
export const accountUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  role: z.enum(accountRoles),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});
export function canManageAccount(actorRole: string, targetRole: string, nextRole: string) {
  return actorRole === "SUPER_ADMIN" || (actorRole === "MANAGER" && targetRole === "AGENT" && nextRole === "AGENT");
}
