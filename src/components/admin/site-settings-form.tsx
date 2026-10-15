"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { siteSettingLabels, type SiteSettings } from "@/lib/site-settings-schema";
export function SiteSettingsForm({ initial }: { initial: SiteSettings }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setPending(true); setMessage("");
    try {
      const response = await fetch("/api/admin/site-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save settings.");
      setMessage("Settings saved. Public pages will show your changes when opened or refreshed."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save settings."); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="bg-white border border-feather/20 rounded-xl p-6 space-y-5 max-w-3xl">
    {Object.entries(siteSettingLabels).map(([key, label]) => <label key={key} className="block text-sm font-medium text-slate">{label}<input name={key} value={values[key as keyof SiteSettings]} onChange={e => setValues({ ...values, [key]: e.target.value })} type={key === "email" ? "email" : key.includes("Phone") || key === "phone" ? "tel" : "text"} required={key !== "secondaryPhone"} maxLength={key === "address" ? 500 : key === "email" ? 254 : key === "secondaryPhone" ? 100 : 200} className="mt-2 block w-full rounded-lg border border-feather/30 bg-ivory p-3" /></label>)}
    <p role="status" className="text-sm text-slate">{message}</p>
    <button type="submit" disabled={pending} className="rounded-full bg-tail-red px-6 py-3 text-white font-semibold disabled:opacity-50">{pending ? "Saving…" : "Save configuration"}</button>
  </form>;
}
