"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

type Account = { id: string; name: string | null; email: string; role: string; status: string };
export function StaffAccountForm({ managerOnly = false, account }: { managerOnly?: boolean; account?: Account }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(account?.name || "");
  const [email, setEmail] = useState(account?.email || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(account?.role || "AGENT");
  const [status, setStatus] = useState(account?.status || "ACTIVE");
  const roles = managerOnly ? ["AGENT"] : ["AGENT", "MANAGER", "STOCK_MANAGER", "AVIAN_PROFESSIONAL", "SUPER_ADMIN", "CLIENT"];
  return <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) setPassword(""); }}>
    <DialogTrigger asChild><button className={account ? "text-tail-red text-sm font-semibold" : "rounded-full bg-tail-red text-white px-5 py-3 text-sm font-semibold"}>{account ? "Edit account" : "Create account"}</button></DialogTrigger>
    <DialogContent><DialogHeader><DialogTitle>{account ? "Edit account" : "Create a platform account"}</DialogTitle></DialogHeader>
      <form className="space-y-4" onSubmit={async (event) => {
        event.preventDefault(); setBusy(true);
        try {
          const response = await fetch(account ? `/api/admin/users/${account.id}` : "/api/admin/users", { method: account ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(account ? { name, role, status } : { name, email, password, role }) });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Could not save the account");
          toast.success(account ? "Account updated." : role === "CLIENT" ? "Client created. Find them under Customers." : "Staff account created. MFA setup is required on first sign-in.");
          setPassword(""); setOpen(false); router.refresh();
        } catch (error) { toast.error(error instanceof Error ? error.message : "Save failed"); }
        finally { setBusy(false); }
      }}>
        <label className="block text-sm">Name<input required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className="block w-full border rounded-lg mt-1 p-3" /></label>
        <label className="block text-sm">Email<input type="email" required disabled={!!account} autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full border rounded-lg mt-1 p-3" /></label>
        {!account && <label className="block text-sm">Initial password<input required type="password" minLength={12} maxLength={72} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full border rounded-lg mt-1 p-3" /><span className="text-xs text-feather">At least 12 characters. Share these credentials securely; no invitation email is sent.</span></label>}
        <label className="block text-sm">Role<select value={role} onChange={(e) => setRole(e.target.value)} className="block w-full border rounded-lg mt-1 p-3">{roles.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
        {account && <label className="block text-sm">Status<select value={status} onChange={(e) => setStatus(e.target.value)} className="block w-full border rounded-lg mt-1 p-3"><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option></select></label>}
        <button disabled={busy} className="w-full bg-tail-red text-white p-3 rounded-full disabled:opacity-50">{busy ? "Saving…" : "Save account"}</button>
      </form>
    </DialogContent>
  </Dialog>;
}
