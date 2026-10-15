"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function PaymentMethodEditor({ method }: { method: { id: string; name: string; officialProvider: string; instructionsTemplate: string } }) {
  const router = useRouter();
  const [name, setName] = useState(method.name);
  const [provider, setProvider] = useState(method.officialProvider);
  const [template, setTemplate] = useState(method.instructionsTemplate);
  const [saving, setSaving] = useState(false);
  return <details className="mt-3"><summary className="text-sm text-forest cursor-pointer">Edit payment details and template</summary>
    <form className="space-y-3 mt-3" onSubmit={async (event) => {
      event.preventDefault(); setSaving(true);
      try {
        const response = await fetch(`/api/admin/payment-methods/${method.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, officialProvider: provider, instructionsTemplate: template }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Save failed");
        toast.success("Payment template updated. Already issued instructions stay unchanged until reissued.");
        router.refresh();
      } catch (error) { toast.error(error instanceof Error ? error.message : "Save failed"); }
      finally { setSaving(false); }
    }}>
      <label className="block text-sm">Name<input required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className="block w-full border rounded p-2 mt-1" /></label>
      <label className="block text-sm">Provider<input required maxLength={100} value={provider} onChange={(e) => setProvider(e.target.value)} className="block w-full border rounded p-2 mt-1" /></label>
      <label className="block text-sm">Instruction template<textarea required minLength={20} maxLength={5000} rows={7} value={template} onChange={(e) => setTemplate(e.target.value)} className="block w-full border rounded p-2 mt-1" /></label>
      <p className="text-xs text-feather">Review the actual recipient and amount for each client. Changing this template affects future instructions; issue a new link to replace previous instructions.</p>
      <button disabled={saving} className="bg-tail-red text-white px-4 py-2 rounded-full">{saving ? "Saving…" : "Save payment template"}</button>
    </form>
  </details>;
}
