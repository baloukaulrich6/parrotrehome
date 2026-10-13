import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { generateMfaSecret, generateQrCodeDataUrl, verifyMfaToken } from "@/lib/mfa";
import { z } from "zod";

// POST /api/mfa/setup
// Returns a new TOTP secret + QR code for the current staff user.
// Verifies a provided token if `verify` is true, enabling MFA.
// Cahier p.09: MFA for staff.

const schema = z.object({
  action: z.enum(["init", "verify", "disable"]),
  token: z.string().optional(),
  secret: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // MFA only for staff
    if (user.role === "CLIENT") {
      return NextResponse.json({ error: "MFA is for staff accounts only." }, { status: 403 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid" }, { status: 400 });
    }

    if (parsed.data.action === "init") {
      // Generate a new secret (not yet saved — saved on verify)
      const secret = generateMfaSecret();
      const qr = await generateQrCodeDataUrl(user.email, secret);
      const uri = `otpauth://totp/ParrotRehome:${encodeURIComponent(user.email)}?secret=${secret}&issuer=ParrotRehome`;
      return NextResponse.json({ secret, qr, uri });
    }

    if (parsed.data.action === "verify") {
      // Verify the token against the provided secret, then save
      if (!parsed.data.token || !parsed.data.secret) {
        return NextResponse.json({ error: "Token and secret required" }, { status: 400 });
      }
      const ok = verifyMfaToken(parsed.data.token, parsed.data.secret);
      if (!ok) {
        return NextResponse.json({ error: "Invalid TOTP code. Please try again." }, { status: 400 });
      }
      await db.user.update({
        where: { id: user.id },
        data: {
          mfaSecret: parsed.data.secret,
          mfaEnabled: true,
        },
      });
      return NextResponse.json({ ok: true, mfaEnabled: true });
    }

    if (parsed.data.action === "disable") {
      await db.user.update({
        where: { id: user.id },
        data: {
          mfaSecret: null,
          mfaEnabled: false,
        },
      });
      return NextResponse.json({ ok: true, mfaEnabled: false });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[mfa] POST error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
