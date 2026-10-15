import { db } from "@/lib/db";
import { readSiteSettings } from "@/lib/site-settings";
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";

export const metadata = { title: "Contact" };

export default async function ContactPage() {
  const BRAND = readSiteSettings();
  const faqs = await db.faqEntry.findMany({
    where: { isPublished: true },
    orderBy: { displayOrder: "asc" },
  });

  return (
    <div className="bg-ivory min-h-[60vh]">
      <section className="bg-white border-b border-feather/20 py-14 lg:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="eyebrow mb-3">Get in touch</p>
          <h1 className="display-heading text-slate text-[36px] lg:text-[52px] mb-4">
            Contact us
          </h1>
          <p className="text-feather text-[17px] font-body leading-relaxed max-w-2xl mx-auto">
            Real humans, identified agents, traceable correspondence. We typically
            respond within one business day.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact details */}
          <aside className="space-y-4">
            <h2 className="font-heading text-slate text-[20px] font-semibold mb-2">
              Reach us
            </h2>
            <ul className="space-y-3 text-[14px] font-body">
              <li className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-iris mt-0.5 flex-shrink-0" aria-hidden />
                <div>
                  <p className="text-feather text-[12px] uppercase font-semibold tracking-wide">Email</p>
                  <a href={`mailto:${BRAND.email}`} className="text-slate hover:text-tail-red">{BRAND.email}</a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-iris mt-0.5 flex-shrink-0" aria-hidden />
                <div>
                  <p className="text-feather text-[12px] uppercase font-semibold tracking-wide">Phone</p>
                  <p className="text-slate">{BRAND.phone}{BRAND.secondaryPhone ? ` / ${BRAND.secondaryPhone}` : ""}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-iris mt-0.5 flex-shrink-0" aria-hidden />
                <div>
                  <p className="text-feather text-[12px] uppercase font-semibold tracking-wide">Address</p>
                  <p className="text-slate">{BRAND.address}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-iris mt-0.5 flex-shrink-0" aria-hidden />
                <div>
                  <p className="text-feather text-[12px] uppercase font-semibold tracking-wide">Hours</p>
                  <p className="text-slate">{BRAND.hours}</p>
                </div>
              </li>
            </ul>
          </aside>

          {/* Contact form */}
          <form
            action="/api/contact"
            method="post"
            className="bg-white rounded-xl border border-feather/20 p-6 space-y-4"
          >
            <h2 className="font-heading text-slate text-[20px] font-semibold">
              Send a message
            </h2>
            <div>
              <label htmlFor="name" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">Name *</label>
              <input id="name" name="name" type="text" required className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
            </div>
            <div>
              <label htmlFor="email" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">Email *</label>
              <input id="email" name="email" type="email" required className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
            </div>
            <div>
              <label htmlFor="message" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">Message *</label>
              <textarea id="message" name="message" rows={5} required className="mt-1 w-full px-3 py-2 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
            </div>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-full bg-tail-red hover:bg-tail-red-dark text-white text-[14px] font-body font-semibold transition-colors focus-ring"
            >
              <Send className="h-4 w-4" aria-hidden /> Send message
            </button>
            <p className="text-[12px] text-feather font-body">
              Your message is forwarded to our support team. We never share your data.
            </p>
          </form>
        </div>

        {/* FAQ */}
        <section className="mt-12 lg:mt-16">
          <h2 className="font-heading text-slate text-[24px] lg:text-[32px] mb-2 text-center">
            Frequently asked questions
          </h2>
          <p className="text-feather text-[14px] font-body text-center mb-8">
            Quick answers to common questions.
          </p>
          <div className="mx-auto max-w-3xl space-y-3">
            {faqs.map((f) => (
              <details key={f.id} className="bg-white rounded-xl border border-feather/20 p-5 group">
                <summary className="font-heading text-slate text-[16px] font-semibold cursor-pointer flex items-center justify-between gap-3 list-none">
                  <span>{f.question}</span>
                  <span className="text-feather text-[20px] group-open:rotate-45 transition-transform" aria-hidden>+</span>
                </summary>
                <p className="text-feather text-[14px] font-body leading-relaxed mt-3">
                  {f.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
