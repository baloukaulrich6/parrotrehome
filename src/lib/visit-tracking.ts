import { createHmac, timingSafeEqual } from "node:crypto";
export const VISIT_WINDOW_MS = 30 * 60 * 1000;
export const VISIT_THRESHOLD_MS = 5000;
export const VISIT_RETENTION_MS = 90 * 86400000;
export const VISIT_SOURCES = ["google_search", "google_ads", "referral", "campaign", "direct"] as const;
export type VisitSource = typeof VISIT_SOURCES[number];
export function visitSource(referrer: string, landing: string, origin: string): VisitSource {
  const url = new URL(landing, origin);
  const campaign = url.searchParams;
  if (campaign.has("gclid") || campaign.has("gbraid") || campaign.has("wbraid") || (campaign.get("utm_source")?.toLowerCase() === "google" && /^(cpc|ppc|paid|paidsearch)$/i.test(campaign.get("utm_medium") || ""))) return "google_ads";
  if (campaign.has("utm_source")) return "campaign";
  try {
    const from = new URL(referrer);
    if (from.origin === origin) return "direct";
    if (/(^|\.)google\.(com|[a-z]{2}|com\.[a-z]{2}|co\.[a-z]{2})$/i.test(from.hostname)) return "google_search";
    return "referral";
  } catch { return "direct"; }
}
function signature(value: string, secret: string) { return createHmac("sha256", secret).update(value).digest("hex"); }
export function visitorKey(id: string, secret: string) { return signature(`visitor:${id}`, secret); }
export function visitToken(id: string, secret: string) { return signature(`visit:${id}`, secret); }
export function validVisitToken(id: string, token: string, secret: string) {
  return /^[a-f0-9]{64}$/.test(token) && timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(visitToken(id, secret), "hex"));
}
export function canQualify(startedAt: Date, now: Date) {
  const elapsed = now.getTime() - startedAt.getTime();
  return elapsed > VISIT_THRESHOLD_MS && elapsed < VISIT_WINDOW_MS;
}
