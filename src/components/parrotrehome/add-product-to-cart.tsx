"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-store";
import { toast } from "sonner";
import { Check, ShoppingCart } from "lucide-react";

interface Product {
  id: string;
  name: string;
  priceUsd: number;
  stockQty: number;
}

export function AddProductToCart({ product }: { product: Product }) {
  const cart = useCart();
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);

  function add() {
    cart.add({
      type: "PRODUCT",
      refId: product.id,
      name: product.name,
      priceUsd: Number(product.priceUsd),
      qty,
    });
    setAdded(true);
    toast.success(`${qty} × ${product.name} added to your request cart.`);
    setTimeout(() => setAdded(false), 2200);
  }

  const outOfStock = product.stockQty <= 0;

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center gap-2">
        <label htmlFor={`qty-${product.id}`} className="sr-only">
          Quantity for {product.name}
        </label>
        <input
          id={`qty-${product.id}`}
          type="number"
          min={1}
          max={Math.max(1, product.stockQty)}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
          className="w-16 h-10 px-2 rounded-md border border-feather/30 bg-ivory text-[14px] text-center focus-ring"
          disabled={outOfStock}
        />
        <button
          type="button"
          onClick={add}
          disabled={outOfStock}
          className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full bg-forest hover:bg-forest-dark text-white text-[13px] font-body font-semibold transition-colors focus-ring disabled:bg-feather/30 disabled:text-feather disabled:cursor-not-allowed"
        >
          {added ? (
            <>
              <Check className="h-4 w-4" aria-hidden /> Added
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" aria-hidden /> Add to cart
            </>
          )}
        </button>
      </div>
    </div>
  );
}
