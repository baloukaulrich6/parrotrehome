export const dynamic = "force-dynamic";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  formatUsd,
  formatDateOnly,
  BIRD_STATUS_META,
  AVIAN_ADVICE_PRICE_PER_HOUR,
} from "@/lib/constants";
import { AvailabilityBadge } from "@/components/parrotrehome/availability-badge";
import { AddBirdToCart } from "@/components/parrotrehome/add-bird-to-cart";
import { FavoriteToggle } from "@/components/parrotrehome/favorite-toggle";
import {
  MapPin,
  Calendar,
  VenusAndMars,
  HeartPulse,
  FileBadge,
  Bird,
  ShieldCheck,
  ArrowLeft,
  ShoppingCart,
} from "lucide-react";

export const metadata = { title: "Bird detail" };

export default async function BirdDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bird = await db.bird.findUnique({ where: { id } });
  if (!bird) return notFound();

  const photos: string[] = bird.photos ? JSON.parse(bird.photos) : [];
  const sourceDocs: { name?: string; uploadedAt?: string }[] = bird.sourceDocuments
    ? JSON.parse(bird.sourceDocuments)
    : [];
  const healthDocs: { name?: string; note?: string }[] = bird.healthDocuments
    ? JSON.parse(bird.healthDocuments)
    : [];
  const status = BIRD_STATUS_META[bird.status];
  const relatedBirds = await db.bird.findMany({
    where: {
      AND: [
        { id: { not: bird.id } },
        { OR: [{ species: bird.species }, { status: "AVAILABLE" }] },
      ],
    },
    take: 3,
  });

  return (
    <div className="bg-ivory">
      {/* Breadcrumb */}
      <div className="border-b border-feather/15 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-[13px] font-body text-feather">
            <Link href="/" className="hover:text-tail-red">Home</Link>
            <span>/</span>
            <Link href="/parrots" className="hover:text-tail-red">Parrots</Link>
            <span>/</span>
            <span className="text-slate font-medium">{bird.commonName}</span>
          </nav>
        </div>
      </div>

      {/* Hero — large photo + summary card */}
      <section className="bg-white border-b border-feather/15">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Photo */}
            <div className="relative aspect-[4/5] lg:aspect-[5/6] rounded-xl overflow-hidden bg-feather/10 shadow-md">
              {photos[0] ? (
                <Image
                  src={photos[0]}
                  alt={`${bird.commonName} — ${bird.species}`}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Bird className="h-16 w-16 text-feather/40" aria-hidden />
                </div>
              )}
              <div className="absolute top-4 left-4">
                <AvailabilityBadge label={status.label} className={status.className} />
              </div>
            </div>

            {/* Summary card */}
            <div className="flex flex-col">
              <p className="text-[14px] font-body italic text-feather mb-1">
                {bird.species}
              </p>
              <h1 className="display-heading text-slate text-[32px] lg:text-[44px] mb-3 leading-tight">
                {bird.commonName}
              </h1>
              <p className="text-feather text-[15px] font-body leading-relaxed mb-6">
                {bird.shortDescription ?? bird.longDescription?.slice(0, 200) + "…"}
              </p>

              {/* Quick facts grid */}
              <dl className="grid grid-cols-2 gap-4 mb-6">
                <Fact icon={Calendar} label="Age" value={bird.ageYears ? `${bird.ageYears} years` : "—"} />
                <Fact icon={VenusAndMars} label="Sex" value={bird.sex ?? "Unknown"} />
                <Fact icon={MapPin} label="Location" value={bird.location ?? "—"} />
                <Fact icon={FileBadge} label="ID / Band" value={bird.individualId ?? "—"} />
              </dl>

              {/* Price */}
              {bird.priceUsd && (
                <div className="bg-ivory border border-feather/20 rounded-xl p-5 mb-6">
                  <p className="text-[12px] text-feather font-body font-semibold uppercase tracking-wide mb-1">
                    Quoted price
                  </p>
                  <p className="font-heading text-slate text-[32px] font-bold leading-none">
                    {formatUsd(Number(bird.priceUsd))}
                  </p>
                  <p className="text-[12px] text-feather font-body mt-2">
                    Final pricing confirmed by an authorized agent after request
                    review. No on-site payment.
                  </p>
                </div>
              )}

              {/* CTAs */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <AddBirdToCart bird={bird} />
                </div>
                <FavoriteToggle
                  refId={bird.id}
                  type="BIRD"
                  name={bird.commonName}
                  image={photos[0] ?? undefined}
                  priceUsd={bird.priceUsd ? Number(bird.priceUsd) : undefined}
                />
              </div>

              {/* Provenance reassurance */}
              <div className="mt-6 p-4 rounded-lg bg-forest/5 border border-forest/20">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-forest flex-shrink-0 mt-0.5" aria-hidden />
                  <p className="text-[13px] font-body text-slate leading-relaxed">
                    <strong className="font-semibold">Verified provenance.</strong>{" "}
                    This bird has an individual dossier with traceable documents.
                    CITES paperwork on file where applicable.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed description */}
      <section className="py-10 lg:py-14 bg-ivory">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Description + care FAQ */}
            <article className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="font-heading text-slate text-[24px] lg:text-[28px] mb-4">
                  About {bird.commonName}
                </h2>
                <p className="text-slate text-[15px] font-body leading-relaxed whitespace-pre-line">
                  {bird.longDescription ?? bird.shortDescription}
                </p>
              </div>

              {bird.careNotes && (
                <div>
                  <h2 className="font-heading text-slate text-[24px] lg:text-[28px] mb-4">
                    Care &amp; FAQ
                  </h2>
                  <div className="bg-white rounded-xl border border-feather/20 p-6">
                    <h3 className="font-heading text-slate text-[16px] font-semibold mb-2">
                      Species-specific guidance
                    </h3>
                    <p className="text-feather text-[14px] font-body leading-relaxed whitespace-pre-line">
                      {bird.careNotes}
                    </p>
                  </div>
                </div>
              )}

              {/* Provenance — F-03: "provenance autorisée" */}
              <div>
                <h2 className="font-heading text-slate text-[24px] lg:text-[28px] mb-4">
                  Provenance &amp; documents
                </h2>
                <div className="bg-white rounded-xl border border-feather/20 p-6 space-y-4">
                  <dl className="grid grid-cols-2 gap-4 text-[14px] font-body">
                    <div>
                      <dt className="text-feather text-[12px] uppercase font-semibold tracking-wide mb-0.5">
                        Breeder / Source
                      </dt>
                      <dd className="text-slate">{bird.breederName ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-feather text-[12px] uppercase font-semibold tracking-wide mb-0.5">
                        Origin state
                      </dt>
                      <dd className="text-slate">{bird.originState ?? "—"}</dd>
                    </div>
                  </dl>
                  {sourceDocs.length > 0 && (
                    <div>
                      <p className="text-feather text-[12px] uppercase font-semibold tracking-wide mb-2">
                        Source documents
                      </p>
                      <ul className="space-y-1.5">
                        {sourceDocs.map((doc, i) => (
                          <li key={i} className="text-[14px] font-body text-slate flex items-start gap-2">
                            <FileBadge className="h-4 w-4 text-forest flex-shrink-0 mt-0.5" aria-hidden />
                            <span>{doc.name} {doc.uploadedAt && `(${doc.uploadedAt})`}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {healthDocs.length > 0 && (
                    <div className="border-t border-feather/15 pt-4">
                      <p className="text-feather text-[12px] uppercase font-semibold tracking-wide mb-2 flex items-center gap-1">
                        <HeartPulse className="h-3.5 w-3.5" aria-hidden />
                        Health documents (restricted)
                      </p>
                      <ul className="space-y-1.5">
                        {healthDocs.map((doc, i) => (
                          <li key={i} className="text-[14px] font-body text-feather italic">
                            🔒 {doc.name} — full access granted to assigned agent and verified buyer at handover
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </article>

            {/* Sidebar — related birds */}
            <aside className="space-y-6">
              <div className="bg-white rounded-xl border border-feather/20 p-6">
                <h3 className="font-heading text-slate text-[18px] font-semibold mb-4">
                  Need advice first?
                </h3>
                <p className="text-feather text-[13px] font-body mb-4 leading-relaxed">
                  Book a 1-hour avian consultation at{" "}
                  <strong className="text-slate">${AVIAN_ADVICE_PRICE_PER_HOUR}/hour</strong>{" "}
                  before adopting.
                </p>
                <Link
                  href="/avian-advice"
                  className="inline-flex items-center justify-center gap-2 w-full h-10 px-4 rounded-full bg-iris hover:bg-iris-dark text-slate text-[14px] font-body font-semibold transition-colors focus-ring"
                >
                  Book advice
                </Link>
              </div>

              {relatedBirds.length > 0 && (
                <div>
                  <h3 className="font-heading text-slate text-[18px] font-semibold mb-3">
                    You may also like
                  </h3>
                  <ul className="space-y-3">
                    {relatedBirds.map((rb) => {
                      const rPhotos: string[] = rb.photos ? JSON.parse(rb.photos) : [];
                      const rStatus = BIRD_STATUS_META[rb.status];
                      return (
                        <li key={rb.id}>
                          <Link
                            href={`/parrots/${rb.id}`}
                            className="card-hover flex gap-3 bg-white rounded-xl border border-feather/20 p-3 focus-ring"
                          >
                            <div className="relative h-16 w-16 flex-shrink-0 rounded-md overflow-hidden bg-feather/10">
                              {rPhotos[0] && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={rPhotos[0]}
                                  alt={rb.commonName}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-heading text-slate text-[14px] font-semibold leading-tight truncate">
                                {rb.commonName}
                              </p>
                              <p className="text-feather text-[12px] font-body">
                                {rStatus.label} · {rb.location}
                              </p>
                              {rb.priceUsd && (
                                <p className="text-slate text-[13px] font-body font-semibold">
                                  {formatUsd(Number(rb.priceUsd))}
                                </p>
                              )}
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <Link
                href="/parrots"
                className="inline-flex items-center gap-2 text-feather hover:text-tail-red text-[14px] font-body font-semibold focus-ring rounded"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Back to all parrots
              </Link>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
}) {
  return (
    <div className="border border-feather/20 rounded-lg p-3 bg-white">
      <div className="flex items-center gap-1.5 text-feather text-[12px] font-body font-semibold uppercase tracking-wide mb-1">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </div>
      <p className="text-slate text-[15px] font-body font-medium">{value}</p>
    </div>
  );
}
