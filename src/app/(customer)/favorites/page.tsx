"use client";

import Link from "next/link";
import { useFavorites } from "@/lib/favorites-store";
import { useCart } from "@/lib/cart-store";
import { formatUsd } from "@/lib/constants";
import { Heart, Trash2, ShoppingCart, ArrowRight, Bird, Package } from "lucide-react";
import { toast } from "sonner";

export default function FavoritesPage() {
  const favs = useFavorites((s) => s.items);
  const removeFav = useFavorites((s) => s.remove);
  const clear = useFavorites((s) => s.clear);
  const cartAdd = useCart((s) => s.add);

  function moveToCart(item: typeof favs[number]) {
    if (item.type === "BIRD") {
      cartAdd({
        type: "BIRD",
        refId: item.refId,
        name: item.name,
        priceUsd: item.priceUsd ?? 0,
        qty: 1,
      });
    } else {
      cartAdd({
        type: "PRODUCT",
        refId: item.refId,
        name: item.name,
        priceUsd: item.priceUsd ?? 0,
        qty: 1,
      });
    }
    toast.success(`${item.name} moved to request cart.`);
  }

  if (favs.length === 0) {
    return (
      <div className="bg-ivory min-h-[60vh]">
        <section className="bg-white border-b border-feather/20 py-12">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <Heart className="h-12 w-12 text-feather mx-auto mb-4" aria-hidden />
            <h1 className="display-heading text-slate text-[36px] lg:text-[44px] mb-4">
              No favorites yet
            </h1>
            <p className="text-feather text-[15px] font-body max-w-md mx-auto mb-8">
              Tap the heart icon on any bird or product to save it here for
              later. Favorites are stored locally on this device.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/parrots" className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-tail-red hover:bg-tail-red-dark text-white text-[14px] font-body font-semibold transition-colors">
                Explore parrots <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/supplies" className="inline-flex items-center gap-2 h-11 px-6 rounded-full border border-slate/30 hover:bg-slate/5 text-slate text-[14px] font-body font-semibold transition-colors">
                Browse supplies
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="bg-ivory min-h-[60vh]">
      <section className="bg-white border-b border-feather/20 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="eyebrow mb-2 flex items-center gap-2">
              <Heart className="h-4 w-4 text-tail-red" aria-hidden /> Saved for later
            </p>
            <h1 className="display-heading text-slate text-[28px] lg:text-[36px]">
              Your favorites
            </h1>
            <p className="text-feather text-[14px] font-body mt-2">
              {favs.length} saved item{favs.length !== 1 ? "s" : ""} · stored locally on this device
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirm("Remove all favorites?")) {
                clear();
                toast.success("Favorites cleared.");
              }
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-feather/30 hover:bg-tail-red/5 hover:border-tail-red/30 hover:text-tail-red text-feather text-[12px] font-body font-semibold"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear all
          </button>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {favs.map((item) => (
            <article key={item.refId} className="bg-white rounded-xl border border-feather/20 overflow-hidden flex flex-col">
              <div className="relative aspect-[4/5] overflow-hidden bg-feather/10">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {item.type === "BIRD" ? <Bird className="h-10 w-10 text-feather/40" /> : <Package className="h-10 w-10 text-feather/40" />}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    removeFav(item.refId);
                    toast.success(`${item.name} removed from favorites.`);
                  }}
                  className="absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 hover:bg-tail-red/10 text-tail-red focus-ring"
                  aria-label={`Remove ${item.name} from favorites`}
                >
                  <Heart className="h-4 w-4" fill="currentColor" aria-hidden />
                </button>
                <span className="absolute top-3 left-3 inline-flex items-center px-2 py-0.5 rounded-full bg-white/90 text-[10px] font-body font-semibold uppercase tracking-wide text-slate border border-feather/30">
                  {item.type === "BIRD" ? "Parrot" : "Accessory"}
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-heading text-slate text-[16px] font-semibold mb-1">{item.name}</h3>
                <p className="text-[11px] font-body text-feather mb-3">
                  Saved {new Date(item.addedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
                <div className="mt-auto space-y-2">
                  {item.priceUsd != null && (
                    <p className="font-heading text-slate text-[18px] font-bold">{formatUsd(item.priceUsd)}</p>
                  )}
                  <div className="flex gap-2">
                    <Link
                      href={item.type === "BIRD" ? `/parrots/${item.refId}` : "/supplies"}
                      className="flex-1 inline-flex items-center justify-center gap-1 h-9 px-3 rounded-full border border-slate/30 hover:bg-slate/5 text-slate text-[12px] font-body font-semibold"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => moveToCart(item)}
                      className="flex-1 inline-flex items-center justify-center gap-1 h-9 px-3 rounded-full bg-tail-red hover:bg-tail-red-dark text-white text-[12px] font-body font-semibold"
                    >
                      <ShoppingCart className="h-3 w-3" /> Add to cart
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
