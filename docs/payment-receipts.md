# Payment receipt and customer follow-up

Admin > Requests > order > Verify payment accepts the amount, provider confirmation reference and private verification notes. Preview draft PDF receipt downloads a document prominently marked DRAFT / NOT PROOF OF PAYMENT. It does not change order state. Confirm payment and email PDF receipt verifies payment, creates the permanent receipt and attempts the notification.

The reference must be present and the amount must match the full agreed order total (USD, including any recorded discount). Partial or mismatched payments cannot mark an order fully paid. Staff must verify funds with the official provider; a client email or payment reference alone is not proof. Payments of $1,000 or more remain subject to second approval by a different authorized active user; no permanent receipt or receipt email is produced before that approval. The final payment check, paid state and receipt are committed together, with conditional updates preventing duplicate verification.

## Document

This is a payment receipt, not an unpaid proforma or a claim to be a jurisdiction-specific tax invoice. The PDF contains the brand logo, company information from Configuration, client contact/address, order reference, receipt number, line items, quantity, unit/line amounts, agreed subtotal, recorded discount, total, verified amount, balance and provider confirmation reference. Internal bank notes, private seller payout details and login credentials are excluded. A branded electronic PAYMENT RECEIVED acknowledgement is included; it is not a government certification, notarization or handwritten signature. Receipt dates are explicitly displayed in UTC+1 (Africa/Douala); stored timestamps remain ISO UTC.

Company name, address, contact email and telephone come from Configuration. A legacy placeholder correspondence address is omitted from the PDF rather than blocking preview, payment confirmation or receipt delivery; a legacy placeholder phone is replaced with an email contact instruction. Configured real addresses are included normally. No registration numbers, tax identifiers, tax rates, delivery fees or legal guarantees are invented. The agreed order quote remains authoritative. The logo uses the current approved public/brand/parrotrehome-emblem.png. Fonts are embedded from the included Liberation Sans files and license so PDF rendering does not depend on the recipient's installed fonts.

The receipt snapshot and PDF bytes are retained in PaymentReceipt, unique to the verified PaymentCheck. Later customer/catalog/settings changes do not alter it. Older genuinely verified full-payment orders can receive a receipt through the follow-up panel; orders lacking a valid payment check/reference or full amount require staff review rather than fabricated acknowledgement.

## Delivery and access

Email includes a PDF attachment via the existing Resend transport, branded HTML and plain text, order/items/amount/reference and support contact. The existing editable payment-verified template is used, with mandatory receipt acknowledgement details appended. No click-to-pay link is generated. Attachment data and event keys are stable across retries.

The admin receipt panel and message history show delivery state. QUEUED is preview only, SENT is provider acceptance (not proof of inbox delivery), FAILED allows a manual retry, and SENDING is an in-progress/uncertain attempt that requires checking provider history before recovery. Successful notifications cannot be sent again through this panel. Manual retries claim the same persistent receipt and reuse the same message and provider idempotency key; provider retention periods still apply, so check uncertain deliveries before retrying. Delivery failure does not undo a verified payment and must not prompt a second payment.

The PDF can be downloaded from the admin dossier and the owning client's My requests dossier. Anonymous requests and unrelated customers cannot download it. Authorized payment-verification staff can download receipts; no public unauthenticated PDF URLs are issued. Responses are private/no-store. Receipt and payment foreign keys restrict destructive deletion of these financial records.

## Deployment and validation

The normal deployment backs up the database, runs scripts/migrate-payment-receipts.py (reviewed SQL in scripts/migrations/payment-receipts.sql), then checks full Prisma drift. Existing orders/payment checks/emails are preserved; there is no automatic bulk receipt email to old customers. New installations use the current Prisma schema. No new server secret or mail provider is required.

PDFKit is externalized for server use, required font data is traced and public brand assets/fonts are copied into the standalone image. Unit tests cover multi-page PDF/logo/draft/font embedding and email attachments. HTTP integration covers preview, missing/mismatched amounts, permanent snapshots, ownership, duplicate/retry behavior and second approval. Python tests cover migration repeatability, preservation and unexpected-schema refusal. Example draft /workspace/outputs/payment-receipt-example.pdf uses fictional customer/order data only and is not a receipt for an actual payment.
