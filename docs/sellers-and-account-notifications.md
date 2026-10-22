# Seller listings and account notifications

Public sign-up offers Buy, Sell or Both. All self-registered accounts remain CLIENT; the preference does not grant administrative rights. Passwords require 12–72 characters and at most 72 UTF-8 bytes, are hashed, never emailed, and never retrievable by staff. The existing own-account password change remains available. Email addresses are no longer marked verified merely because a registration form was submitted.

## Seller workflow

Sell a parrot (/sell) requires an active signed-in account. Upload up to eight still JPEG/PNG/WebP images, enter bird information (age in weeks/months/years), private contact details and the proposed method by which ParrotRehome may pay the seller. The payout field is for beneficiary name and contact/reference, not banking passwords, PINs or card data. No payout is executed by this feature.

The seller must affirm adult age, authority to sell, photograph rights, accuracy and the seller terms. An audit event records the policy version and content hash. The listing remains PENDING and is not added to the catalog until a SUPER_ADMIN or MANAGER reviews it in Admin > Seller listings. Reviewers see the private correspondence address, telephone, account email and payout recipient. Approval requires an explicit confirmation of checks; staff must actually perform those checks, including lawful ownership and available documentation. Rejection requires a reason visible in the seller area.

Approval transactionally creates exactly one catalog Bird. Bird information, city/state and an optional WhatsApp number explicitly provided for publication are published. The private verification contact/payout fields are never copied to Bird. The normal customer order/payment flow is used; seller payout preferences do not override customer payment methods. A price quote or publication is not a completed sale or payout. Agree any commission, net amount, timing and delivery responsibilities in writing before finalizing the transaction.

The seller can withdraw and submit a corrected listing for fresh review. A withdrawn listing is hidden from public catalog, detail, search and related/featured results. A reserved or sold bird cannot be withdrawn through this action; staff must handle existing commitments. Public views also omit seller listings belonging to inactive accounts. Reservation uses a conditional database update so withdrawal and reservation cannot both win. Staff-created catalog birds are unaffected.

Seller uploads reuse the bounded 5 MB decoder, strip metadata by re-encoding to WebP and are limited to fifty uploads per account per day. Ownership records prevent attaching another user's images. Uploaded images are public random-URL assets; do not upload identity papers or private banking documents as listing photos. Other seller fields are restricted to the submitting seller and authorized reviewers.

## Emails and one-time security advice

Every self-registration queues an AccountNotification addressed to ORDER_NOTIFICATION_EMAIL, falling back to MAIL_REPLY_TO (support@parrotrehome.com by default). It contains name, account email, purpose and the admin link. Existing MAIL_FROM, MAIL_TRANSPORT and Resend settings apply. No new credential is required. Preview never contacts Resend; QUEUED means preview, SENT means provider acceptance, not inbox delivery. Failures do not roll back an already-created account.

Admin > Customers allows only SUPER_ADMIN to approve one precautionary security advice email per account. The operator confirms review; a unique event key and atomic creation prevent duplicate logical alerts. The email invites the customer to sign in on the site and change their own password. It does not claim that a data breach was detected. No password, password hash or reset secret is included.

Admin > Account emails shows the registration/advice history, recipients, content, status and errors. Failed or preview notifications can be explicitly retried by a super-admin using the same logical notification/provider idempotency key. Successful notifications cannot be resent through this interface. A SENDING record without a result requires checking provider history before manual recovery. External provider idempotency has provider-defined retention; avoid retries of uncertain deliveries without checking provider logs.

## Deployment and verification

Normal deploy-vps.sh backs up first, runs the reviewed additive scripts/migrate-seller-accounts.py using scripts/migrations/seller-accounts.sql, then verifies full Prisma schema drift. Existing users, password hashes, orders and emails are not overwritten. The four new tables are AccountPreference, SellerListing, SellerUpload and AccountNotification. The migration validates existing table shapes and is repeatable. Fresh installs use the current Prisma schema.

Existing users default to Buy in the directory and can submit listings without recreating their account. There are no retroactive registration notifications. Existing custom CMS content remains authoritative; the new Seller terms page is editable in Admin > CMS. Review it and the actual seller/payout process before accepting submissions.

Validation covers all three registration purposes, hash-only credential storage, preview notices, image ownership, pending moderation, review permissions/required confirmation, publication privacy, withdrawal/reservation safety, rejection notes, one-time advice and retry deduplication. Python tests verify additive migration, preservation and refusal of unexpected schemas.


## Optional public WhatsApp contact

Admin creation/editing and seller submission have a separate optional publicPhone field. Use an international number with a country code (+1…, +237…, or the 00 prefix). The server validates and normalizes separators, stores the canonical +number, and generates a fixed https://wa.me/digits destination. No arbitrary URL can be supplied. The public bird detail displays the number as a link and a Contact on WhatsApp button opening in a separate tab/app. WhatsApp determines whether the number has a registered account; the website does not verify that registration.

A seller explicitly authorizes publication by entering this optional field. The private contactPhone remains private and is never used as a fallback. Staff review the optional public number before approval; approval copies only that field to the catalog record. On admin edit, blank clears it; an omitted field in an older API payload preserves it. Existing listings have no public contact until someone explicitly supplies it. Staff should obtain the contact owner's permission before publishing their number.

Deployment adds nullable publicPhone columns to Bird and SellerListing using migrate-public-phone.py after the earlier seller migration. Both migrations support repeated deployments, including fresh installs using the current schema. No private telephone values are backfilled. Normal backup and Prisma drift verification remain required.
