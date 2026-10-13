"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-store";
import { toast } from "sonner";
import { ShoppingCart, Check } from "lucide-react";

interface AddBirdToCartProps {
  bird: {
    id: string;
    commonName: string;
    priceUsd: number | null;
    status: string;
  };
}

export function AddBirdToCart({ bird }: AddBirdToCartProps) {
  const cart = useCart();
  const router = useRouter();
  const [added, setAdded] = useState(false);

  const isAvailable = bird.status === "AVAILABLE";

  function handleAdd() {
    if (!isAvailable) {
      toast.error("This bird is not currently available for request.");
      return;
    }
    cart.add({
      type: "BIRD",
      refId: bird.id,
      name: bird.commonName,
      priceUsd: Number(bird.priceUsd ?? 0),
      qty: 1,
    });
    setAdded(true);
    toast.success(`${bird.commonName} added to your request cart.`);
    setTimeout(() => setAdded(false), 2200);
  }

  if (!isAvailable) {
    return (
      <button
        type="button"
        disabled
        className="w-full inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-feather/30 text-feather text-[15px] font-body font-semibold cursor-not-allowed"
      >
        Currently {bird.status.toLowerCase()}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleAdd}
        className="w-full inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-tail-red hover:bg-tail-red-dark text-white text-[15px] font-body font-semibold transition-colors focus-ring shadow-sm"
      >
        {added ? (
          <>
            <Check className="h-4 w-4" aria-hidden /> Added to cart
          </>
        ) : (
          <>
            <ShoppingCart className="h-4 w-4" aria-hidden /> Add to request cart
          </>
        )}
      </button>
      <button
        type="button"
        onClick={() => {
          handleAdd();
          setTimeout(() => router.push("/cart"), 600);
        }}
        className="w-full inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full border border-slate/30 hover:bg-slate/5 text-slate text-[15px] font-body font-semibold transition-colors focus-ring"
      >
        Request this bird now
      </button>
    </div>
  );
}
