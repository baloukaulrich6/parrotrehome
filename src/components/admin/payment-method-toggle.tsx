"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export function PaymentMethodToggle({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [checked, setChecked] = useState(active);

  async function toggle(v: boolean) {
    setChecked(v);
    try {
      const res = await fetch(`/api/admin/payment-methods/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: v }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(v ? "Method enabled." : "Method disabled.");
      router.refresh();
    } catch (err) {
      setChecked(!v);
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={toggle} aria-label="Toggle active" />
      <span className={`text-[12px] font-body font-semibold ${checked ? "text-forest" : "text-feather"}`}>
        {checked ? "Active" : "Disabled"}
      </span>
    </div>
  );
}
