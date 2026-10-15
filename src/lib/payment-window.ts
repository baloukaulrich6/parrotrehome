export const PAYMENT_WINDOW_MINUTES = 20;
export function paymentExpiry(now = Date.now()) {
  return new Date(now + PAYMENT_WINDOW_MINUTES * 60_000);
}
export function instructionsUsable(status: string, expiryAt: Date | string, now = Date.now()) {
  return status === "ACTIVE" && new Date(expiryAt).getTime() > now;
}
