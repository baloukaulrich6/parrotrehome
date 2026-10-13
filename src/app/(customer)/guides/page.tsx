import Link from "next/link";
import { db } from "@/lib/db";
import { BookOpen, ArrowRight } from "lucide-react";

export const metadata = { title: "Care guides" };

export default async function GuidesPage() {
  const faqs = await db.faqEntry.findMany({
    where: { isPublished: true },
    orderBy: { displayOrder: "asc" },
  });

  return (
    <div className="bg-ivory min-h-[60vh]">
      <section className="bg-white border-b border-feather/20 py-12 lg:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="eyebrow mb-3">Care &amp; guidance</p>
          <h1 className="display-heading text-slate text-[36px] lg:text-[48px] mb-3">
            Care guides &amp; FAQ
          </h1>
          <p className="text-feather text-[16px] font-body leading-relaxed max-w-2xl mx-auto">
            Practical, trustworthy guidance for parrot owners — preparing
            habitats, feeding, stimulation, first days, safety, and signs that
            warrant a vet visit.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 lg:py-14 space-y-12">
        <section>
          <h2 className="font-heading text-slate text-[24px] mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-forest" aria-hidden /> Frequently asked questions
          </h2>
          <div className="space-y-3">
            {faqs.map((f) => (
              <details key={f.id} className="bg-white rounded-xl border border-feather/20 p-5 group">
                <summary className="font-heading text-slate text-[16px] font-semibold cursor-pointer flex items-center justify-between gap-3 list-none">
                  <span>{f.question}</span>
                  <span className="text-feather text-[20px] group-open:rotate-45 transition-transform" aria-hidden>+</span>
                </summary>
                <p className="text-feather text-[14px] font-body leading-relaxed mt-3">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="bg-forest/5 border border-forest/20 rounded-2xl p-8 text-center">
          <h2 className="font-heading text-slate text-[24px] mb-2">
            Need personal advice?
          </h2>
          <p className="text-feather text-[15px] font-body mb-5 max-w-md mx-auto">
            Book a 1-hour avian consultation at $15/hour with our qualified
            professional.
          </p>
          <Link
            href="/avian-advice"
            className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-iris hover:bg-iris-dark text-slate text-[15px] font-body font-semibold transition-colors"
          >
            Book avian advice <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>
      </div>
    </div>
  );
}
