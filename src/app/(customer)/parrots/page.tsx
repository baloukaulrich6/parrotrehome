import { publicBirdWhere } from "@/lib/public-birds";
import { formatBirdAge } from "@/lib/bird-age";
export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatUsd, BIRD_STATUS_META } from "@/lib/constants";
import { AvailabilityBadge } from "@/components/parrotrehome/availability-badge";
import { FavoriteToggle } from "@/components/parrotrehome/favorite-toggle";
import { ArrowRight, Filter, Search } from "lucide-react";

export const metadata = { title: "Parrots catalog" };

// Server-side filtering — F-02
type SearchParams = {
  species?: string;
  status?: string;
  location?: string;
  q?: string;
  sort?: string;
  age?: string;
};

export default async function ParrotsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const where: Record<string, unknown> = { AND: publicBirdWhere };
  if (sp.species) where.species = { contains: sp.species };
  if (sp.status) where.status = sp.status;
  if (sp.location) where.location = { contains: sp.location };
  if (sp.q) {
    where.OR = [
      { commonName: { contains: sp.q } },
      { species: { contains: sp.q } },
      { shortDescription: { contains: sp.q } },
    ];
  }

  if (sp.age === "under-1") where.ageYears = { gte: 0, lt: 1 };
  if (sp.age === "1-5") where.ageYears = { gte: 1, lt: 5 };
  if (sp.age === "5-plus") where.ageYears = { gte: 5 };
  if (sp.age === "unknown") where.ageYears = null;

  let orderBy: import("@prisma/client").Prisma.BirdOrderByWithRelationInput = { createdAt: "desc" };
  if (sp.sort === "price-asc") orderBy = { priceUsd: "asc" };
  if (sp.sort === "price-desc") orderBy = { priceUsd: "desc" };
  if (sp.sort === "age-asc") orderBy = { ageYears: { sort: "asc", nulls: "last" } };

  const birds = await db.bird.findMany({ where, orderBy });
  const allSpecies = await db.bird.findMany({
    where: publicBirdWhere,
    select: { species: true, commonName: true },
    distinct: ["species"],
  });

  return (
    <div className="bg-ivory min-h-[60vh]">
      {/* Page header */}
      <section className="bg-white border-b border-feather/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <p className="eyebrow mb-3">Available parrots</p>
          <h1 className="display-heading text-slate text-[36px] lg:text-[48px] mb-3">
            Meet our parrots
          </h1>
          <p className="text-feather text-[16px] font-body max-w-2xl leading-relaxed">
            Browse individual birds offered through independent breeders. Confirm the bird&apos;s current location, age, availability and available documentation before purchasing.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Filters sidebar */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-xl border border-feather/20 p-5">
              <h2 className="font-heading text-[16px] font-semibold text-slate flex items-center gap-2 mb-4">
                <Filter className="h-4 w-4" aria-hidden />
                Filters
              </h2>
              <form method="get" className="space-y-4">
                {/* Search */}
                <div>
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
                      placeholder="Name, species..."
                      className="w-full h-10 pl-9 pr-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring"
                    />
                  </div>
                </div>
                {/* Species */}
                <div>
                  <label htmlFor="species" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">
                    Species
                  </label>
                  <select
                    id="species"
                    name="species"
                    defaultValue={sp.species ?? ""}
                    className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring"
                  >
                    <option value="">All species</option>
                    {allSpecies.map((s) => (
                      <option key={s.species} value={s.species}>
                        {s.commonName}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Status */}
                <div>
                  <label htmlFor="status" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">
                    Availability
                  </label>
                  <select
                    id="status"
                    name="status"
                    defaultValue={sp.status ?? ""}
                    className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring"
                  >
                    <option value="">Any</option>
                    <option value="AVAILABLE">Available</option>
                    <option value="RESERVED">Reserved</option>
                    <option value="UNAVAILABLE">Unavailable</option>
                  </select>
                </div>
                <label className="block text-xs font-semibold text-feather">Age<select name="age" defaultValue={sp.age || ""} className="block mt-1 w-full h-10 rounded-md border bg-ivory px-2"><option value="">Any age</option><option value="under-1">Under 1 year</option><option value="1-5">1 to under 5 years</option><option value="5-plus">5 years and over</option><option value="unknown">Age not provided</option></select></label>
                {/* Sort */}
                <div>
                  <label htmlFor="sort" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">
                    Sort by
                  </label>
                  <select
                    id="sort"
                    name="sort"
                    defaultValue={sp.sort ?? "newest"}
                    className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring"
                  >
                    <option value="newest">Newest first</option>
                    <option value="price-asc">Price: low to high</option>
                    <option value="price-desc">Price: high to low</option>
                    <option value="age-asc">Youngest first</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full h-10 rounded-md bg-tail-red hover:bg-tail-red-dark text-white text-[14px] font-body font-semibold transition-colors focus-ring"
                >
                  Apply filters
                </button>
                <a
                  href="/parrots"
                  className="block text-center text-[13px] font-body text-feather hover:text-tail-red"
                >
                  Reset filters
                </a>
              </form>
            </div>
          </aside>

          {/* Catalog grid */}
          <div className="lg:col-span-9">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[14px] font-body text-feather">
                <span className="font-semibold text-slate">{birds.length}</span>{" "}
                {birds.length === 1 ? "parrot" : "parrots"} available
              </p>
            </div>

            {birds.length === 0 ? (
              <div className="bg-white rounded-xl border border-feather/20 p-12 text-center">
                <p className="text-slate font-heading text-[20px] mb-2">
                  No parrots match your filters
                </p>
                <p className="text-feather text-[14px] font-body">
                  Try clearing some filters or check back soon — new birds
                  arrive regularly.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {birds.map((bird) => {
                  const photos: string[] = bird.photos ? JSON.parse(bird.photos) : [];
                  const photo = photos[0] ?? "";
                  const status = BIRD_STATUS_META[bird.status];
                  return (
                    <Link
                      key={bird.id}
                      href={`/parrots/${bird.id}`}
                      className="card-hover group block bg-white rounded-xl border border-feather/20 overflow-hidden focus-ring"
                    >
                      <div className="relative aspect-[4/5] overflow-hidden bg-feather/10">
                        {photo && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photo}
                            alt={`${bird.commonName} — ${bird.species}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        )}
                        <div className="absolute top-3 left-3">
                          <AvailabilityBadge label={status.label} className={status.className} />
                        </div>
                        <div className="absolute top-3 right-3">
                          <FavoriteToggle
                            refId={bird.id}
                            type="BIRD"
                            name={bird.commonName}
                            image={photo}
                            priceUsd={bird.priceUsd ? Number(bird.priceUsd) : undefined}
                            size="sm"
                          />
                        </div>
                      </div>
                      <div className="p-5">
                        <p className="text-[12px] text-feather font-body italic mb-1">
                          {bird.species}
                        </p>
                        <h3 className="font-heading text-slate text-[20px] font-semibold mb-2 leading-tight">
                          {bird.commonName}
                        </h3>
                        <p className="text-feather text-[13px] font-body mb-3 line-clamp-2">
                          {bird.shortDescription ?? bird.longDescription?.slice(0, 90) + "…"}
                        </p>
                        <div className="flex items-center justify-between text-[13px] font-body border-t border-feather/15 pt-3">
                          <span className="text-feather flex items-center gap-1">
                            <span className="font-semibold">{formatBirdAge(bird.ageYears)}</span>
                            <span className="text-feather/60">·</span>
                            <span>{bird.sex ?? "Unknown"}</span>
                          </span>
                          <span className="text-feather">{bird.location}</span>
                        </div>
                        {bird.priceUsd && (
                          <div className="mt-3 flex items-center justify-between">
                            <span className="font-heading text-slate text-[18px] font-bold">
                              {formatUsd(Number(bird.priceUsd))}
                            </span>
                            <span className="inline-flex items-center gap-1 text-tail-red text-[13px] font-body font-semibold">
                              Ask about this bird
                              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
