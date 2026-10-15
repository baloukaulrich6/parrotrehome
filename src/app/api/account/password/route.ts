import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
const schema = z.object({ currentPassword: z.string().min(1).max(1024), newPassword: z.string().min(12).max(72).refine(value => Buffer.byteLength(value, "utf8") <= 72, "Password must be at most 72 bytes.") }).strict();
export async function PUT(req: Request) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (req.headers.get("origin") !== new URL(process.env.NEXTAUTH_URL || req.url).origin) return new Response(null, { status: 403 });
  if (!rateLimit(`password-change:${user.id}`, 5, 15 * 60000).ok) return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your current password and a new password between 12 and 72 characters. Do not include an account identifier." }, { status: 400 });
  const account = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!await bcrypt.compare(parsed.data.currentPassword, account.passwordHash)) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  if (parsed.data.currentPassword === parsed.data.newPassword) return NextResponse.json({ error: "Choose a different password." }, { status: 400 });
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  const changed = await db.$transaction(async tx => {
    const result = await tx.user.updateMany({ where: { id: user.id, passwordHash: account.passwordHash }, data: { passwordHash } });
    if (result.count) await tx.auditLog.create({ data: { actorId: user.id, actorRole: user.role, objectType: "Password", objectId: user.id, action: "UPDATE", metadata: JSON.stringify({ event: "PASSWORD_CHANGED" }) } });
    return result.count;
  });
  if (!changed) return NextResponse.json({ error: "Account changed. Sign in again." }, { status: 409 });
  return NextResponse.json({ ok: true, signInRequired: true });
}
