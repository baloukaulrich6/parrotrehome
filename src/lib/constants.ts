// ============================================================
// ParrotRehome — Shared utilities & constants
// ============================================================

// 8 USD price formatting — Cahier p.10: USD, US date format
export function formatUsd(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// US date format — Cahier p.09
export function formatDateUTC(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function formatDateOnly(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Generate human-friendly request reference: REQ-1025, REQ-1026, ...
// Uses the sequence number directly (no offset).
export function generateRequestReference(seq: number): string {
  return `REQ-${seq}`;
}

// ============================================================
// Status labels & colors (Cahier p.07)
// ============================================================

export const REQUEST_STATUS_META: Record<
  string,
  { label: string; className: string; description: string }
> = {
  RECEIVED: { label: "Received", className: "status-received", description: "Reference assigned; email sent." },
  PENDING_REVIEW: { label: "Pending review", className: "status-pending", description: "Assigned to an agent." },
  AWAITING_INSTRUCTIONS: { label: "Awaiting instructions", className: "status-awaiting", description: "Payment method selected." },
  INSTRUCTIONS_SENT: { label: "Instructions sent", className: "status-instructions", description: "Official link active; expiry date set." },
  PAYMENT_TO_VERIFY: { label: "Payment to verify", className: "status-verify", description: "Reference received / proof to control." },
  PAID_VERIFIED: { label: "Paid - verified", className: "status-paid", description: "Payment confirmed by an authorized agent." },
  READY_FOR_FULFILLMENT: { label: "Ready for fulfillment", className: "status-fulfillment", description: "Delivery, pickup or consultation scheduled." },
  COMPLETED: { label: "Completed", className: "status-completed", description: "Request executed and closed." },
  CANCELED: { label: "Canceled", className: "status-canceled", description: "Reason logged; stock / slot released." },
  REJECTED: { label: "Rejected", className: "status-canceled", description: "Reason logged; stock / slot released." },
};

// Allowed status transitions (Cahier p.07) — T-06 enforced server-side
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  RECEIVED: ["AWAITING_INSTRUCTIONS", "INSTRUCTIONS_SENT", "PENDING_REVIEW", "CANCELED", "REJECTED"],
  PENDING_REVIEW: ["INSTRUCTIONS_SENT", "AWAITING_INSTRUCTIONS", "CANCELED", "REJECTED"],
  AWAITING_INSTRUCTIONS: ["INSTRUCTIONS_SENT", "CANCELED", "REJECTED"],
  INSTRUCTIONS_SENT: ["PAYMENT_TO_VERIFY", "CANCELED", "REJECTED"],
  PAYMENT_TO_VERIFY: ["PAID_VERIFIED", "CANCELED", "REJECTED"],
  PAID_VERIFIED: ["READY_FOR_FULFILLMENT", "CANCELED"],
  READY_FOR_FULFILLMENT: ["COMPLETED", "CANCELED"],
  COMPLETED: [],
  CANCELED: [],
  REJECTED: [],
};

export function canTransition(from: string, to: string): boolean {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

export const BIRD_STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  AVAILABLE: { label: "Available", className: "avail-available" },
  RESERVED: { label: "Reserved", className: "avail-reserved" },
  UNAVAILABLE: { label: "Unavailable", className: "avail-unavailable" },
  SOLD: { label: "Sold", className: "avail-unavailable" },
};

// ============================================================
// Served US states (Cahier p.13) — default illustrative list,
// configurable via admin ServedState CRUD. Production should
// reflect verified bird-delivery compliance.
// ============================================================

export const DEFAULT_SERVED_STATES: { code: string; name: string }[] = [
  { code: "CA", name: "California" },
  { code: "NY", name: "New York" },
  { code: "TX", name: "Texas" },
  { code: "FL", name: "Florida" },
  { code: "WA", name: "Washington" },
  { code: "MA", name: "Massachusetts" },
  { code: "IL", name: "Illinois" },
  { code: "GA", name: "Georgia" },
];

// ============================================================
// Avian consultation constants (Cahier p.05)
// ============================================================

export const AVIAN_ADVICE_PRICE_PER_HOUR = 15;
export const AVIAN_ADVICE_SUBJECTS = [
  "Feeding & nutrition",
  "Behavior & training",
  "Habitat & environment",
  "Preventive health",
] as const;

// ============================================================
// Brand tokens (single source of truth)
// ============================================================

export const BRAND = {
  name: "ParrotRehome",
  tagline: "A brighter life with birds.",
  subTagline: "BIRDS • SUPPLIES • AVIAN CARE",
  email: "hello@parrotrehome.com",
  phone: "+1 (555) 010-2026", // placeholder — Q-4 unresolved
  address: "Avian Center, 1026 Feather Lane, Suite B, Portland, OR 97201", // placeholder — Q-4 unresolved
  hours: "Mon–Fri 9am–6pm PT • Sat 10am–4pm PT",
  currency: "USD",
};
