"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Clock } from "lucide-react";

export function ReviewModerationButtons({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<string | null>(null);

  async function moderate(action: "publish" | "reject") {
    setSubmitting(action);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(action === "publish" ? "Review published." : "Review rejected.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => moderate("publish")}
        disabled={submitting !== null}
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-forest hover:bg-forest-dark text-white text-[13px] font-body font-semibold disabled:bg-feather/40"
      >
        {submitting === "publish" ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        Publish
      </button>
      <button
        type="button"
        onClick={() => moderate("reject")}
        disabled={submitting !== null}
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-tail-red/30 hover:bg-tail-red/5 text-tail-red text-[13px] font-body font-semibold"
      >
        {submitting === "reject" ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
        Reject
      </button>
    </div>
  );
}
