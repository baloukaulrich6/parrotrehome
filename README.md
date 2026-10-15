# 🦜 ParrotRehome.com

VPS deployment with Docker Compose and automatic HTTPS: see [docs/docker-vps.md](docs/docker-vps.md) and run `scripts/deploy-vps.sh` on the VPS. This deployment preserves uploaded media and SQLite, creates a private initial administrator, and keeps outgoing email in preview mode until a provider is connected.

**US-based parrot e-commerce & avian consultation platform** with manual, agent-verified payment workflow.

![ParrotRehome](https://img.shields.io/badge/ParrotRehome-v1.8-D54149) ![Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Prisma](https://img.shields.io/badge/Prisma-6-indigo) ![Tailwind](https://img.shields.io/badge/Tailwind-4-cyan)

## ✨ Features

### Customer App (29 features — all documented requirements implemented)
- 🏠 Homepage with hero, 3 entry doors (Parrots / Cages & Supplies / Avian Advice $15/h), How it works, featured parrots
- 🦜 Parrots catalog with filters, search, sort + individual bird dossiers (photos, species, age, sex, location, provenance, care FAQ)
- 🛒 Cages & Supplies catalog with USD pricing
- 📅 Avian advice booking ($15/hour) with agenda + consultation form
- 📋 Multi-item request cart (no on-site payment)
- 📝 Request form with validation, consent, state verification
- 📧 No-reply email confirmation with reference + next steps
- 💳 Payment method chooser (Bank wire, Zelle, Cash App, Apple Pay, PayPal, Chime)
- 🔒 Secure payment instructions view (non-guessable link, expiry-controlled)
- 📄 Payment reference deposit
- 📊 Status tracking + timeline + email notifications
- 💬 Secure client-agent messaging (F-28)
- ❤️ Favorites (localStorage-persisted)
- ⭐ Verified reviews (only COMPLETED request owners can review)
- 📄 Recap PDF download
- 🔄 Appointment reschedule within policy
- 🎥 Secure video call (Jitsi Meet) + 24h/1h reminders
- 👤 Guest checkout with auto-linking on sign-up (F-08)
- ❌ Customer-side cancel within policy

### Admin Console (27 features — all documented requirements implemented)
- 📊 Dashboard with KPIs, charts, low-stock alerts, channel analytics
- 📋 Requests list with filters, search, CSV export
- 📁 Dossier detail: items, customer, timeline, chat, comments, audit trail
- 👤 Agent assignment + transfer
- 💳 Payment method management (enable/disable)
- 🔐 Secure instruction creation (32-byte hash, expiry)
- ✅ Manual payment verification (T-06: never just a click)
- 🛡️ Double validation for high-value operations ≥ $1000 (A-09: 2-person rule)
- 🐦 Birds CRUD (individual dossiers, provenance, health docs)
- 📦 Products CRUD (categories, prices, stock)
- 📅 Appointments management with reschedule confirm/reject
- 🎟️ Coupons (percentage / flat USD / free shipping, usage limits, expiry)
- 📧 Newsletter subscribers (GDPR-compliant consent)
- 👥 Staff directory and account management
- ⭐ Reviews moderation (publish/reject)
- 📝 CMS pages + FAQ CRUD
- 📈 Metrics with channel analytics + periodic CSV reports
- 🔒 Email and password sign-in for staff
- 📋 Audit log (immutable)
- 🔔 Pending approvals queue (2-person rule)

### Security
- 🔐 NextAuth v4 with JWT, bcrypt password hashing, password authentication for staff
- 🛡️ Rate limiting on 7 endpoints (sign-in, sign-up, coupons, newsletter, contact, requests, appointments)
- 🚫 Price manipulation protection (server-side price verification, never trusts client-provided prices)
- 🛡️ Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy)
- 🔒 IDOR protection on all customer APIs (ownership check: customerId OR customerEmail)
- 🔐 RBAC matrix (6 roles, 20+ actions)
- 📋 Immutable audit log on every action
- ✅ Status transition enforcement (canTransition) on all state changes
- 🤖 Google Ads + GA4 conversion tracking (5 events)

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| Database | Prisma ORM + SQLite (dev) / PostgreSQL (prod) |
| Auth | NextAuth.js v4 + bcryptjs |
| Email | Idempotent in-process queue (Resend-ready adapter) |
| Video | Jitsi Meet (self-hostable via `JITSI_BASE_URL`) |
| Analytics | Google Analytics 4 + Google Ads conversion tracking |
| Charts | Custom SVG (donut + bar) |
| Validation | Zod (server + client) |
| State | Zustand (cart + favorites, localStorage-persisted) |

