import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Leaf,
  Heart,
  Globe,
  ShoppingCart,
  Send,
  Users,
  ShieldCheck,
  Stethoscope,
  Sparkles,
} from "lucide-react";
import { db } from "@/lib/db";
import { AVIAN_ADVICE_PRICE_PER_HOUR, BRAND, formatUsd, BIRD_STATUS_META } from "@/lib/constants";
import { AvailabilityBadge } from "@/components/parrotrehome/availability-badge";

export const metadata = {
  title: "ParrotRehome — A brighter life with birds",
  description:
    "Ethically raised parrots, quality cages & supplies, and avian advice at $15/hour. Manual, agent-verified purchasing.",
};

const HERO_IMAGE =
  "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/8b0838403ead.jpeg";

export default async function HomePage() {
  // Pull featured birds (first 4 available) so the page is alive
  const featured = await db.bird.findMany({
    where: { status: "AVAILABLE" },
    take: 4,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="bg-background">
      {/* ════════════════════════════════════════════════════════
          1. HERO — full-bleed African Grey photo with dark left gradient
          ════════════════════════════════════════════════════════ */}
      <section
        className="relative min-h-[600px] lg:min-h-[680px] flex items-center"
        aria-label="ParrotRehome — a brighter life with birds"
      >
        {/* Background photo */}
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Left-side dark gradient overlay for text readability */}
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "linear-gradient(90deg, rgba(30,38,42,0.92) 0%, rgba(30,38,42,0.78) 35%, rgba(30,38,42,0.25) 65%, rgba(30,38,42,0.05) 100%)",
          }}
        />
        {/* Subtle feather texture overlay (decorative, below 0.15 opacity for AA) */}
        <div
          className="absolute inset-0 mix-blend-soft-light opacity-10"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 80%, #E0BD69 0%, transparent 50%), radial-gradient(circle at 80% 20%, #47745B 0%, transparent 50%)",
          }}
        />

        {/* Hero content */}
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-2xl">
            <p className="eyebrow text-ivory/90 mb-5">
              Premium Parrots · Quality Supplies · Expert Guidance
            </p>
            <h1 className="display-heading text-ivory text-[42px] sm:text-[52px] lg:text-[68px] leading-[1.04] mb-6">
              A brighter life <br className="hidden sm:block" />
              with{" "}
              <span className="text-iris">birds</span>
            </h1>
            <p className="text-ivory/90 text-[17px] lg:text-[19px] font-body leading-relaxed max-w-xl mb-8">
              Ethically raised parrots, essentials &amp; avian care for happy,
              healthy companions.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link
                href="/parrots"
                className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-tail-red hover:bg-tail-red-dark text-white text-[15px] font-body font-semibold transition-colors focus-ring shadow-lg"
              >
                Explore parrots
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/avian-advice"
                className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full border border-ivory/70 hover:bg-ivory/10 text-ivory text-[15px] font-body font-semibold transition-colors focus-ring"
              >
                Book avian advice
              </Link>
            </div>

            {/* Trust badges */}
            <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
              {[
                { icon: Leaf, label: "Ethical & Responsible Breeding" },
                { icon: Heart, label: "Healthy, Socialized Parrots" },
                { icon: Globe, label: "Support for Bird Lovers Worldwide" },
              ].map((b) => (
                <li key={b.label} className="flex items-center gap-2.5">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-ivory/10 border border-ivory/20">
                    <b.icon className="h-4 w-4 text-iris" aria-hidden />
                  </span>
                  <span className="text-ivory/85 text-[13px] font-body font-medium leading-tight">
                    {b.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          2. THREE ENTRY DOORS — Parrots / Cages & Supplies / Avian Advice
          ════════════════════════════════════════════════════════ */}
      <section className="section-py bg-ivory" aria-label="Browse our categories">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="eyebrow mb-3">Three ways to begin</p>
            <h2 className="display-heading text-slate text-[32px] lg:text-[40px]">
              Where would you like to start?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {/* Card 1 — Parrots */}
            <article className="card-hover group bg-white rounded-xl border border-feather/20 shadow-sm overflow-hidden flex flex-col">
              <div className="relative aspect-[4/3] overflow-hidden bg-feather/10">
                <Image
                  src="https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/b565f0664eeb.png"
                  alt="Three parrots — African Grey, Macaw, and Cockatoo — together on a branch"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-6 lg:p-7 flex-1 flex flex-col">
                <h3 className="font-heading text-slate text-[24px] lg:text-[26px] mb-2">
                  Parrots
                </h3>
                <p className="text-feather text-[15px] font-body leading-relaxed mb-6 flex-1">
                  African Grey, Macaws, Cockatoos and more. Each bird has its own
                  verified dossier — provenance, age, health, and personality.
                </p>
                <Link
                  href="/parrots"
                  className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-tail-red hover:bg-tail-red-dark text-white text-[14px] font-body font-semibold transition-colors focus-ring"
                >
                  View parrots
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </article>

            {/* Card 2 — Cages & Supplies */}
            <article className="card-hover group bg-white rounded-xl border border-feather/20 shadow-sm overflow-hidden flex flex-col">
              <div className="relative aspect-[4/3] overflow-hidden bg-feather/10">
                <Image
                  src="https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/67a0b32dd782.jpeg"
                  alt="A large, ornate black bird cage with colorful toys"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-6 lg:p-7 flex-1 flex flex-col">
                <h3 className="font-heading text-slate text-[24px] lg:text-[26px] mb-2">
                  Cages &amp; Supplies
                </h3>
                <p className="text-feather text-[15px] font-body leading-relaxed mb-6 flex-1">
                  Cages, perches, toys, food and everyday essentials. Quality
                  brands and species-appropriate designs.
                </p>
                <Link
                  href="/supplies"
                  className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-forest hover:bg-forest-dark text-white text-[14px] font-body font-semibold transition-colors focus-ring"
                >
                  Shop supplies
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </article>

            {/* Card 3 — Avian Advice */}
            <article className="card-hover group bg-white rounded-xl border border-feather/20 shadow-sm overflow-hidden flex flex-col">
              <div className="relative aspect-[4/3] overflow-hidden bg-feather/10">
                <Image
                  src="https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/19f08d1188c9.jpg"
                  alt="An avian veterinarian in a white coat holding an African Grey parrot"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-6 lg:p-7 flex-1 flex flex-col">
                <h3 className="font-heading text-slate text-[24px] lg:text-[26px] mb-2">
                  Avian Advice
                </h3>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-heading text-slate text-[26px] font-bold">
                    ${AVIAN_ADVICE_PRICE_PER_HOUR}
                  </span>
                  <span className="text-feather text-[14px] font-body">/ hour</span>
                </div>
                <p className="text-feather text-[15px] font-body leading-relaxed mb-6 flex-1">
                  Get expert advice from qualified avian professionals. Booking,
                  feeding, behavior, habitat, and preventive care.
                </p>
                <Link
                  href="/avian-advice"
                  className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-iris hover:bg-iris-dark text-slate text-[14px] font-body font-semibold transition-colors focus-ring"
                >
                  Book a consultation
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          3. HOW IT WORKS — manual payment explainer (reassurance)
          ════════════════════════════════════════════════════════ */}
      <section className="section-py bg-white" aria-labelledby="how-it-works-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            {/* Left: title */}
            <div className="lg:col-span-4">
              <p className="eyebrow mb-3">Before you begin</p>
              <h2
                id="how-it-works-heading"
                className="display-heading text-slate text-[32px] lg:text-[40px] mb-4"
              >
                How it works
              </h2>
              <p className="text-feather text-[16px] font-body leading-relaxed mb-6">
                A simple and secure way to get the birds, supplies or advice you
                need. We don&apos;t process payment on-site — every transaction is
                coordinated and verified by a real, identified agent.
              </p>
              <Link
                href="/how-it-works"
                className="inline-flex items-center gap-2 text-tail-red hover:text-tail-red-dark text-[15px] font-body font-semibold focus-ring rounded"
              >
                Read the full process
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>

            {/* Right: 3 steps */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-4">
              {[
                {
                  num: 1,
                  numColor: "bg-tail-red text-white",
                  icon: ShoppingCart,
                  title: "Choose",
                  text: "Browse parrots, supplies or book an avian advice session. Fill in the request-form.",
                },
                {
                  num: 2,
                  numColor: "bg-forest text-white",
                  icon: Send,
                  title: "Send request",
                  text: "You'll receive a confirmation email from us with your request details and next steps.",
                },
                {
                  num: 3,
                  numColor: "bg-iris text-slate",
                  icon: Users,
                  title: "Confirm with our team",
                  text: "Our agent will contact you by email with the available payment options and instructions. Once your payment is confirmed, we'll process your order or booking.",
                },
              ].map((step, idx, arr) => (
                <div
                  key={step.num}
                  className="relative flex flex-col items-start p-6 rounded-xl border border-feather/20 bg-ivory/50"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-[15px] font-heading font-bold ${step.numColor}`}
                      aria-hidden
                    >
                      {step.num}
                    </span>
                    <step.icon className="h-5 w-5 text-feather" aria-hidden />
                  </div>
                  <h3 className="font-heading text-slate text-[20px] font-semibold mb-2">
                    {step.title}
                  </h3>
                  <p className="text-feather text-[14px] font-body leading-relaxed">
                    {step.text}
                  </p>
                  {/* Arrow between steps (desktop) */}
                  {idx < arr.length - 1 && (
                    <ArrowRight
                      className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-feather"
                      aria-hidden
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          4. FEATURED PARROTS — quick view of available birds
          ════════════════════════════════════════════════════════ */}
      {featured.length > 0 && (
        <section className="section-py bg-ivory" aria-labelledby="featured-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <p className="eyebrow mb-2">Recently added</p>
                <h2
                  id="featured-heading"
                  className="display-heading text-slate text-[28px] lg:text-[36px]"
                >
                  Meet our available parrots
                </h2>
              </div>
              <Link
                href="/parrots"
                className="inline-flex items-center gap-2 text-tail-red hover:text-tail-red-dark text-[15px] font-body font-semibold focus-ring rounded"
              >
                See all parrots
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featured.map((bird) => {
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
                        <AvailabilityBadge
                          label={status.label}
                          className={status.className}
                        />
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-[12px] text-feather font-body italic mb-1">
                        {bird.species}
                      </p>
                      <h3 className="font-heading text-slate text-[18px] font-semibold mb-2 leading-tight">
                        {bird.commonName}
                      </h3>
                      <div className="flex items-center justify-between text-[13px] font-body">
                        <span className="text-feather">{bird.location}</span>
                        {bird.priceUsd && (
                          <span className="font-body font-semibold text-slate">
                            {formatUsd(Number(bird.priceUsd))}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════
          5. REASSURANCE STRIP — why ParrotRehome
          ════════════════════════════════════════════════════════ */}
      <section className="section-py-sm bg-slate text-ivory">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                icon: ShieldCheck,
                title: "Verified provenance",
                text: "Every bird is an individual dossier with traceable documents. We never sell 'quantities of stock'.",
              },
              {
                icon: Stethoscope,
                title: "Expert avian care",
                text: "Our licensed avian professional offers consultations at $15/hour — feeding, behavior, habitat, prevention.",
              },
              {
                icon: Sparkles,
                title: "Agent-verified payments",
                text: "We don't process payment on-site. An identified agent prepares secure, traceable instructions for you.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4">
                <span className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-iris/15 border border-iris/30">
                  <item.icon className="h-5 w-5 text-iris" aria-hidden />
                </span>
                <div>
                  <h3 className="font-heading text-[18px] font-semibold mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-ivory/75 text-[14px] font-body leading-relaxed">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          6. CONTACT CTA — bottom call-to-action
          ════════════════════════════════════════════════════════ */}
      <section className="section-py bg-ivory">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="eyebrow mb-3">Have a question?</p>
          <h2 className="display-heading text-slate text-[28px] lg:text-[36px] mb-4">
            We&apos;re here to help you and your bird.
          </h2>
          <p className="text-feather text-[16px] font-body leading-relaxed mb-8 max-w-2xl mx-auto">
            Reach our team with any question about parrots, supplies, or avian
            advice. Real humans, identified agents, traceable correspondence.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-slate hover:bg-slate-dark text-ivory text-[15px] font-body font-semibold transition-colors focus-ring"
            >
              Contact us
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full border border-slate/30 hover:bg-slate/5 text-slate text-[15px] font-body font-semibold transition-colors focus-ring"
            >
              Read how it works
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
