"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function PaymentMethodEditor({ method }: { method?: { id: string; name: string; officialProvider: string; instructionsTemplate: string } }) {
  const router = useRouter();
  const [name, setName] = useState(method?.name || "");
  const [provider, setProvider] = useState(method?.officialProvider || "");
  const [template, setTemplate] = useState(method?.instructionsTemplate || "Reference: {{requestReference}}\nAmount: USD {{totalQuoteUsd}}\nRecipient details: ");
  const [active, setActive] = useState(false);
  const [saving, setSaving] = useState(false);
  return <details className="mt-3" open={!method}><summary className="text-sm text-forest cursor-pointer">{method ? "Edit payment details and template" : "Add a payment method"}</summary>
    <form className="space-y-3 mt-3" onSubmit={async (event) => {
      event.preventDefault(); setSaving(true);
      try {
        const response = await fetch(method ? `/api/admin/payment-methods/${method.id}` : "/api/admin/payment-methods", { method: method ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, officialProvider: provider, instructionsTemplate: template, ...(!method ? { active } : {}) }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Save failed");
        toast.success(method ? "Payment template updated. Previously emailed details cannot be withdrawn." : "Payment method created.");
        if (!method) { setName(""); setProvider(""); setActive(false); }
        router.refresh();
      } catch (error) { toast.error(error instanceof Error ? error.message : "Save failed"); }
      finally { setSaving(false); }
    }}>
      <label className="block text-sm">Name<input required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className="block w-full border rounded p-2 mt-1" /></label>
      <label className="block text-sm">Provider<input required maxLength={100} value={provider} onChange={(e) => setProvider(e.target.value)} className="block w-full border rounded p-2 mt-1" /></label>
      <label className="block text-sm">Instruction template<textarea required minLength={20} maxLength={5000} rows={7} value={template} onChange={(e) => setTemplate(e.target.value)} className="block w-full border rounded p-2 mt-1" /></label>
      <p className="text-xs text-feather">Review the actual recipient and amount for each client. Changing this template affects future emails. Review each customer’s details before sending.</p>
      {!method && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)} />Active — available to customers</label>}
      <button disabled={saving} className="bg-tail-red text-white px-4 py-2 rounded-full">{saving ? "Saving…" : method ? "Save payment template" : "Create payment method"}</button>
    </form>
  </details>;
}
