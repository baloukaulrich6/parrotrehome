"use client";

import { useSyncExternalStore, useState } from "react";
import { useFavorites } from "@/lib/favorites-store";
import { Heart } from "lucide-react";

interface FavoriteToggleProps {
  refId: string;
  type: "BIRD" | "PRODUCT";
  name: string;
  image?: string;
  priceUsd?: number;
  className?: string;
  size?: "sm" | "md";
}

// SSR-safe favorite check using useSyncExternalStore
function useIsFavorite(refId: string): boolean {
  return useSyncExternalStore(
    (cb) => useFavorites.subscribe(cb),
    () => useFavorites.getState().items.some((i) => i.refId === refId),
    () => false // server snapshot — always false on SSR
  );
}

export function FavoriteToggle({
  refId,
  type,
  name,
  image,
  priceUsd,
  className = "",
  size = "md",
}: FavoriteToggleProps) {
  const toggle = useFavorites((s) => s.toggle);
  const isFav = useIsFavorite(refId);

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggle({ refId, type, name, image, priceUsd });
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={isFav}
      aria-label={isFav ? `Remove ${name} from favorites` : `Add ${name} to favorites`}
      className={`inline-flex items-center justify-center transition-colors focus-ring rounded-full ${
        size === "sm" ? "h-8 w-8" : "h-9 w-9"
      } ${
        isFav
          ? "text-tail-red hover:bg-tail-red/10"
          : "text-feather hover:bg-feather/10 hover:text-tail-red"
      } ${className}`}
    >
      <Heart
        className={iconSize}
        fill={isFav ? "currentColor" : "none"}
        aria-hidden
      />
    </button>
  );
}

// Stateless count hook for headers / badges
export function useFavoritesCount(): number {
  return useSyncExternalStore(
    (cb) => useFavorites.subscribe(cb),
    () => useFavorites.getState().items.length,
    () => 0
  );
}
