import { notifyRegistration } from "@/lib/account-notifications";
import { sameOrigin } from "@/lib/seller-listings";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(120),
  consent: z.literal(true),
  intent: z.enum(["BUY", "SELL", "BOTH"]).default("BUY"),
  email: z.string().email("Invalid email"),
  password: z.string().min(12, "Password must be at least 12 characters").max(72).refine(value => Buffer.byteLength(value, "utf8") <= 72, "Password must be at most 72 bytes"),
});

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return new Response(null, { status: 403 });
    // Rate limit: 3 sign-ups per hour per IP
    const rl = checkRateLimit(req, "SIGN_UP");
    if (!rl.ok && rl.response) return rl.response;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const { name, email, password, intent } = parsed.data;
    const lower = email.toLowerCase().trim();

    const exists = await db.user.findUnique({ where: { email: lower } });
    if (exists) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const user = await db.user.create({
      data: {
        email: lower,
        name,
        passwordHash: await hashPassword(password),
        role: "CLIENT",
        status: "ACTIVE",
        accountPreference: { create: { intent } },
        consentAt: new Date(),
      },
    });

    // F-08: link any guest requests (customerId=null) with matching email to this new account
    await db.request.updateMany({
      where: { customerEmail: lower, customerId: null },
      data: { customerId: user.id },
    });
    await db.appointment.updateMany({
      where: { request: { customerEmail: lower, customerId: null } },
      data: { customerId: user.id },
    });

    await audit({
      actorId: user.id,
      actorRole: "CLIENT",
      objectType: "User",
      objectId: user.id,
      action: "CREATE",
    });

    // Email failure must not turn an already-created account into a failed signup.
    const notificationStatus = await notifyRegistration({ id: user.id, name: user.name, email: user.email }, intent).catch(error => { console.error("[sign-up] notification could not be queued", error); return "FAILED"; });
    return NextResponse.json({ id: user.id, email: user.email, notificationStatus });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    console.error("[sign-up] error:", err);
    return NextResponse.json({ error: "Sign-up failed" }, { status: 500 });
  }
}
