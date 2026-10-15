import { resolveEmailTemplate } from "./email-templates";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { randomBytes } from "crypto";

// ============================================================
// ParrotRehome — Email module
// Cahier p.06 / F-22 / F-25:
//   Two email types:
//     1. NO-REPLY AUTOMATIQUE — request received, summary, next steps
//     2. MESSAGE AGENT OFFICIEL — secure payment instructions ready
//   Requirements:
//     - Domain authenticated (SPF/DKIM/DMARC) — out of scope for sandbox
//     - Idempotent retry queue
//     - Audit row per send (recipient, template, channel, timestamp,
//       success/failure, dossier ID) — see Messages table
//     - No financial secrets in email body
//
// In the sandbox, we log to console + DB. In production, swap
// `deliverEmail()` for Resend/AWS SES call.
// ============================================================

export interface EmailPayload {
  requestId: string;
  senderId?: string;
  senderRole: string; // "system" | "no-reply" | "agent:NAME"
  template: "request-received" | "instructions-ready" | "appointment-received" | "appointment-confirmed" | "status-update" | "appointment-reminder";
  toAddress: string;
  fromAddress: string;
  subject: string;
  body: string;
  html?: string;
  eventId?: string;
}

const NO_REPLY = "no-reply@parrotrehome.com";

// Idempotency key for retry safety
function idempotencyKey(p: EmailPayload): string {
  return `${p.requestId}:${p.template}:${p.toAddress}:${p.eventId ?? p.body}`;
}

// In-memory dedupe (per-process) — production should use Redis or DB unique constraint
const sentKeys = new Set<string>();

