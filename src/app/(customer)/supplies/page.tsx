import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { formatUsd } from "@/lib/constants";
import { AddProductToCart } from "@/components/parrotrehome/add-product-to-cart";
import { FavoriteToggle } from "@/components/parrotrehome/favorite-toggle";
import { Filter, Search } from "lucide-react";

export const metadata = { title: "Cages & Supplies" };

type SearchParams = { category?: string; q?: string; sort?: string };

export default async function SuppliesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const where: Record<string, unknown> = { isActive: true };
  if (sp.category) where.category = sp.category;
  if (sp.q) {
    where.OR = [
      { name: { contains: sp.q } },
      { description: { contains: sp.q } },
    ];
  }
  let orderBy: Record<string, "asc" | "desc"> = { createdAt: "desc" };
  if (sp.sort === "price-asc") orderBy = { priceUsd: "asc" };
  if (sp.sort === "price-desc") orderBy = { priceUsd: "desc" };

  const products = await db.product.findMany({ where, orderBy });

  const categories = [
    { value: "", label: "All categories" },
    { value: "CAGE", label: "Cages" },
    { value: "PERCH", label: "Perches" },
    { value: "TOY", label: "Toys" },
    { value: "FOOD", label: "Food" },
    { value: "SUPPLY", label: "Supplies" },
  ];

  return (
    <div className="bg-ivory min-h-[60vh]">
      {/* Header */}
      <section className="bg-white border-b border-feather/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <p className="eyebrow mb-3">Quality accessories</p>
          <h1 className="display-heading text-slate text-[36px] lg:text-[48px] mb-3">
            Cages &amp; Supplies
          </h1>
          <p className="text-feather text-[16px] font-body max-w-2xl leading-relaxed">
            Cages, perches, toys, food and everyday essentials. Species-appropriate
            designs from trusted brands. Add items to your request cart — payment
            is coordinated by an identified agent.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Filters bar */}
        <form method="get" className="bg-white rounded-xl border border-feather/20 p-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label htmlFor="q" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">
                Search
              </label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-feather" aria-hidden />
                <input
                  id="q"
                  type="search"
                  name="q"
                  defaultValue={sp.q}
                  placeholder="Search cages, toys, food..."
                  className="w-full h-10 pl-9 pr-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring"
                />
              </div>
            </div>
            <div>
              <label htmlFor="category" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">
                Category
              </label>
              <select
                id="category"
                name="category"
                defaultValue={sp.category ?? ""}
                className="mt-1 h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring"
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sort" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">
                Sort
              </label>
              <select
                id="sort"
                name="sort"
                defaultValue={sp.sort ?? "newest"}
                className="mt-1 h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring"
              >
                <option value="newest">Newest</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </select>
            </div>
            <button
              type="submit"
              className="h-10 px-5 rounded-md bg-tail-red hover:bg-tail-red-dark text-white text-[14px] font-body font-semibold transition-colors focus-ring inline-flex items-center gap-2"
            >
              <Filter className="h-4 w-4" aria-hidden /> Filter
            </button>
          </div>
        </form>

        <p className="text-[14px] font-body text-feather mb-5">
          <span className="font-semibold text-slate">{products.length}</span>{" "}
          {products.length === 1 ? "product" : "products"} found
        </p>

        {products.length === 0 ? (
          <div className="bg-white rounded-xl border border-feather/20 p-12 text-center">
            <p className="text-slate font-heading text-[20px] mb-2">
              No products match your filters
            </p>
            <Link href="/supplies" className="text-tail-red text-[14px] font-body font-semibold hover:underline">
              Reset filters
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((p) => {
              const photos: string[] = p.photos ? JSON.parse(p.photos) : [];
              const photo = photos[0] ?? "";
              const features: string[] = p.features ? JSON.parse(p.features) : [];
              return (
                <article
                  key={p.id}
                  className="card-hover bg-white rounded-xl border border-feather/20 overflow-hidden flex flex-col"
                >
                  <div className="relative aspect-square overflow-hidden bg-ivory">
                    {photo && (
                      <Image
                        src={photo}
                        alt={p.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover"
                      />
                    )}
                    <span className="absolute top-3 left-3 inline-flex items-center px-2.5 py-1 rounded-full bg-white/90 text-[11px] font-body font-semibold text-slate border border-feather/30">
                      {p.category}
                    </span>
                    <div className="absolute top-3 right-3">
                      <FavoriteToggle
                        refId={p.id}
                        type="PRODUCT"
                        name={p.name}
                        image={photo}
                        priceUsd={Number(p.priceUsd)}
                        size="sm"
                      />
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-heading text-slate text-[16px] font-semibold leading-tight mb-1.5">
                      {p.name}
                    </h3>
                    <p className="text-[11px] font-body text-feather mb-2">
                      SKU: {p.sku}
                    </p>
                    {p.dimensions && (
                      <p className="text-[12px] font-body text-feather mb-2">
                        <span className="font-semibold">Dimensions:</span> {p.dimensions}
                      </p>
                    )}
                    {p.compatibility && (
                      <p className="text-[12px] font-body text-feather mb-3">
                        <span className="font-semibold">For:</span> {p.compatibility}
                      </p>
                    )}
                    {features.length > 0 && (
                      <ul className="text-[12px] font-body text-feather space-y-0.5 mb-3">
                        {features.slice(0, 3).map((f) => (
                          <li key={f} className="flex items-start gap-1.5">
                            <span className="text-forest mt-1.5 h-1 w-1 rounded-full bg-forest flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-auto">
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="font-heading text-slate text-[20px] font-bold">
                          {formatUsd(Number(p.priceUsd))}
                        </span>
                        <span className={`text-[12px] font-body ${p.stockQty > 0 ? "text-forest" : "text-tail-red"}`}>
                          {p.stockQty > 0 ? `${p.stockQty} in stock` : "Out of stock"}
                        </span>
                      </div>
                      <AddProductToCart
                        product={{
                          id: p.id,
                          name: p.name,
                          priceUsd: Number(p.priceUsd),
                          stockQty: p.stockQty,
                        }}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
