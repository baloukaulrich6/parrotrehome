import { generateMfaSecret, generateCurrentTotp, verifyMfaToken } from "../src/lib/mfa";

async function main() {
  const secret = generateMfaSecret();
  console.log("Secret:", secret, "len:", secret.length);
  try {
    const token = await generateCurrentTotp(secret);
    console.log("Token:", token);
    const ok = await verifyMfaToken(token, secret);
    console.log("Verify:", ok);
  } catch (e) {
    console.error("Error:", e instanceof Error ? e.message : e);
  }
}
main();
