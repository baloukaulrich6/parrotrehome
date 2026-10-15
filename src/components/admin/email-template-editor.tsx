"use client";
import { useState } from "react";
import { toast } from "sonner";
import { renderEmailHtml } from "@/lib/email-design";

export function EmailTemplateEditor({ name, initial, canEdit }: {
  name: "request-received" | "instructions-ready"; initial: { subject: string; body: string }; canEdit: boolean;
}) {
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [saving, setSaving] = useState(false);
  const variables: Record<string, string> = {
    customerName: "Alex Morgan", reference: "DEMO-001", paymentLabel: "CHMK", selectedMethod: "CHMK",
    agentName: "Your ParrotRehome agent", amount: "$250.00 USD", expiry: "20 minutes after issue (UTC)",
    secureLink: "https://example.com/demo-payment", message: "Dear Alex,\n\nWe have received your request #DEMO-001. Our team will review availability and contact you with the next steps. No payment is confirmed yet.\n\nThank you,\nThe ParrotRehome team",
  };
  const substitute = (text: string) => text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] || "");
  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/email-templates", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, subject, body }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Email template saved.");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Save failed"); }
    finally { setSaving(false); }
  }
  return <section className="bg-white rounded-xl border border-feather/20 p-5 space-y-3">
    <h2 className="font-heading text-xl text-slate">{name === "instructions-ready" ? "Payment instructions" : "Request received"}</h2>
    <label className="block text-sm">Subject<input value={subject} disabled={!canEdit} onChange={(e) => setSubject(e.target.value)} className="block w-full border rounded-md p-2 mt-1" /></label>
    <label className="block text-sm">Message<textarea value={body} disabled={!canEdit} onChange={(e) => setBody(e.target.value)} rows={12} className="block w-full border rounded-md p-2 mt-1" /></label>
    <p className="text-xs text-feather">Variables: {Object.keys(variables).map((key) => `{{${key}}}`).join(", ")}</p>
    {canEdit && <button disabled={saving} onClick={save} className="bg-tail-red text-white rounded-full px-5 py-2">{saving ? "Saving…" : "Save template"}</button>}
    <p className="text-sm text-forest">Demo preview — sample data, no email sent.</p>
    <iframe title={`${name} email preview`} sandbox="" srcDoc={renderEmailHtml(substitute(subject), substitute(body))} className="w-full h-[650px] rounded-lg border" />
  </section>;
}
