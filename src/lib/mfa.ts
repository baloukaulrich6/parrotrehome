import {
  TOTP,
  generateSecret,
  generateURI,
  generate as generateTotp,
  verify as verifyTotp,
} from "otplib";
import QRCode from "qrcode";

// ============================================================
// ParrotRehome — MFA TOTP helper (Cahier p.09)
// "Comptes : mots de passe hashés, MFA pour staff, rôles côté
//  serveur et sessions expirantes."
// Uses otplib v13 top-level functions (RFC 6238 — 30s/6digit/SHA-1)
// ============================================================

const ISSUER = "ParrotRehome";
const PERIOD = 30;
const DIGITS = 6;

// Optional strategy instance for type-safe config (kept for future extension)
const _totp = new TOTP({ digits: DIGITS, period: PERIOD });

export function generateMfaSecret(): string {
  return generateSecret({ length: 20 });
}

export function buildTotpUri(email: string, secret: string): string {
  return generateURI({
    issuer: ISSUER,
    label: email,
    secret,
    algorithm: "sha1",
    digits: DIGITS,
    period: PERIOD,
  });
}

export async function generateQrCodeDataUrl(email: string, secret: string): Promise<string> {
  const uri = buildTotpUri(email, secret);
  return QRCode.toDataURL(uri, {
    margin: 1,
    width: 240,
    color: { dark: "#424B50", light: "#F7F6F1" },
  });
}

export async function verifyMfaToken(token: string, secret: string): Promise<boolean> {
  try {
    const clean = token.replace(/\s/g, "");
    if (clean.length !== DIGITS) return false;
    const result = await verifyTotp({
      token: clean,
      secret,
      digits: DIGITS,
      period: PERIOD,
      epochTolerance: 1, // ±30s window
    });
    // otplib v13 verify returns { valid, delta, epoch, timeStep } | null
    return Boolean(result && (result as { valid?: boolean }).valid);
  } catch {
    return false;
  }
}

export async function generateCurrentTotp(secret: string): Promise<string> {
  return await generateTotp({ secret, digits: DIGITS, period: PERIOD });
}
