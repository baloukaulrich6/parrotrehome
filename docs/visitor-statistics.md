# Engaged site visitors

The admin dashboard shows estimated unique browsers with more than five seconds of visible public-page browsing after optional tracking consent. Cards cover today (UTC+1 / Africa-Douala), the last seven days and the last thirty days. Source counts use each browser's first qualifying visit in the selected thirty-day period, so they sum to the total. Refresh the dashboard to see new counts. Only roles with `metrics:view` see the statistics.

## Measurement

Public customer layout mounts a persistent tracker; admin pages do not mount it. The tracker starts only after the existing optional tracking choice permits statistics, respects Global Privacy Control, pauses when `document.visibilityState` is hidden and preserves progress across public navigation and reloads. A tab session expires after thirty minutes. Tabs share a browser identifier, so additional tabs/sessions do not inflate unique counts within a reporting period. Storage-disabled browsers are omitted. This estimates browsers, not identified people; cleared storage, multiple devices, blocking and refusal affect totals. It cannot reconstruct previous traffic or prove every recorded visitor is human.

The server issues signed session tokens, enforces more than five seconds since issuance, checks origins, rate-limits requests and records qualification idempotently. Client active-time reporting supports the visibility rule; it is not fraud-proof identity verification. Known bot user agents are omitted. Sources are Google search, Google Ads (click identifiers / paid Google UTM), external links, other tagged campaigns and direct/unknown. Referrer suppression makes some referrals unknown. No Google API or Google Analytics configuration is required for these first-party statistics.

Only the HMAC browser key, random visit ID, source category, start and qualification timestamps are stored. Raw IP addresses, email, full URLs, referrer queries and Google click identifiers are not stored in SiteVisit. Browser identifiers expire after ninety days. Server rows older than ninety days are purged when a new visit is started. Cookie policy and consent copy describe the measurement.

## Deployment

Use the normal scripts/deploy-vps.sh workflow; recreating only the app container does not migrate the database or rebuild the image. Existing database backups run first. scripts/migrate-site-visits.py creates only the new table and its indexes; the existing Prisma schema drift check must then report no difference. Existing orders, accounts, passwords and messages are preserved. Fresh databases receive the table from the current Prisma schema.

Required runtime setting: the existing NEXTAUTH_SECRET, also used to sign visit tokens and pseudonymize browser IDs. Do not expose or change it just to enable statistics. Rotating it also changes browser keys. Visit counts begin after deployment and consenting traffic, so an initial zero is expected.

## Validation

- Bun tests: source classification, five-second boundaries, signed tokens, consent decisions; isolated HTTP integration checks refusal/GPC/origin validation, elapsed-time enforcement, idempotency, unique browser attribution and dashboard output.
- Python migration tests: preserves unrelated records and visit rows on repeated runs, rejects an unknown table shape.
- Production Chromium check: no requests before consent or after refusal, no qualification before five visible seconds, simulated hidden visibility time excluded, reload deduplication and shared browser identifier across tabs. Browser checks use a disposable database and do not send customer emails.