export async function sendEmail(payload: EmailPayload): Promise<{ messageId: string; status: "QUEUED" | "SENT" | "FAILED" | "DUPLICATE" }> {
  const key = idempotencyKey(payload);
  if (sentKeys.has(key)) {
    return { messageId: "duplicate", status: "DUPLICATE" };
  }

  let status: "QUEUED" | "SENT" | "FAILED" = "QUEUED";
  let errorMessage: string | undefined;

  try {
    await deliverEmail(payload);

  } catch (err) {
    status = "FAILED";
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  const message = await db.message.create({
    data: {
      requestId: payload.requestId,
      senderId: payload.senderId ?? null,
      senderRole: payload.senderRole,
      template: payload.template,
      channel: "EMAIL",
      toAddress: payload.toAddress,
      fromAddress: payload.fromAddress,
      subject: payload.subject,
      body: payload.body,
      deliveryStatus: status,
      errorMessage,
    },
  });

  if (status !== "FAILED") sentKeys.add(key);

  if (status === "FAILED") {
    console.error(`[email] FAILED to send '${payload.template}' (req=${payload.requestId}):`, errorMessage);
  } else {
    console.log(`[email] PREVIEW '${payload.template}' (req=${payload.requestId})`);
  }

  return { messageId: message.id, status };
}

// Demonstration transport: save only the message in the database below.
// Never report a preview as SENT, and never transmit client data during a demo.
async function deliverEmail(_p: EmailPayload): Promise<void> {
  if (process.env.MAIL_TRANSPORT && process.env.MAIL_TRANSPORT !== "preview") {
    throw new Error("Live email delivery is not configured. Set MAIL_TRANSPORT=preview for the demo.");
  }
}

// ============================================================
// Templates
// ============================================================

export function buildRequestReceivedEmail(opts: {
  reference: string;
  customerName: string;
  customerEmail: string;
  itemsSummary: string;
  totalQuote: number | null;
  nextSteps: string[];
}): EmailPayload {
  const body = `Dear ${opts.customerName},

We received your request #${opts.reference}. Your selected items and next steps are listed below. Payment is not yet confirmed.

──────────────────
REQUEST SUMMARY
──────────────────
Reference: ${opts.reference}
Items:
${opts.itemsSummary}
${opts.totalQuote != null ? `\nEstimated total: $${opts.totalQuote.toFixed(2)} USD` : ""}

──────────────────
NEXT STEPS
──────────────────
${opts.nextSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Important: ParrotRehome never collects payment information on-site. One of our authorized agents will reach out with secure, traceable payment instructions.

Thank you for choosing responsible avian companionship.

— ParrotRehome Team
(Do not reply to this automated message.)`;
  return {
    requestId: "", // filled by caller
    senderRole: "no-reply",
    template: "request-received",
    toAddress: opts.customerEmail,
    fromAddress: NO_REPLY,
    ...resolveEmailTemplate("request-received", { customerName: opts.customerName, reference: opts.reference, message: body }),
  };
}

export function buildInstructionsReadyEmail(opts: {
  reference: string;
  customerName: string;
  customerEmail: string;
  agentName: string;
  agentRole: string;
  secureLink: string;
  expiryAt: Date;
  paymentMethodName?: string;
  totalUsd?: number | null;
}): EmailPayload {
  const expiry = opts.expiryAt.toLocaleString("en-US", {
    timeZone: "UTC",
    timeZoneName: "short",
  });
  const method = process.env.PAYMENT_EMAIL_LABEL || "CHMK";
  const content = resolveEmailTemplate("instructions-ready", {
    customerName: opts.customerName,
    reference: opts.reference,
    paymentLabel: method,
    selectedMethod: opts.paymentMethodName || method,
    agentName: opts.agentName,
    expiry: expiry,
    secureLink: opts.secureLink,
    amount: opts.totalUsd == null ? "See the amount in your request" : `$${opts.totalUsd.toFixed(2)} USD`,
  });
  return {
    requestId: "",
    senderRole: `agent:${opts.agentName}`,
    template: "instructions-ready",
    toAddress: opts.customerEmail,
    fromAddress: NO_REPLY, // domain-authenticated no-reply, but signed in body
    ...content,
  };
}

export function buildAppointmentReceivedEmail(opts: {
  reference: string;
  customerName: string;
  customerEmail: string;
  professionalName: string;
  slotStartUtc: Date;
  durationMinutes: number;
  subject: string;
  priceUsd: number;
}): EmailPayload {
  const slot = opts.slotStartUtc.toLocaleString("en-US", {
    timeZone: "UTC",
    timeZoneName: "short",
  });
  const body = `Dear ${opts.customerName},

We received your avian advice request #${opts.reference}.

──────────────────
APPOINTMENT REQUEST
──────────────────
Reference: ${opts.reference}
Professional: ${opts.professionalName}
Slot (UTC): ${slot}
Duration: ${opts.durationMinutes} minutes
Subject: ${opts.subject}
Estimated price: $${opts.priceUsd.toFixed(2)} USD (${(opts.priceUsd / (opts.durationMinutes / 60)).toFixed(2)}/hour)

──────────────────
NEXT STEPS
──────────────────
1. Our team reviews your request and your animal information.
2. You receive a secure payment link from an authorized agent.
3. After manual verification, your slot is confirmed.

Payment is not yet confirmed. Do not enter any card details on the website.

— ParrotRehome Team`;
  return {
    requestId: "",
    senderRole: "no-reply",
    template: "appointment-received",
    toAddress: opts.customerEmail,
    fromAddress: NO_REPLY,
    subject: `Avian advice request #${opts.reference} received`,
    body,
  };
}

// ============================================================
// F-19: Secure video link + appointment reminders
// ============================================================

export function buildAppointmentConfirmedEmail(opts: {
  reference: string;
  customerName: string;
  customerEmail: string;
  professionalName: string;
  slotStartUtc: Date;
  durationMinutes: number;
  subject: string;
  priceUsd: number;
  videoCallUrl: string;
}): EmailPayload {
  const slot = opts.slotStartUtc.toLocaleString("en-US", {
    timeZone: "UTC",
    timeZoneName: "short",
  });
  const body = `Dear ${opts.customerName},

Your avian advice appointment is confirmed.

──────────────────
APPOINTMENT CONFIRMED
──────────────────
Reference: ${opts.reference}
Professional: ${opts.professionalName}
Slot (UTC): ${slot}
Duration: ${opts.durationMinutes} minutes
Subject: ${opts.subject}
Price: $${opts.priceUsd.toFixed(2)} USD

──────────────────
SECURE VIDEO LINK
──────────────────
Join the video call at the scheduled time:
${opts.videoCallUrl}

This link is personal, secure, and traceable. It will be active from 15 minutes before your slot until 30 minutes after.

──────────────────
REMINDERS
──────────────────
You will receive an email reminder 24 hours and 1 hour before your appointment.

— ParrotRehome Team`;
  return {
    requestId: "",
    senderRole: "no-reply",
    template: "appointment-confirmed",
    toAddress: opts.customerEmail,
    fromAddress: NO_REPLY,
    subject: `Appointment confirmed — ${opts.reference} · video link inside`,
    body,
  };
}

export function buildAppointmentReminderEmail(opts: {
  reference: string;
  customerName: string;
  customerEmail: string;
  professionalName: string;
  slotStartUtc: Date;
  durationMinutes: number;
  subject: string;
  videoCallUrl: string;
  whenLabel: string; // "24 hours" | "1 hour"
}): EmailPayload {
  const slot = opts.slotStartUtc.toLocaleString("en-US", {
    timeZone: "UTC",
    timeZoneName: "short",
  });
  const body = `Dear ${opts.customerName},

This is a friendly reminder — your avian advice appointment is in ${opts.whenLabel}.

──────────────────
APPOINTMENT REMINDER
──────────────────
Reference: ${opts.reference}
Professional: ${opts.professionalName}
Slot (UTC): ${slot}
Duration: ${opts.durationMinutes} minutes
Subject: ${opts.subject}

──────────────────
JOIN THE VIDEO CALL
──────────────────
${opts.videoCallUrl}

The link is active 15 minutes before your slot until 30 minutes after.

If you need to reschedule, please use the "Request reschedule" button on your My Requests page.

— ParrotRehome Team`;
  return {
    requestId: "",
    senderRole: "no-reply",
    template: "appointment-reminder",
    toAddress: opts.customerEmail,
    fromAddress: NO_REPLY,
    subject: `Reminder — appointment in ${opts.whenLabel} (${opts.reference})`,
    body,
  };
}

// ============================================================
// Secure instruction link generator (A-07)
// Cahier p.09: links must be non-guessable, expiring, signed, audited.
// ============================================================

export function generateSecureLinkHash(): string {
  return randomBytes(32).toString("hex");
}

export function buildSecureInstructionsLink(host: string, hash: string): string {
  return `${host}/my-requests/instructions?token=${hash}`;
}

// Sweep expired instructions (call via cron)
export async function expireInstructions(): Promise<number> {
  const now = new Date();
  const expired = await db.paymentInstruction.findMany({
    where: {
      status: "ACTIVE",
      expiryAt: { lt: now },
    },
    select: { id: true, requestId: true },
  });
  for (const instr of expired) {
    await db.paymentInstruction.update({
      where: { id: instr.id },
      data: { status: "EXPIRED" },
    });
    await auditLog.instructionExpire(instr.id);
    console.log(`[instructions] expired ${instr.id} for req ${instr.requestId}`);
  }
  return expired.length;
}

// ============================================================
// F-19: Secure video link generator (Jitsi Meet)
// Generates a non-guessable room name + URL.
// Uses Jitsi Meet public instance by default (overridable via JITSI_BASE_URL).
// ============================================================

export function generateVideoCallToken(): string {
  // Use the same secure hash generator as payment instructions
  return randomBytes(16).toString("hex");
}

export function buildVideoCallUrl(token: string): string {
  const base = process.env.JITSI_BASE_URL ?? "https://meet.jit.si";
  return `${base}/parrotrehome-${token}`;
}
