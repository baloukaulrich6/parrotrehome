"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ============================================================
// ParrotRehome — Request cart store (F-07)
// Multi-item request cart WITHOUT immediate payment.
// Persisted to localStorage so weak network / refresh never
// loses draft (Cahier p.09 / Charte p.09 mobile behavior).
// ============================================================

export interface CartItem {
  type: "BIRD" | "PRODUCT" | "CONSULTATION";
  refId: string;             // bird.id / product.id / "consultation"
  name: string;
  priceUsd: number;          // quoted USD
  qty: number;
  meta?: Record<string, unknown>; // appointment slot, subject, etc.
  image?: string;
}

interface CartState {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (refId: string) => void;
  updateQty: (refId: string, qty: number) => void;
  clear: () => void;
  totalUsd: () => number;
  count: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) =>
        set((s) => {
          // Birds are unique individuals — never add twice
          if (item.type === "BIRD") {
            const exists = s.items.find((i) => i.refId === item.refId);
            if (exists) return s;
          }
          // Products — increment qty
          const existing = s.items.find((i) => i.refId === item.refId);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.refId === item.refId ? { ...i, qty: i.qty + item.qty } : i
              ),
            };
          }
          return { items: [...s.items, item] };
        }),
      remove: (refId) =>
        set((s) => ({ items: s.items.filter((i) => i.refId !== refId) })),
      updateQty: (refId, qty) =>
        set((s) => ({
          items: s.items
            .map((i) => (i.refId === refId ? { ...i, qty: Math.max(1, qty) } : i))
            .filter((i) => i.qty > 0),
        })),
      clear: () => set({ items: [] }),
      totalUsd: () =>
        get().items.reduce((sum, i) => sum + i.priceUsd * i.qty, 0),
      count: () => get().items.reduce((n, i) => n + i.qty, 0),
    }),
    {
      name: "parrotrehome-cart",
      version: 1,
    }
  )
);
