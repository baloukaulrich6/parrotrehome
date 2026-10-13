"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CouponData {
  id?: string;
  code?: string;
  description?: string;
  type?: "PERCENTAGE" | "FLAT_USD" | "FREE_SHIPPING";
  value?: number;
  active?: boolean;
  validFrom?: string;
  validUntil?: string | null;
  usageLimit?: number | null;
  minSubtotalUsd?: number | null;
  usedCount?: number;
}

function emptyForm() {
  return {
    code: "",
    description: "",
    type: "PERCENTAGE" as const,
    value: 10,
    active: true,
    validUntil: "",
    usageLimit: "",
    minSubtotalUsd: "",
  };
}

export function CouponCreateButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm());

  function update<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.match(/^[A-Z0-9_-]+$/)) {
      toast.error("Code must be uppercase A-Z, 0-9, _ or -");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.toUpperCase(),
          description: form.description || undefined,
          type: form.type,
          value: Number(form.value),
          active: form.active,
          validUntil: form.validUntil || undefined,
          usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
          minSubtotalUsd: form.minSubtotalUsd ? Number(form.minSubtotalUsd) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(`Coupon ${form.code} created.`);
      setOpen(false);
      setForm(emptyForm());
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-tail-red hover:bg-tail-red-dark text-white text-[13px] font-body font-semibold">
          <Plus className="h-4 w-4" /> Create coupon
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading text-slate">Create coupon</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Code *</label>
            <input
              type="text"
              required
              pattern="[A-Z0-9_-]+"
              value={form.code}
              onChange={(e) => update("code", e.target.value.toUpperCase())}
              placeholder="e.g., WELCOME10"
              className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] font-mono focus-ring uppercase"
            />
          </div>
          <div>
            <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Description (optional)</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="e.g., 10% off for new customers"
              className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Type</label>
              <select value={form.type} onChange={(e) => update("type", e.target.value as "PERCENTAGE" | "FLAT_USD" | "FREE_SHIPPING")} className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring">
                <option value="PERCENTAGE">Percentage off</option>
                <option value="FLAT_USD">Flat USD off</option>
                <option value="FREE_SHIPPING">Free shipping</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">
                Value {form.type === "PERCENTAGE" ? "(%)" : form.type === "FLAT_USD" ? "(USD)" : "(1 = on)"}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.value}
                onChange={(e) => update("value", Number(e.target.value))}
                className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Valid until</label>
              <input type="date" value={form.validUntil} onChange={(e) => update("validUntil", e.target.value)} className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
            </div>
            <div>
              <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Usage limit</label>
              <input type="number" min="1" value={form.usageLimit} onChange={(e) => update("usageLimit", e.target.value)} placeholder="∞" className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
            </div>
            <div>
              <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Min subtotal</label>
              <input type="number" step="0.01" min="0" value={form.minSubtotalUsd} onChange={(e) => update("minSubtotalUsd", e.target.value)} placeholder="0" className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-[13px] font-body text-slate cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={(e) => update("active", e.target.checked)} className="h-4 w-4 rounded text-tail-red focus-ring" />
            Active (customers can apply this coupon)
          </label>
          <div className="flex justify-end gap-2 pt-2 border-t border-feather/15">
            <button type="button" onClick={() => setOpen(false)} className="h-10 px-4 rounded-md border border-feather/30 hover:bg-feather/10 text-slate text-[13px] font-body font-semibold">Cancel</button>
            <button type="submit" disabled={submitting} className="h-10 px-4 rounded-md bg-tail-red hover:bg-tail-red-dark text-white text-[13px] font-body font-semibold disabled:bg-feather/40">
              {submitting ? "Saving..." : "Create coupon"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CouponEditButton({ coupon }: { coupon: CouponData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    code: coupon.code ?? "",
    description: coupon.description ?? "",
    type: (coupon.type ?? "PERCENTAGE") as "PERCENTAGE" | "FLAT_USD" | "FREE_SHIPPING",
    value: coupon.value ?? 0,
    active: coupon.active ?? true,
    validUntil: coupon.validUntil ? new Date(coupon.validUntil).toISOString().slice(0, 10) : "",
    usageLimit: coupon.usageLimit?.toString() ?? "",
    minSubtotalUsd: coupon.minSubtotalUsd?.toString() ?? "",
  });

  function update<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.toUpperCase(),
          description: form.description || undefined,
          type: form.type,
          value: Number(form.value),
          active: form.active,
          validUntil: form.validUntil || undefined,
          usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
          minSubtotalUsd: form.minSubtotalUsd ? Number(form.minSubtotalUsd) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Coupon updated.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1 text-tail-red text-[12px] font-body font-semibold hover:underline">
          <Pencil className="h-3 w-3" /> Edit
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading text-slate">Edit coupon · {coupon.code}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Code</label>
            <input type="text" required value={form.code} onChange={(e) => update("code", e.target.value.toUpperCase())} className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] font-mono focus-ring uppercase" />
          </div>
          <div>
            <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Description</label>
            <input type="text" value={form.description} onChange={(e) => update("description", e.target.value)} className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Type</label>
              <select value={form.type} onChange={(e) => update("type", e.target.value as "PERCENTAGE" | "FLAT_USD" | "FREE_SHIPPING")} className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring">
                <option value="PERCENTAGE">Percentage off</option>
                <option value="FLAT_USD">Flat USD off</option>
                <option value="FREE_SHIPPING">Free shipping</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Value</label>
              <input type="number" step="0.01" min="0" required value={form.value} onChange={(e) => update("value", Number(e.target.value))} className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Valid until</label>
              <input type="date" value={form.validUntil} onChange={(e) => update("validUntil", e.target.value)} className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
            </div>
            <div>
              <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Usage limit</label>
              <input type="number" min="1" value={form.usageLimit} onChange={(e) => update("usageLimit", e.target.value)} placeholder="∞" className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
            </div>
            <div>
              <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Min subtotal</label>
              <input type="number" step="0.01" min="0" value={form.minSubtotalUsd} onChange={(e) => update("minSubtotalUsd", e.target.value)} placeholder="0" className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-[13px] font-body text-slate cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={(e) => update("active", e.target.checked)} className="h-4 w-4 rounded text-tail-red focus-ring" />
            Active
          </label>
          <div className="flex justify-end gap-2 pt-2 border-t border-feather/15">
            <button type="button" onClick={() => setOpen(false)} className="h-10 px-4 rounded-md border border-feather/30 hover:bg-feather/10 text-slate text-[13px] font-body font-semibold">Cancel</button>
            <button type="submit" disabled={submitting} className="h-10 px-4 rounded-md bg-tail-red hover:bg-tail-red-dark text-white text-[13px] font-body font-semibold disabled:bg-feather/40">
              {submitting ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CouponDeleteButton({ couponId, code }: { couponId: string; code: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function del() {
    if (!confirm(`Deactivate coupon "${code}"?\n\nThis will prevent new customers from using it. Existing requests keep their discount.`)) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/coupons/${couponId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Coupon deactivated.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={del}
      disabled={submitting}
      className="inline-flex items-center gap-1 text-feather hover:text-tail-red text-[12px] font-body font-semibold disabled:opacity-50"
    >
      <Trash2 className="h-3 w-3" /> Deactivate
    </button>
  );
}
