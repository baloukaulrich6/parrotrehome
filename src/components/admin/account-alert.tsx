"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function AccountAlert({ userId, existing }: { userId: string; existing?: { status: string } }) {
  const [reviewed, setReviewed] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const router = useRouter();
  if (existing) return <span className="text-xs">Security advice: {existing.status}. See notification history.</span>;
  return <div className="space-y-2 min-w-48"><label className="flex gap-2 text-xs"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />I reviewed this account and approve one security advice email.</label><button disabled={!reviewed || busy} className="text-xs underline disabled:opacity-50" onClick={async () => { setBusy(true); try { const response = await fetch(`/api/admin/users/${userId}/security-alert`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reviewed: true }) }); const data = await response.json().catch(() => null); if (!response.ok) throw new Error(data?.error || "Alert failed"); setMessage(`Notification: ${data.status}`); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Alert failed"); } finally { setBusy(false); } }}>Send one-time security advice</button><p role="status" className="text-xs">{message}</p></div>;
}
export function RetryAccountEmail({ id }: { id: string }) {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const router = useRouter();
  return <div><button disabled={busy} className="underline text-sm" onClick={async () => { setBusy(true); try { const response = await fetch(`/api/admin/account-notifications/${id}`, { method: "POST" }); if (!response.ok) throw new Error("Retry unavailable"); const result = await response.json(); setMessage(`Delivery: ${result.status}`); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Retry failed"); } finally { setBusy(false); } }}>Retry this notification</button><p role="status" className="text-xs">{message}</p></div>;
}
