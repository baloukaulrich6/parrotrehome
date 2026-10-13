import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

// POST /api/newsletter/subscribe
// A-23: consent-based newsletter subscription. Public endpoint.
// Stores email + name + source. Consent timestamp is GDPR-compliant.

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().max(100).optional(),
  source: z.string().max(50).default("footer"),
});

export async function POST(req: Request) {
  try {
    // Rate limit: 3 subscribes per hour per IP (prevents email spam)
    const rl = checkRateLimit(req, "NEWSLETTER");
    if (!rl.ok && rl.response) return rl.response;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
    }
    const { email, name, source } = parsed.data;
    const lower = email.toLowerCase().trim();

    // Check if already subscribed
    const existing = await db.newsletterSubscription.findUnique({ where: { email: lower } });
    if (existing && existing.active) {
      return NextResponse.json({ ok: true, message: "You're already subscribed." });
    }
    if (existing && !existing.active) {
      // Reactivate
      await db.newsletterSubscription.update({
        where: { email: lower },
        data: { active: true, name: name ?? existing.name, unsubscribedAt: null, consentAt: new Date() },
      });
      return NextResponse.json({ ok: true, message: "Welcome back — your subscription is reactivated." });
    }

    await db.newsletterSubscription.create({
      data: { email: lower, name, source, consentAt: new Date(), active: true },
    });
    return NextResponse.json({ ok: true, message: "Subscribed. Thank you for joining!" });
  } catch (err) {
    console.error("[newsletter/subscribe] error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
