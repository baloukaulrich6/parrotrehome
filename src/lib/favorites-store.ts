"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ============================================================
// ParrotRehome — Favorites store (F-09 V2)
// Persisted to localStorage. Mark/unmark birds & products.
// Comparison view (F-09 second part) deferred — UI in /favorites.
// ============================================================

export interface FavoriteItem {
  refId: string;
  type: "BIRD" | "PRODUCT";
  name: string;
  image?: string;
  priceUsd?: number;
  addedAt: string; // ISO
}

interface FavoritesState {
  items: FavoriteItem[];
  toggle: (item: FavoriteItem) => void;
  isFavorite: (refId: string) => boolean;
  remove: (refId: string) => void;
  clear: () => void;
  count: () => number;
}

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (item) =>
        set((s) => {
          const exists = s.items.find((i) => i.refId === item.refId);
          if (exists) {
            return { items: s.items.filter((i) => i.refId !== item.refId) };
          }
          return { items: [...s.items, { ...item, addedAt: new Date().toISOString() }] };
        }),
      isFavorite: (refId) => get().items.some((i) => i.refId === refId),
      remove: (refId) =>
        set((s) => ({ items: s.items.filter((i) => i.refId !== refId) })),
      clear: () => set({ items: [] }),
      count: () => get().items.length,
    }),
    {
      name: "parrotrehome-favorites",
      version: 1,
    }
  )
);
