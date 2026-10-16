import { CookieControls, optionalTrackingAllowed } from "./cookie-controls";
export function GoogleAnalytics() {
  return <CookieControls ga={process.env.GA_MEASUREMENT_ID} ads={process.env.GOOGLE_ADS_ID} />;
}
export function trackConversion(event: "request_submitted" | "appointment_booked" | "coupon_applied" | "sign_up" | "newsletter_subscribe", data?: { value?: number; currency?: string; transaction_id?: string }) {
  if (!optionalTrackingAllowed()) return;
  const w = window as unknown as { gtag?: (...args: unknown[]) => void; parrotAdsId?: string };
  if (w.gtag && w.parrotAdsId) w.gtag("event", event, { send_to: w.parrotAdsId, ...data, currency: data?.currency ?? "USD" });
}
