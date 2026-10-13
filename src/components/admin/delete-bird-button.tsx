"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export function DeleteBirdButton({
  birdId,
  birdName,
}: {
  birdId: string;
  birdName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function confirm() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/birds/${birdId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(`${birdName} deleted.`);
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
          aria-label={`Delete ${birdName}`}
        >
          <Trash2 className="h-3 w-3" /> Delete
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading text-slate">Delete bird dossier?</DialogTitle>
        </DialogHeader>
        <p className="text-[14px] font-body text-feather mb-2">
          You are about to permanently delete <strong className="text-slate">{birdName}</strong>.
          This action:
        </p>
        <ul className="text-[13px] font-body text-feather space-y-1 mb-4 list-disc pl-5">
          <li>Removes the bird dossier from your inventory</li>
          <li>Writes a DELETE action to the immutable audit log</li>
          <li>Cannot be undone</li>
        </ul>
        <div className="bg-tail-red/5 border border-tail-red/20 rounded-md p-3 text-[12px] font-body text-slate mb-4">
          <strong>Note:</strong> Reserved birds cannot be deleted. Cancel the active request first to release the bird.
        </div>
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
