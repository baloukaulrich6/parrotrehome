import { z } from "zod";
export const listingSchema = z.object({
  title: z.string().trim().min(2).max(120), species: z.string().trim().min(2).max(120),
  ageYears: z.number().min(0).max(150).nullable(), priceUsd: z.number().positive().max(1000000),
  location: z.string().trim().min(3).max(200), description: z.string().trim().min(30).max(5000),
  photos: z.array(z.string().regex(/^\/api\/media\/[a-f0-9-]{36}\.webp$/)).min(1).max(8).refine(values => new Set(values).size === values.length, "Remove duplicate photos."),
  contactName: z.string().trim().min(2).max(120), contactPhone: z.string().trim().min(7).max(40), contactAddress: z.string().trim().min(10).max(500),
  payoutMethod: z.enum(["Zelle", "Bank transfer", "PayPal", "Other"]), payoutRecipient: z.string().trim().min(3).max(300),
  consent: z.literal(true),
}).strict();
export const canReviewSellers = (role: string) => role === "SUPER_ADMIN" || role === "MANAGER";
export const sameOrigin = (req: Request) => req.headers.get("origin") === new URL(process.env.NEXTAUTH_URL || req.url).origin;
