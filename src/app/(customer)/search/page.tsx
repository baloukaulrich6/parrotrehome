import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { formatUsd, BIRD_STATUS_META } from "@/lib/constants";
import { AvailabilityBadge } from "@/components/parrotrehome/availability-badge";
import { Search } from "lucide-react";

export const metadata = { title: "Search" };

type SearchParams = { q?: string };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const birds = q
    ? await db.bird.findMany({
        where: {
          OR: [
            { commonName: { contains: q } },
            { species: { contains: q } },
            { shortDescription: { contains: q } },
            { longDescription: { contains: q } },
          ],
        },
        take: 20,
      })
    : [];
  const products = q
    ? await db.product.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: q } },
            { description: { contains: q } },
            { sku: { contains: q } },
          ],
        },
        take: 20,
      })
    : [];

  const total = birds.length + products.length;

  return (
    <div className="bg-ivory min-h-[60vh]">
      <section className="bg-white border-b border-feather/20 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="eyebrow mb-2 flex items-center gap-2">
            <Search className="h-4 w-4" aria-hidden /> Search results
          </p>
          <h1 className="display-heading text-slate text-[28px] lg:text-[36px]">
            {q ? <>Results for &ldquo;{q}&rdquo;</> : "Start your search"}
          </h1>
          {q && (
            <p className="text-feather text-[14px] font-body mt-2">
              {total} {total === 1 ? "match" : "matches"} found across parrots &amp; supplies
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {!q ? (
          <div className="bg-white rounded-xl border border-feather/20 p-12 text-center">
            <p className="text-feather text-[14px] font-body">
              Use the search bar above to find parrots, cages, or supplies.
            </p>
          </div>
        ) : total === 0 ? (
          <div className="bg-white rounded-xl border border-feather/20 p-12 text-center">
            <h2 className="font-heading text-slate text-[20px] mb-2">
              No matches found
            </h2>
            <p className="text-feather text-[14px] font-body mb-4">
              Try a different search term, or browse our catalog directly.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/parrots" className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-tail-red text-white text-[14px] font-body font-semibold">
                Browse parrots
              </Link>
              <Link href="/supplies" className="inline-flex items-center gap-2 h-10 px-5 rounded-full border border-slate/30 text-slate text-[14px] font-body font-semibold">
                Browse supplies
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {birds.length > 0 && (
              <section>
                <h2 className="font-heading text-slate text-[20px] font-semibold mb-4">
                  Parrots ({birds.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {birds.map((b) => {
                    const photos: string[] = b.photos ? JSON.parse(b.photos) : [];
                    const photo = photos[0] ?? "";
                    const status = BIRD_STATUS_META[b.status];
                    return (
                      <Link key={b.id} href={`/parrots/${b.id}`} className="card-hover group block bg-white rounded-xl border border-feather/20 overflow-hidden">
                        <div className="relative aspect-[4/5] overflow-hidden bg-feather/10">
                          {photo && (
                            <Image src={photo} alt={b.commonName} fill sizes="25vw" className="object-cover group-hover:scale-105 transition-transform" />
                          )}
                          <div className="absolute top-3 left-3"><AvailabilityBadge label={status.label} className={status.className} /></div>
                        </div>
                        <div className="p-3">
                          <p className="text-[11px] text-feather italic">{b.species}</p>
                          <h3 className="font-heading text-slate text-[15px] font-semibold">{b.commonName}</h3>
                          {b.priceUsd && <p className="text-slate font-body font-bold text-[14px]">{formatUsd(Number(b.priceUsd))}</p>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
            {products.length > 0 && (
              <section>
                <h2 className="font-heading text-slate text-[20px] font-semibold mb-4">
                  Supplies ({products.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {products.map((p) => {
                    const photos: string[] = p.photos ? JSON.parse(p.photos) : [];
                    const photo = photos[0] ?? "";
                    return (
                      <Link key={p.id} href="/supplies" className="card-hover group block bg-white rounded-xl border border-feather/20 overflow-hidden">
                        <div className="relative aspect-square overflow-hidden bg-feather/10">
                          {photo && (
                            <Image src={photo} alt={p.name} fill sizes="25vw" className="object-cover group-hover:scale-105 transition-transform" />
                          )}
                        </div>
                        <div className="p-3">
                          <h3 className="font-heading text-slate text-[14px] font-semibold">{p.name}</h3>
                          <p className="text-slate font-body font-bold text-[14px]">{formatUsd(Number(p.priceUsd))}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
