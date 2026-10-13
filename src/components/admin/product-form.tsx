"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ProductCategory } from "@prisma/client";

interface ProductData {
  id?: string;
  name?: string;
  sku?: string;
  category?: ProductCategory;
  description?: string;
  dimensions?: string;
  compatibility?: string;
  priceUsd?: number | string;
  stockQty?: number | string;
  isActive?: boolean;
}

export function ProductFormDialog({
  mode,
  product,
  trigger,
}: {
  mode: "create" | "edit";
  product?: ProductData;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    category: (product?.category ?? "SUPPLY") as ProductCategory,
    description: product?.description ?? "",
    dimensions: product?.dimensions ?? "",
    compatibility: product?.compatibility ?? "",
    priceUsd: product?.priceUsd?.toString() ?? "",
    stockQty: product?.stockQty?.toString() ?? "0",
    isActive: product?.isActive ?? true,
  });

  function update<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        priceUsd: Number(form.priceUsd),
        stockQty: Number(form.stockQty),
        photos: "[]",
        features: "[]",
      };
      const url = mode === "create" ? "/api/admin/products" : `/api/admin/products/${product?.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(mode === "create" ? "Product created." : "Product updated.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  const defaultTrigger =
    mode === "create" ? (
      <button className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-tail-red hover:bg-tail-red-dark text-white text-[13px] font-body font-semibold">
        <Plus className="h-4 w-4" /> Add product
      </button>
    ) : (
      <button className="inline-flex items-center gap-1 text-tail-red text-[12px] font-body font-semibold hover:underline">
        Edit
      </button>
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-slate">
            {mode === "create" ? "Add new product" : "Edit product"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Name *</label>
              <input type="text" required value={form.name} onChange={(e) => update("name", e.target.value)} className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
            </div>
            <div>
              <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">SKU *</label>
              <input type="text" required value={form.sku} onChange={(e) => update("sku", e.target.value)} className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
            </div>
            <div>
              <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Category</label>
              <select value={form.category} onChange={(e) => update("category", e.target.value as ProductCategory)} className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring">
                <option value="CAGE">Cage</option>
                <option value="PERCH">Perch</option>
                <option value="TOY">Toy</option>
                <option value="FOOD">Food</option>
                <option value="SUPPLY">Supply</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Price USD *</label>
              <input type="number" step="0.01" min="0" required value={form.priceUsd} onChange={(e) => update("priceUsd", e.target.value)} className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
            </div>
            <div>
              <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Stock qty</label>
              <input type="number" min="0" value={form.stockQty} onChange={(e) => update("stockQty", e.target.value)} className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
            </div>
            <div>
              <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Dimensions</label>
              <input type="text" value={form.dimensions} onChange={(e) => update("dimensions", e.target.value)} className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => update("description", e.target.value)} className="mt-1 w-full px-3 py-2 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
          </div>
          <div>
            <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Compatibility</label>
            <input type="text" value={form.compatibility} onChange={(e) => update("compatibility", e.target.value)} placeholder="Species compatibility notes" className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-feather/15">
            <button type="button" onClick={() => setOpen(false)} className="h-10 px-4 rounded-md border border-feather/30 hover:bg-feather/10 text-slate text-[13px] font-body font-semibold">Cancel</button>
            <button type="submit" disabled={submitting} className="h-10 px-4 rounded-md bg-tail-red hover:bg-tail-red-dark text-white text-[13px] font-body font-semibold disabled:bg-feather/40">
              {submitting ? "Saving..." : mode === "create" ? "Create product" : "Save changes"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
