import { db } from "@/lib/db";
import { ShoppingCart, Send, Users, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "How it works" };

export default async function HowItWorksPage() {
  const page = await db.cmsPage.findUnique({ where: { slug: "how-it-works" } });

  return (
    <div className="bg-ivory">
      {/* Hero */}
      <section className="bg-white border-b border-feather/20 py-16 lg:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="eyebrow mb-3">Before you begin</p>
          <h1 className="display-heading text-slate text-[36px] lg:text-[52px] mb-4">
            How ParrotRehome works
          </h1>
          <p className="text-feather text-[17px] font-body leading-relaxed max-w-2xl mx-auto">
            A simple and secure way to get the birds, supplies or advice you need.
            We don&apos;t process payment on-site — every transaction is coordinated
            and verified by a real, identified agent.
          </p>
        </div>
      </section>

      {/* 3 steps visual */}
      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: 1,
                color: "bg-tail-red text-white",
                icon: ShoppingCart,
                title: "Choose",
                text: "Browse parrots, supplies, or book an avian advice session. Add items to your request cart. Fill in the request-form — experience, habitat, shipping state.",
              },
              {
                num: 2,
                color: "bg-forest text-white",
                icon: Send,
                title: "Send request",
                text: "We register your request with a unique reference (REQ-XXXX). You receive a no-reply confirmation email with your request details and next steps.",
              },
              {
                num: 3,
                color: "bg-iris text-slate",
                icon: Users,
                title: "Confirm with our team",
                text: "An authorized agent contacts you by email with the available payment methods. You receive secure, traceable instructions. Once your payment is verified, we process your order or booking.",
              },
            ].map((step, idx, arr) => (
              <div
                key={step.num}
                className="relative bg-white rounded-xl border border-feather/20 p-6 lg:p-8"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className={`inline-flex h-11 w-11 items-center justify-center rounded-full font-heading font-bold text-[16px] ${step.color}`} aria-hidden>
                    {step.num}
                  </span>
                  <step.icon className="h-6 w-6 text-feather" aria-hidden />
                </div>
                <h2 className="font-heading text-slate text-[22px] font-semibold mb-2">
                  {step.title}
                </h2>
                <p className="text-feather text-[14px] font-body leading-relaxed">
                  {step.text}
                </p>
                {idx < arr.length - 1 && (
                  <ArrowRight className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 text-feather" aria-hidden />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Status lifecycle (visual roadmap) */}
      <section className="py-12 lg:py-16 bg-white border-y border-feather/15">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="eyebrow mb-3 text-center">Status lifecycle</p>
          <h2 className="display-heading text-slate text-[28px] lg:text-[36px] mb-3 text-center">
            From request to fulfillment
          </h2>
          <p className="text-feather text-[15px] font-body text-center max-w-2xl mx-auto mb-10">
            Every status change is timestamped and stored in an immutable audit
            log. You always know what comes next.
          </p>

          <ol className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: "Received", color: "bg-feather/15 text-slate", desc: "Reference assigned; email sent." },
              { label: "Pending review", color: "bg-iris/15 text-slate", desc: "Assigned to an agent." },
              { label: "Awaiting instructions", color: "bg-iris/15 text-slate", desc: "Payment method selected." },
              { label: "Instructions sent", color: "bg-iris/20 text-slate", desc: "Official link active; expiry set." },
              { label: "Payment to verify", color: "bg-tail-red/15 text-slate", desc: "Reference received." },
              { label: "Paid - verified", color: "bg-forest/15 text-slate", desc: "Payment confirmed by agent." },
              { label: "Ready for fulfillment", color: "bg-forest/15 text-slate", desc: "Delivery or consultation scheduled." },
              { label: "Completed", color: "bg-forest/20 text-slate", desc: "Request executed & closed." },
            ].map((s, i) => (
              <li
                key={s.label}
                className={`rounded-lg p-4 ${s.color} border border-feather/20`}
              >
                <span className="block text-[11px] font-body font-semibold uppercase tracking-wide text-feather mb-1">
                  Step {i + 1}
                </span>
                <span className="block font-heading font-semibold text-[15px] mb-1">
                  {s.label}
                </span>
                <span className="block text-[12px] font-body text-feather leading-snug">
                  {s.desc}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Security reassurance */}
      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="bg-slate text-ivory rounded-2xl p-8 lg:p-10">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-iris/15 border border-iris/30">
                <ShieldCheck className="h-6 w-6 text-iris" aria-hidden />
              </span>
              <div>
                <h2 className="font-heading text-[24px] lg:text-[28px] mb-3">
                  Our security commitment
                </h2>
                <ul className="text-ivory/85 text-[14px] font-body leading-relaxed space-y-2">
                  <li>• Passwords hashed with bcrypt; staff MFA; server-side role checks.</li>
                  <li>• Secure payment links: non-guessable, expiring, signed, audited.</li>
                  <li>• No financial secrets transmitted in email — only references you choose to deposit.</li>
                  <li>• A status of <em>Paid - verified</em> always requires an agent&apos;s manual confirmation, never just a customer click.</li>
                  <li>• Audit log is immutable — every action is traceable to an identified actor.</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/parrots"
              className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-tail-red hover:bg-tail-red-dark text-white text-[15px] font-body font-semibold transition-colors focus-ring"
            >
              Start a request
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
