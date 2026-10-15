import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const key = () => {
  if (!process.env.NEXTAUTH_SECRET) throw new Error("NEXTAUTH_SECRET is required for MFA storage.");
  return createHash("sha256").update(`parrotrehome:mfa:${process.env.NEXTAUTH_SECRET}`).digest();
};
export function sealMfaSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const payload = JSON.stringify({ secret, setupExpiresAt: Date.now() + 10 * 60_000 });
  const ciphertext = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}
export function readMfaSecret(value: string): { secret: string; setupExpiresAt: number } {
  // Existing installed authenticators remain valid without a schema migration.
  if (/^[A-Z2-7]+={0,6}$/.test(value)) return { secret: value, setupExpiresAt: 0 };
  const [version, iv, tag, data] = value.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Invalid MFA storage.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8"));
}
export const mfaKeyId = (value: string) => createHash("sha256").update(value).digest("hex");
