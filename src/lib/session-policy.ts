export const STAFF_SESSION_MS = 8 * 60 * 60_000;
export function sessionAllowsAccess(user: { role: string; status: string; mfaEnabled: boolean; mfaSecret: string | null }, proof: { authAt?: number; mfaKeyId?: string }, currentKeyId: string, allowSetup = false) {
  if (user.status !== "ACTIVE") return false;
  if (user.role === "CLIENT") return true;
  if (!proof.authAt || Date.now() - proof.authAt > STAFF_SESSION_MS) return false;
  if (!user.mfaEnabled) return allowSetup;
  return !!user.mfaSecret && proof.mfaKeyId === currentKeyId;
}
