export const PAYMENT_WINDOW_MINUTES = 20;
export function paymentExpiry(now = Date.now(), minutes = PAYMENT_WINDOW_MINUTES) {
  return new Date(now + minutes * 60_000);
}
export function instructionsUsable(status: string, expiryAt: Date | string, now = Date.now()) {
  return status === "ACTIVE" && new Date(expiryAt).getTime() > now;
}