## 🚀 Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL, NEXTAUTH_SECRET, GOOGLE_ADS_ID, etc.

# 3. Push database schema + seed demo data
bun run db:push
bun run scripts/seed.ts

# 4. Start dev server
bun run dev
# → http://localhost:3000
```

## 👤 Demo Accounts

All passwords: `parrotrehome123`

| Email | Role |
|-------|------|
| admin@parrotrehome.com | Super Admin (password authentication enabled) |
| manager@parrotrehome.com | Manager |
| agent@parrotrehome.com | Agent |
| stock@parrotrehome.com | Stock Manager |
| vet@parrotrehome.com | Avian Professional |
| client@example.com | Client |

## 🎟️ Test Coupons

| Code | Discount | Validity |
|------|----------|----------|
| `WELCOME10` | 10% off | 90 days, 100 uses |
| `FREESHIP` | Free shipping | 30 days, 50 uses |

## 📁 Project Structure

```
src/
├─ app/
│  ├─ layout.tsx              # Root layout (fonts, GA, providers)
│  ├─ globals.css             # Design tokens (charter colors)
│  ├─ robots.ts               # robots.txt route
│  ├─ sitemap.ts              # sitemap.xml route
│  ├─ middleware.ts           # Rate limiting (sign-in)
│  ├─ (customer)/             # Customer route group
│  │  ├─ page.tsx             # Homepage
│  │  ├─ parrots/             # Catalog + detail
│  │  ├─ supplies/            # Accessories catalog
│  │  ├─ avian-advice/        # Booking
│  │  ├─ cart/                # Request cart
│  │  ├─ request/             # Request form + submitted
│  │  ├─ my-requests/         # Status tracking + chat + video
│  │  ├─ sign-in/             # Auth
│  │  ├─ sign-up/             # Registration
│  │  ├─ favorites/           # Saved items
│  │  ├─ cms/[slug]/          # Dynamic CMS pages
│  │  ├─ search/              # Search results
│  │  └─ ...                  # How it works, About, Contact, Guides
│  ├─ (admin)/               # Admin route group
│  │  └─ admin/              # Dashboard, Requests, Birds, Products, etc.
│  └─ api/                   # REST API (all server-side ACL)
├─ components/
│  ├─ parrotrehome/          # Customer UI components
│  ├─ admin/                 # Admin UI components
│  └─ ui/                    # shadcn/ui primitives
├─ lib/
│  ├─ auth.ts                # NextAuth config
│  ├─ rbac.ts                # Permission matrix
│  ├─ db.ts                  # Prisma client
│  ├─ email.ts               # Templates + sendEmail + secure links
│  ├─ audit.ts               # Immutable audit writer
│  ├─ session-policy.ts      # Session status and expiry checks
│  ├─ rate-limit.ts          # In-memory rate limiter
│  ├─ cart-store.ts          # Zustand cart
│  ├─ favorites-store.ts     # Zustand favorites
│  └─ constants.ts           # Status meta, formatters, brand
└─ prisma/
   └─ schema.prisma           # 18 models + enums
```

## 🔒 Security

- Server-side price verification (never trusts client-provided prices)
- Coupon re-validation server-side (active, not expired, within limits)
- Rate limiting on 7 endpoints
- RBAC on all admin APIs
- IDOR protection on all customer APIs
- Immutable audit log
- password authentication for staff
- Security headers on all responses
- Content-Security-Policy ready for production

## 📄 License

This project is built for ParrotRehome.com. All rights reserved.

## 🙏 Acknowledgments

Built per strict implementation rules from the Cahier Fonctionnel (14 pages) + Charte Graphique (11 pages) + customer homepage mockup. All 29 customer features + 27 admin features implemented. No undocumented features added.
