"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export function DeleteProductButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function confirm() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(`${productName} deleted.`);
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
        <button
          className="inline-flex items-center gap-1 text-feather hover:text-tail-red text-[12px] font-body font-semibold"
          aria-label={`Delete ${productName}`}
        >
          <Trash2 className="h-3 w-3" /> Delete
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading text-slate">Delete product?</DialogTitle>
        </DialogHeader>
        <p className="text-[14px] font-body text-feather mb-4">
          You are about to permanently delete <strong className="text-slate">{productName}</strong> from your catalog.
          This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-10 px-4 rounded-md border border-feather/30 hover:bg-feather/10 text-slate text-[13px] font-body font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={submitting}
            className="h-10 px-4 rounded-md bg-tail-red hover:bg-tail-red-dark text-white text-[13px] font-body font-semibold disabled:bg-feather/40"
          >
            {submitting ? "Deleting..." : "Yes, delete"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
