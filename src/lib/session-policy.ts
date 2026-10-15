export const STAFF_SESSION_MS = 8 * 60 * 60_000;
export function sessionAllowsAccess(user: { role: string; status: string }, proof: { authAt?: number }, now = Date.now()) {
  if (user.status !== "ACTIVE") return false;
  if (user.role === "CLIENT") return true;
  return typeof proof.authAt === "number" && proof.authAt > 0 && proof.authAt <= now && now - proof.authAt <= STAFF_SESSION_MS;
}
