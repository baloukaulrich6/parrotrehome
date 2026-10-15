/// <reference types="bun-types" />
import { afterAll, expect, test } from "bun:test";
import { generateMfaSecret, generateCurrentTotp, verifyMfaToken } from "../src/lib/mfa";
import { readMfaSecret, sealMfaSecret, mfaKeyId } from "../src/lib/mfa-storage";
import { sessionAllowsAccess } from "../src/lib/session-policy";
import { canManageAccount, accountSchema } from "../src/lib/user-management";

const previous = process.env.NEXTAUTH_SECRET;
process.env.NEXTAUTH_SECRET = "local-unit-test-only-secret-long-enough";
afterAll(() => { if (previous) process.env.NEXTAUTH_SECRET = previous; else delete process.env.NEXTAUTH_SECRET; });
test("a real TOTP verifies and an incorrect one is rejected asynchronously", async () => {
  const secret = generateMfaSecret();
  const code = await generateCurrentTotp(secret);
  expect(await verifyMfaToken(code, secret)).toBe(true);
  const different = String((Number(code) + 123) % 1000000).padStart(6, "0");
  expect(await verifyMfaToken(different, secret)).toBe(false);
  expect(await verifyMfaToken("abcdef", secret)).toBe(false);
});
test("authenticator secret is authenticated/encrypted and legacy secrets remain readable", () => {
  const secret = generateMfaSecret();
  const sealed = sealMfaSecret(secret);
  expect(sealed).not.toContain(secret);
  expect(readMfaSecret(sealed).secret).toBe(secret);
  expect(readMfaSecret(secret).secret).toBe(secret);
  expect(readMfaSecret(sealed).setupExpiresAt).toBeGreaterThan(Date.now());
  const pieces = sealed.split("."); pieces[3] = Buffer.from("tampered").toString("base64url");
  expect(() => readMfaSecret(pieces.join("."))).toThrow();
});
test("unenrolled, old, suspended or reset staff sessions cannot access administration", () => {
  const user = { role: "MANAGER", status: "ACTIVE", mfaEnabled: true, mfaSecret: "stored" };
  const proof = { authAt: Date.now(), mfaKeyId: mfaKeyId("stored") };
  expect(sessionAllowsAccess(user, proof, mfaKeyId("stored"))).toBe(true);
  expect(sessionAllowsAccess(user, {}, mfaKeyId("stored"))).toBe(false);
  expect(sessionAllowsAccess(user, { ...proof, authAt: Date.now() - 9 * 3600000 }, mfaKeyId("stored"))).toBe(false);
  expect(sessionAllowsAccess({ ...user, status: "SUSPENDED" }, proof, mfaKeyId("stored"))).toBe(false);
  expect(sessionAllowsAccess(user, proof, mfaKeyId("new-secret"))).toBe(false);
  expect(sessionAllowsAccess({ ...user, mfaEnabled: false }, proof, "")).toBe(false);
  expect(sessionAllowsAccess({ ...user, mfaEnabled: false }, proof, "", true)).toBe(true);
  expect(sessionAllowsAccess({ ...user, role: "CLIENT", mfaEnabled: false }, {}, "")).toBe(true);
});
test("manager cannot create privileged users and password bounds match bcrypt", () => {
  expect(canManageAccount("SUPER_ADMIN", "CLIENT", "MANAGER")).toBe(true);
  expect(canManageAccount("MANAGER", "AGENT", "AGENT")).toBe(true);
  expect(canManageAccount("MANAGER", "AGENT", "SUPER_ADMIN")).toBe(false);
  expect(canManageAccount("AGENT", "AGENT", "AGENT")).toBe(false);
  expect(accountSchema.safeParse({ name: "Test", email: "test@example.com", password: "é".repeat(40), role: "AGENT" }).success).toBe(false);
});
