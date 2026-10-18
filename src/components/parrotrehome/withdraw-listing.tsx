"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function WithdrawListing({ id }: { id: string }) {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const router = useRouter();
  return <div><button disabled={busy} className="text-sm underline text-tail-red" onClick={async () => { setBusy(true); try { const response = await fetch(`/api/seller/listings/${id}`, { method: "DELETE" }); if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || "Withdrawal failed"); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Withdrawal failed"); } finally { setBusy(false); } }}>Withdraw listing</button><p role="status" className="text-sm">{message}</p></div>;
}
