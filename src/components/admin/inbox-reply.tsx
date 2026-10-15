"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
export function InboxReply({ id }: { id: string }) {
  const router = useRouter(); const [body, setBody] = useState(""); const [pending, setPending] = useState(false); const [status, setStatus] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setPending(true); setStatus("");
    try { const response = await fetch(`/api/admin/inbox/${id}/reply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Reply failed"); setStatus(data.status === "SENT" ? "Reply accepted by Resend." : "Preview saved; no email was sent."); setBody(""); router.refresh(); }
    catch (error) { setStatus(error instanceof Error ? error.message : "Reply failed"); } finally { setPending(false); }
  }
  return <form onSubmit={submit} className="space-y-3 mt-5"><label className="block text-sm">Your reply<textarea required minLength={2} maxLength={10000} rows={5} value={body} onChange={event => setBody(event.target.value)} className="mt-2 block w-full rounded-lg border p-3" /></label><button disabled={pending} className="rounded-full bg-tail-red px-5 py-2 text-white disabled:opacity-50">{pending ? "Sending…" : "Send reply"}</button><p role="status" className="text-sm">{status}</p></form>;
}
