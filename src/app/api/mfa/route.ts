import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { generateMfaSecret, generateQrCodeDataUrl, buildTotpUri, verifyMfaToken } from "@/lib/mfa";
import { readMfaSecret, sealMfaSecret } from "@/lib/mfa-storage";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({ action: z.enum(["init", "verify", "disable"]), token: z.string().max(12).optional() });
export async function POST(req: Request) {
  const user = await getServerUser({ allowMfaSetup: true });
  if (!user) return NextResponse.json({ error: "Sign in again to continue MFA setup." }, { status: 401 });
  if (user.role === "CLIENT") return NextResponse.json({ error: "MFA setup is for staff." }, { status: 403 });
  if (req.headers.get("origin") !== new URL(process.env.NEXTAUTH_URL || req.url).origin) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const limit = rateLimit(`mfa-setup:${user.id}`, 10, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Too many attempts. Wait one minute." }, { status: 429 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (parsed.data.action === "disable") return NextResponse.json({ error: "MFA is required for staff. Contact your server administrator for recovery." }, { status: 403 });
  if (user.mfaEnabled) return NextResponse.json({ error: "MFA is already enabled." }, { status: 409 });
  try {
    if (parsed.data.action === "init") {
      const secret = generateMfaSecret();
      const qr = await generateQrCodeDataUrl(user.email, secret);
      const sealed = sealMfaSecret(secret);
      const changed = await db.user.updateMany({ where: { id: user.id, mfaEnabled: false }, data: { mfaSecret: sealed } });
      if (!changed.count) return NextResponse.json({ error: "MFA state changed. Sign in again." }, { status: 409 });
      await audit({ actorId: user.id, actorRole: user.role, objectType: "User", objectId: user.id, action: "UPDATE", changes: { event: "MFA_SETUP_STARTED" } });
      return NextResponse.json({ secret, qr, uri: buildTotpUri(user.email, secret) }, { headers: { "Cache-Control": "no-store" } });
    }
    const record = await db.user.findUnique({ where: { id: user.id }, select: { mfaSecret: true, mfaEnabled: true } });
    if (!record?.mfaSecret || record.mfaEnabled) return NextResponse.json({ error: "Generate a fresh QR code first." }, { status: 400 });
    const pending = readMfaSecret(record.mfaSecret);
    if (pending.setupExpiresAt <= Date.now()) return NextResponse.json({ error: "Setup expired. Generate a fresh QR code." }, { status: 400 });
    if (!parsed.data.token || !await verifyMfaToken(parsed.data.token, pending.secret)) return NextResponse.json({ error: "Invalid authenticator code. Check the time on your phone." }, { status: 400 });
    const changed = await db.user.updateMany({ where: { id: user.id, mfaEnabled: false, mfaSecret: record.mfaSecret }, data: { mfaEnabled: true } });
    if (!changed.count) return NextResponse.json({ error: "MFA setup changed. Start again." }, { status: 409 });
    await audit({ actorId: user.id, actorRole: user.role, objectType: "User", objectId: user.id, action: "UPDATE", changes: { event: "MFA_ENABLED" } });
    return NextResponse.json({ ok: true, mfaEnabled: true, signInRequired: true });
  } catch {
    return NextResponse.json({ error: "MFA setup failed. Check server configuration and retry." }, { status: 500 });
  }
}
