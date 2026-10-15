"use client";
import { useState, type FormEvent } from "react";
import { signOut } from "next-auth/react";
export function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState(""); const [newPassword, setNewPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [pending, setPending] = useState(false); const [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setMessage("");
    if (newPassword !== confirm) { setMessage("New passwords do not match."); return; }
    setPending(true);
    try { const response = await fetch("/api/account/password", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to change password."); await signOut({ callbackUrl: "/sign-in?password=changed" }); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to change password."); } finally { setPending(false); }
  }
  return <form onSubmit={submit} className="bg-white border rounded-xl p-6 space-y-4"><h2 className="font-heading text-xl">Change my password</h2><p className="text-sm text-feather">This changes only your own password. Enter at least 12 characters. You will need to sign in again on your devices.</p>
    <label className="block text-sm">Current password<input type="password" required autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className="block mt-1 w-full p-3 rounded-lg border" /></label>
    <label className="block text-sm">New password<input type="password" required minLength={12} maxLength={72} autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} className="block mt-1 w-full p-3 rounded-lg border" /></label>
    <label className="block text-sm">Confirm new password<input type="password" required minLength={12} maxLength={72} autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} className="block mt-1 w-full p-3 rounded-lg border" /></label>
    <p role="status" className="text-sm text-tail-red">{message}</p><button disabled={pending} className="rounded-full bg-tail-red text-white px-5 py-3 disabled:opacity-50">{pending ? "Saving…" : "Change my password"}</button>
  </form>;
}
