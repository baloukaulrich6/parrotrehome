"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, QrCode } from "lucide-react";
import { toast } from "sonner";

export function MfaSettingsDialog({ mfaEnabled, email }: { mfaEnabled: boolean; email: string }) {
  const [open, setOpen] = useState(false);
  const [secret, setSecret] = useState("");
  const [qr, setQr] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  async function act(action: "init" | "verify") {
    setBusy(true);
    try {
      const res = await fetch("/api/mfa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, token }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "MFA setup failed");
      if (action === "init") { setSecret(data.secret); setQr(data.qr); setToken(""); }
      else {
        toast.success("MFA enabled. Sign in with your password and authenticator code.");
        setSecret(""); setQr(""); setToken("");
        await signOut({ callbackUrl: "/sign-in?mfa=enabled" });
      }
    } catch (err) { toast.error(err instanceof Error ? err.message : "MFA setup failed"); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) { setSecret(""); setQr(""); setToken(""); } }}>
    <DialogTrigger asChild><button className="inline-flex items-center gap-2 rounded-md border border-forest/40 bg-ivory px-3 py-2 text-sm text-forest"><Shield className="h-4 w-4" />{mfaEnabled ? "MFA enabled" : "Set up MFA"}</button></DialogTrigger>
    <DialogContent><DialogHeader><DialogTitle>Authenticator protection</DialogTitle></DialogHeader>
      {mfaEnabled ? <div className="space-y-3"><p>MFA is active for {email}. Your password and authenticator code are required at sign-in.</p><p className="text-sm text-feather">If you lose your device, contact your server administrator for account recovery. MFA cannot be disabled from this session.</p></div> : <div className="space-y-4">
        <p className="text-sm">Install Google Authenticator, Microsoft Authenticator or 2FAS. Scan your personal QR code, then enter its 6-digit code. Setup expires after 10 minutes.</p>
        {qr && <><img src={qr} alt="Personal authenticator QR code" className="h-60 w-60 mx-auto" /><details><summary>Manual entry key</summary><code className="break-all text-sm">{secret}</code></details>
          <label className="block text-sm">Authenticator code<input autoComplete="one-time-code" inputMode="numeric" maxLength={6} value={token} onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))} className="block w-full border rounded-lg p-3 mt-1 tracking-widest" /></label>
          <button disabled={busy || token.length !== 6} onClick={() => act("verify")} className="w-full bg-forest text-white rounded-full p-3 disabled:opacity-50">Verify and enable MFA</button></>}
        <button disabled={busy} onClick={() => act("init")} className="inline-flex items-center gap-2 border border-forest rounded-full p-3 text-forest disabled:opacity-50"><QrCode className="h-4 w-4" />{busy ? "Please wait…" : qr ? "Generate a new QR code" : "Generate QR code"}</button>
      </div>}
    </DialogContent>
  </Dialog>;
}
