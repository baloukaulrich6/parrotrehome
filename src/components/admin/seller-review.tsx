"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function SellerReview({ id }: { id: string }) {
  const router = useRouter();
  const [verified, setVerified] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(approve: boolean) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/seller-listings/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(approve ? { decision: "APPROVE", coordinatesVerified: verified } : { decision: "REJECT", note }) });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || "Review failed. Reload the page to check the current status.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Review failed"); }
    finally { setBusy(false); }
  }
  return <div className="space-y-3"><label className="flex gap-2 text-sm"><input type="checkbox" checked={verified} onChange={event => setVerified(event.target.checked)} />I verified the seller's contact details, payout recipient, ownership and listing information.</label><button disabled={busy || !verified} onClick={() => submit(true)} className="rounded bg-forest px-4 py-2 text-white disabled:opacity-50">Approve and publish</button><textarea aria-label="Rejection reason visible to seller" placeholder="Reason for rejection (visible to seller)" value={note} onChange={event => setNote(event.target.value)} maxLength={1000} className="block w-full border rounded p-2" /><button disabled={busy || note.trim().length < 5} onClick={() => submit(false)} className="rounded border px-4 py-2 disabled:opacity-50">Reject listing</button><p role="status" className="text-sm text-tail-red">{message}</p></div>;
}
