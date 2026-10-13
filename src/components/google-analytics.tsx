import Script from "next/script";

// ============================================================
// ParrotRehome — Google Analytics 4 + Google Ads conversion tracking
// Env vars (set in .env):
//   GOOGLE_ADS_ID=AW-XXXXXXXXX (Google Ads conversion ID)
//   GA_MEASUREMENT_ID=G-XXXXXXXXXX (GA4 measurement ID)
// When env vars are placeholder values (AW-XXXXXXXXX), the script is not loaded
// to avoid sending data to a non-existent account.
// ============================================================

const GA_ID = process.env.GA_MEASUREMENT_ID;
const ADS_ID = process.env.GOOGLE_ADS_ID;
const ENABLED = GA_ID && ADS_ID && !GA_ID.includes("XXXX") && !ADS_ID.includes("XXXX");

export function GoogleAnalytics() {
  if (!ENABLED) {
    return null;
  }
  return (
    <>
      {/* GA4 base tag */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            send_page_view: true,
            anonymize_ip: true,
          });
          gtag('config', '${ADS_ID}');
        `}
      </Script>
    </>
  );
}

// Helper: emit a conversion event (used in client components after key actions)
// Usage: trackConversion('request_submitted', { value: 2850, currency: 'USD' });
export function trackConversion(
  event: "request_submitted" | "appointment_booked" | "coupon_applied" | "sign_up" | "newsletter_subscribe",
  data?: { value?: number; currency?: string; transaction_id?: string }
) {
  if (typeof window === "undefined") return;
  if (!ENABLED) {
    console.log(`[analytics] (would track) ${event}`, data);
    return;
  }
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag !== "function") return;
  w.gtag("event", event, {
    send_to: ADS_ID,
    value: data?.value,
    currency: data?.currency ?? "USD",
    transaction_id: data?.transaction_id,
  });
  console.log(`[analytics] tracked ${event}`, data);
}
