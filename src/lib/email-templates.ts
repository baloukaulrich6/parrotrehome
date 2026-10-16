import { readFileSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { renderEmailHtml } from "./email-design";

export const defaultEmailTemplates = {
  "request-received": {
    subject: "Request #{{reference}} received — ParrotRehome",
    body: "{{message}}",
  },
  "instructions-ready": {
    subject: "{{paymentLabel}} payment instructions — Request #{{reference}}",
    body: `Dear {{customerName}},

We have reviewed request #{{reference}}. {{agentName}} has prepared the details for your selected payment method.

Request reference: {{reference}}
Payment method: {{selectedMethod}}
Amount: {{amount}}

PAYMENT DETAILS
{{paymentDetails}}

VALIDITY
These payment instructions are valid for {{validityMinutes}} minutes from issue, until {{expiry}}. Check the recipient, amount and reference before paying. After this time, do not use the old details; contact our team for current instructions. Your client account remains accessible.

AFTER PAYMENT
Reply to this email with your payment confirmation reference so our team can verify it. If you have already paid, do not send a second payment. Sending a reference does not confirm payment until our team verifies receipt.

NEED HELP?
Reply to this email or contact {{supportEmail}}. Never send your password, card number or online banking login details.

Thank you for choosing ParrotRehome.
The ParrotRehome team`,
  },
  "payment-reminder": {
    subject: "Payment instructions expiring soon — Request #{{reference}}",
    body: `Dear {{customerName}},

We have not yet received a payment confirmation reference for request #{{reference}}. The {{paymentLabel}} instructions below expire at {{expiry}}.

PAYMENT DETAILS
{{paymentDetails}}

If you have already paid, do not pay again. Reply to this email with your payment reference so our team can verify it.

If you have not paid and still wish to proceed, check the recipient, amount and reference before using the current instructions. After expiry, do not use these details; contact {{supportEmail}} for updated instructions. Your account remains accessible.

Need help? Reply to this email or contact {{supportEmail}}.
The ParrotRehome team`,
  },
  "payment-reference-received": {
    subject: "Payment reference received — Request #{{reference}}",
    body: `Dear {{customerName}},

We have received the payment reference submitted for request #{{reference}}. Our team will verify it with the payment provider.

This is an acknowledgement of your submission, not a confirmation that funds have been received. Please do not send a second payment while verification is in progress.

You can follow your request or contact your agent here:
{{secureLink}}

We will email you once verification is complete.
The ParrotRehome team`,
  },
  "payment-verified": {
    subject: "Payment verified — Request #{{reference}}",
    body: `Dear {{customerName}},

Our team has verified receipt of your payment for request #{{reference}}. Your request is now marked Payment verified.

We are preparing the next steps and will contact you with the applicable collection, delivery or appointment details. This message does not confirm a shipping date.

View your request:
{{secureLink}}

Thank you for your trust. If you have any questions, reply to this email or contact your agent through your request.
The ParrotRehome team`,
  },
  "agent-reply": {
    subject: "A message from your agent — Request #{{reference}}",
    body: `Dear {{customerName}},

Your ParrotRehome team has sent an update about request #{{reference}}:

{{message}}

View the conversation and reply:
{{secureLink}}

You may also reply to this email. Please keep the request reference in the subject.
The ParrotRehome team`,
  },
} as const;
export type EditableEmailTemplate = keyof typeof defaultEmailTemplates;
export type EmailTemplateContent = { subject: string; body: string };
export const emailVariables = ["customerName", "reference", "message", "paymentLabel", "selectedMethod", "agentName", "expiry", "secureLink", "amount", "paymentDetails", "validityMinutes", "supportEmail"];
const location = () => path.resolve(process.env.EMAIL_TEMPLATES_FILE || "var/email-templates.json");

export function readEmailTemplates(): Record<EditableEmailTemplate, EmailTemplateContent> {
  let overrides: Partial<Record<EditableEmailTemplate, EmailTemplateContent>> = {};
  try { overrides = JSON.parse(readFileSync(location(), "utf8")); }
  catch (err) { if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err; }
  const templates = { ...defaultEmailTemplates, ...overrides };
  // Upgrade link-only payment templates from installed versions to direct-detail emails.
  for (const name of ["instructions-ready", "payment-reminder"] as const) {
    if (!templates[name].body.includes("{{paymentDetails}}") || templates[name].body.includes("{{secureLink}}")) {
      templates[name] = { ...templates[name], body: defaultEmailTemplates[name].body };
    }
  }
  return templates;
}

export function saveEmailTemplate(name: EditableEmailTemplate, content: EmailTemplateContent) {
  const templates = readEmailTemplates();
  templates[name] = content;
  mkdirSync(path.dirname(location()), { recursive: true });
  const temporary = `${location()}.${randomUUID()}.tmp`;
  writeFileSync(temporary, JSON.stringify(templates, null, 2), { mode: 0o600 });
  renameSync(temporary, location());
}

export function resolveEmailTemplate(name: EditableEmailTemplate, variables: Record<string, string>) {
  const template = readEmailTemplates()[name];
  const resolve = (text: string) => text.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => variables[key] ?? "");
  const subject = resolve(template.subject).replace(/[\r\n]/g, " ");
  const body = resolve(template.body);
  return { subject, body, html: renderEmailHtml(subject, body, process.env.NEXTAUTH_URL) };
}
