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

Your request #{{reference}} is ready for the next step. {{agentName}} has prepared your {{paymentLabel}} payment instructions.

Request reference: {{reference}}
Selected payment method: {{selectedMethod}}
Amount: {{amount}}

Review the current payment details using your personal link:
{{secureLink}}

These instructions are valid for 20 minutes from issue, until {{expiry}}. Please check the recipient, amount and reference before paying. Use only the details shown in this link; they may change when new instructions are issued.

If the link has expired, do not pay using the old details. Ask your agent for a new link through My Requests. Your client account will remain accessible.

After payment, submit the confirmation reference in My Requests. Our team will check it with the payment provider before confirming your order. Opening this link does not confirm payment.

Need help? Contact your assigned agent through the messaging section of your request. Never send passwords or card numbers by email.

Thank you for choosing ParrotRehome.
The ParrotRehome team`,
  },
  "payment-reminder": {
    subject: "Payment instructions expiring soon — Request #{{reference}}",
    body: `Dear {{customerName}},

We have not yet received a payment confirmation reference for request #{{reference}}. The current {{paymentLabel}} payment instructions expire at {{expiry}}.

If you have already paid, please do not pay again. Submit your payment reference through My Requests so our team can verify it.

If you still wish to proceed, review your current payment instructions here before making a payment:
{{secureLink}}

If the instructions expire, do not use the old payment details. Contact your agent for new instructions. Your account remains accessible.

Need help? Reply to this email or use your request conversation.
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
export const emailVariables = ["customerName", "reference", "message", "paymentLabel", "selectedMethod", "agentName", "expiry", "secureLink", "amount"];
const location = () => path.resolve(process.env.EMAIL_TEMPLATES_FILE || "var/email-templates.json");

export function readEmailTemplates(): Record<EditableEmailTemplate, EmailTemplateContent> {
  let overrides: Partial<Record<EditableEmailTemplate, EmailTemplateContent>> = {};
  try { overrides = JSON.parse(readFileSync(location(), "utf8")); }
  catch (err) { if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err; }
  return { ...defaultEmailTemplates, ...overrides };
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
