import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { AVIAN_ADVICE_PRICE_PER_HOUR, AVIAN_ADVICE_SUBJECTS, formatDateUTC } from "@/lib/constants";
import { BookingForm } from "@/components/parrotrehome/booking-form";
import { Stethoscope, Calendar, Clock, ShieldCheck, Video, Phone, ArrowRight } from "lucide-react";

export const metadata = { title: "Avian Advice" };

export default async function AvianAdvicePage() {
  // Get avian professional (only 1 in seed — Dr. Emily Park, DVM)
  const professional = await db.user.findFirst({
    where: { role: "AVIAN_PROFESSIONAL", status: "ACTIVE" },
  });

  // Existing confirmed appointments for this professional (next 2 weeks)
  const existing = await db.appointment.findMany({
    where: {
      professionalId: professional?.id ?? "",
      status: { in: ["CONFIRMED"] },
      slotStartUtc: { gt: new Date(), lt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14) },
    },
    orderBy: { slotStartUtc: "asc" },
  });

  return (
    <div className="bg-ivory">
      {/* ═══════════ Hero ═══════════ */}
      <section className="relative bg-slate text-ivory overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <Image
            src="https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/8b0838403ead.jpeg"
            alt=""
            fill
            priority
            className="object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate via-slate/85 to-slate/40" aria-hidden />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-2xl">
            <p className="eyebrow text-iris mb-4">Expert consultation</p>
            <h1 className="display-heading text-ivory text-[42px] lg:text-[56px] mb-4 leading-tight">
              Avian advice —<br />
              <span className="text-iris">${AVIAN_ADVICE_PRICE_PER_HOUR} per hour</span>
            </h1>
            <p className="text-ivory/85 text-[17px] lg:text-[19px] font-body leading-relaxed mb-6 max-w-xl">
              Book a remote consultation with a qualified avian professional. Feeding,
              behavior, habitat, preventive health — guidance tailored to your bird.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="#book"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-iris hover:bg-iris-dark text-slate text-[15px] font-body font-semibold transition-colors focus-ring shadow-lg"
              >
                Book a session
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
              <span className="text-ivory/80 text-[14px] font-body">
                60-minute sessions · UTC confirmed · Manual verification
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ Advisor profile (F-13) ═══════════ */}
      {professional && (
        <section className="py-12 lg:py-16 bg-white border-b border-feather/15">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-start">
              <div className="lg:col-span-1">
                <div className="aspect-square rounded-xl overflow-hidden bg-feather/10">
                  <Image
                    src="https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/85d1484699a3.jpg"
                    alt={`${professional.name} — avian professional`}
                    width={600}
                    height={600}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="lg:col-span-2 space-y-5">
                <p className="eyebrow">Your advisor</p>
                <h2 className="display-heading text-slate text-[28px] lg:text-[36px]">
                  {professional.name}
                </h2>
                <p className="text-slate text-[15px] font-body leading-relaxed">
                  Doctor of Veterinary Medicine (DVM) with over a decade of
                  specialized avian practice. Focused on welfare-first
                  consultations: general advice, triage support, and preventive
                  guidance. Dr. Park does not diagnose or prescribe remotely
                  without an established veterinarian-client-patient relationship
                  (VCPR) per state requirements.
                </p>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[14px] font-body">
                  <div className="flex items-start gap-2">
                    <Stethoscope className="h-5 w-5 text-forest mt-0.5 flex-shrink-0" aria-hidden />
                    <div>
                      <dt className="text-feather text-[12px] uppercase font-semibold">Qualification</dt>
                      <dd className="text-slate">DVM, Avian specialty (verified)</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="h-5 w-5 text-forest mt-0.5 flex-shrink-0" aria-hidden />
                    <div>
                      <dt className="text-feather text-[12px] uppercase font-semibold">Licensing</dt>
                      <dd className="text-slate">Multi-state — verified per request</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Video className="h-5 w-5 text-forest mt-0.5 flex-shrink-0" aria-hidden />
                    <div>
                      <dt className="text-feather text-[12px] uppercase font-semibold">Remote mode</dt>
                      <dd className="text-slate">Video or phone (V2 feature)</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="h-5 w-5 text-forest mt-0.5 flex-shrink-0" aria-hidden />
                    <div>
                      <dt className="text-feather text-[12px] uppercase font-semibold">Sessions</dt>
                      <dd className="text-slate">60 minutes — ${AVIAN_ADVICE_PRICE_PER_HOUR}/hour</dd>
                    </div>
                  </div>
                </dl>
                <div className="bg-forest/5 border border-forest/20 rounded-lg p-4 text-[13px] font-body text-slate">
                  <p>
                    <strong className="font-semibold">Reference:</strong> AVMA{" "}
                    <a href="https://www.avma.org/telehealth" target="_blank" rel="noreferrer" className="text-forest underline hover:text-forest-dark">avma.org/telehealth</a>;{" "}
                    FDA <a href="https://www.fda.gov" target="_blank" rel="noreferrer" className="text-forest underline hover:text-forest-dark">fda.gov</a>{" "}
                    (VCPR &amp; veterinary teleconsultation).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ Agenda (F-14) ═══════════ */}
      <section className="py-10 lg:py-14 bg-ivory">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Existing confirmed sessions */}
            <div>
              <p className="eyebrow mb-2">Already booked</p>
              <h3 className="font-heading text-slate text-[24px] mb-4">
                Confirmed sessions
              </h3>
              {existing.length === 0 ? (
                <p className="text-feather text-[14px] font-body bg-white rounded-lg border border-feather/20 p-4">
                  No confirmed sessions in the next 2 weeks — slots below are
                  available.
                </p>
              ) : (
                <ul className="space-y-2">
                  {existing.map((a) => (
                    <li key={a.id} className="bg-white rounded-lg border border-feather/20 p-3 text-[14px] font-body">
                      <span className="text-feather">Booked:</span>{" "}
                      <span className="text-slate font-semibold">{formatDateUTC(a.slotStartUtc)}</span>{" "}
                      <span className="text-feather">({a.durationMinutes} min)</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Subjects offered */}
            <div>
              <p className="eyebrow mb-2">What we cover</p>
              <h3 className="font-heading text-slate text-[24px] mb-4">
                Consultation subjects
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVIAN_ADVICE_SUBJECTS.map((s) => (
                  <li key={s} className="bg-white rounded-lg border border-feather/20 p-3 text-[14px] font-body text-slate flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-iris" aria-hidden />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ Booking form (F-15, F-16) ═══════════ */}
      <section id="book" className="py-12 lg:py-16 bg-white border-t border-feather/15">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <p className="eyebrow mb-3">Book a session</p>
          <h2 className="display-heading text-slate text-[28px] lg:text-[36px] mb-3">
            Request a consultation
          </h2>
          <p className="text-feather text-[15px] font-body mb-8 leading-relaxed">
            Choose a slot, describe your bird and your concern. After submitting,
            you&apos;ll receive a no-reply email with your request reference. An
            authorized agent will reach out with secure payment instructions.
            Your slot is confirmed only after manual payment verification.
          </p>
          <BookingForm
            professionalId={professional?.id ?? ""}
            professionalName={professional?.name ?? "Avian professional"}
            subjects={[...AVIAN_ADVICE_SUBJECTS]}
          />
        </div>
      </section>
    </div>
  );
}
