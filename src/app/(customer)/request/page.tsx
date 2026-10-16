"use client";
import { PolicyLinks } from "@/components/parrotrehome/policy-links";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCart } from "@/lib/cart-store";
import { formatUsd, DEFAULT_SERVED_STATES } from "@/lib/constants";
import { toast } from "sonner";
import { trackConversion } from "@/components/google-analytics";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Home,
  Heart,
  ShieldCheck,
  Send,
  Clock,
  ArrowLeft,
} from "lucide-react";

interface ServedState { code: string; name: string; }

export default function RequestPage() {
  const { data: session } = useSession();
  const cart = useCart();
  const router = useRouter();
  const items = cart.items;
  const total = items.reduce((s, i) => s + i.priceUsd * i.qty, 0);

  const [methods, setMethods] = useState<{ id: string; name: string }[]>([]);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [paymentError, setPaymentError] = useState(false);
  useEffect(() => {
    fetch("/api/payment-methods", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("Unable to load payment methods");
      const data = await response.json(); setMethods(data.methods || []);
      if (data.methods?.length === 1) setPaymentMethodId(data.methods[0].id);
    }).catch(() => setPaymentError(true));
  }, []);
  const [states, setStates] = useState<ServedState[]>(DEFAULT_SERVED_STATES);
  useEffect(() => {
    fetch("/api/payment-methods?context=states")
      .then((r) => r.json())
      .then((d) => d.states && setStates(d.states))
      .catch(() => {});
  }, []);

  const [form, setForm] = useState({
    customerName: session?.user?.name ?? "",
    customerEmail: session?.user?.email ?? "",
    customerPhone: "",
    shippingState: "",
    shippingAddress: "",
    experience: "Beginner",
    habitat: "",
    preferences: "",
    consent: false,
  });
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  // Empty cart guard
  if (items.length === 0 && !submitting) {
    return (
      <div className="min-h-[60vh] bg-ivory flex items-center justify-center px-4">
        <div className="bg-white rounded-xl border border-feather/20 p-8 text-center max-w-md">
          <h1 className="font-heading text-slate text-[22px] mb-2">Your cart is empty</h1>
          <p className="text-feather text-[14px] font-body mb-5">
            Add a parrot, supplies, or book an avian advice session first.
          </p>
          <Link href="/parrots" className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-tail-red text-white font-body font-semibold text-[14px]">
            Explore parrots
          </Link>
        </div>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.consent) {
      toast.error("Please accept the consent checkbox.");
      return;
    }
    if (!form.shippingState) {
      toast.error("Please select your shipping state.");
      return;
    }
    setSubmitting(true);
    try {
      // Read coupon from sessionStorage (set by cart page)
      let couponPayload: { couponId?: string; code?: string; discountUsd?: number; finalTotalUsd?: number } = {};
      try {
        const stored = sessionStorage.getItem("parrotrehome-coupon");
        if (stored) couponPayload = JSON.parse(stored);
      } catch {}

      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          paymentMethodId: paymentMethodId || undefined,
          items: items.map((i) => ({
            type: i.type,
            refId: i.refId,
            name: i.name,
            qty: i.qty,
            priceUsd: i.priceUsd,
          })),
          // A-23: pass coupon info
          couponId: couponPayload.couponId,
          couponCode: couponPayload.code,
          discountUsd: couponPayload.discountUsd,
          finalTotalUsd: couponPayload.finalTotalUsd,
          // A-26: channel attribution
          channel: typeof window !== "undefined" && window.innerWidth < 768 ? "mobile" : "web",
          referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      cart.clear();
      sessionStorage.removeItem("parrotrehome-coupon");
      // Google Ads conversion tracking
      trackConversion("request_submitted", { value: total, currency: "USD", transaction_id: data.reference });
      if (session?.user) {
        // Signed-in user → go directly to the request detail page
        toast.success(data.emailStatus === "SENT" ? `Request ${data.reference} received — check your email.` : `Request ${data.reference} saved. View its progress in My Requests.`);
        router.push(`/my-requests/${data.requestId}`);
      } else {
        // Guest → go to the submitted confirmation page
        toast.success(`Request ${data.reference} received.`);
        const params = new URLSearchParams({
          ref: data.reference,
          id: data.requestId,
          email: data.customerEmail,
        });
        router.push(`/request/submitted?${params.toString()}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-ivory min-h-[60vh]">
      <section className="bg-white border-b border-feather/20 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link href="/cart" className="inline-flex items-center gap-1 text-feather hover:text-tail-red text-[13px] font-body font-semibold mb-2 focus-ring rounded">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to cart
          </Link>
          <p className="eyebrow mb-2">Submit your request</p>
          <h1 className="display-heading text-slate text-[28px] lg:text-[36px]">
            Request form
          </h1>
          <p className="text-feather text-[14px] font-body mt-2 max-w-2xl">
            We need a few details to process your request responsibly. After
            submission, you&apos;ll receive a confirmation email with your request
            reference and next steps. No payment is collected here.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form */}
          <form onSubmit={submit} className="lg:col-span-8 space-y-6">
            {/* Contact */}
            <fieldset className="bg-white rounded-xl border border-feather/20 p-6">
              <legend className="px-2 text-[14px] font-body font-semibold text-slate">
                1. Contact details
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <Field label="Full name *" icon={User} htmlFor="customerName">
                  <input id="customerName" type="text" required value={form.customerName} onChange={(e) => update("customerName", e.target.value)} className="w-full h-10 pl-9 pr-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
                </Field>
                <Field label="Email *" icon={Mail} htmlFor="customerEmail">
                  <input id="customerEmail" type="email" required value={form.customerEmail} onChange={(e) => update("customerEmail", e.target.value)} className="w-full h-10 pl-9 pr-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
                </Field>
                <Field label="Phone" icon={Phone} htmlFor="customerPhone">
                  <input id="customerPhone" type="tel" value={form.customerPhone} onChange={(e) => update("customerPhone", e.target.value)} className="w-full h-10 pl-9 pr-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
                </Field>
                <div>
                  <label htmlFor="shippingState" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">
                    Shipping state *
                  </label>
                  <select
                    id="shippingState"
                    required
                    value={form.shippingState}
                    onChange={(e) => update("shippingState", e.target.value)}
                    className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring"
                  >
                    <option value="">Select state…</option>
                    {states.map((s) => (
                      <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <Field label="Shipping address (optional)" icon={MapPin} htmlFor="shippingAddress">
                  <input id="shippingAddress" type="text" value={form.shippingAddress} onChange={(e) => update("shippingAddress", e.target.value)} placeholder="Street, city, ZIP" className="w-full h-10 pl-9 pr-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
                </Field>
              </div>
            </fieldset>

            {/* Responsible questionnaire (F-05) */}
            <fieldset className="bg-white rounded-xl border border-feather/20 p-6">
              <legend className="px-2 text-[14px] font-body font-semibold text-slate">
                2. Responsible placement questionnaire
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div>
                  <label htmlFor="experience" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">
                    Bird-keeping experience *
                  </label>
                  <select
                    id="experience"
                    required
                    value={form.experience}
                    onChange={(e) => update("experience", e.target.value)}
                    className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring"
                  >
                    <option value="Beginner">Beginner — first parrot</option>
                    <option value="Intermediate">Intermediate — some experience</option>
                    <option value="Expert">Expert — multiple years</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="habitat" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">
                    Habitat description *
                  </label>
                  <input
                    id="habitat"
                    type="text"
                    required
                    value={form.habitat}
                    onChange={(e) => update("habitat", e.target.value)}
                    placeholder={`e.g., 36" cage, dedicated bird room`}
                    className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label htmlFor="preferences" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">
                  Additional preferences / questions
                </label>
                <textarea
                  id="preferences"
                  rows={3}
                  value={form.preferences}
                  onChange={(e) => update("preferences", e.target.value)}
                  placeholder="Best contact time, visit availability, specific concerns..."
                  className="mt-1 w-full px-3 py-2 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring"
                />
              </div>
            </fieldset>

            <fieldset className="bg-white rounded-xl border border-feather/20 p-6">
              <legend className="px-2 text-sm font-semibold text-slate">3. Payment preference</legend>
              <p className="text-sm text-feather mb-3">Choose an available method. Your agent will email the payment details after reviewing your request. No payment is taken now.</p>
              {methods.length ? methods.map(method => <label key={method.id} className="flex items-center gap-3 p-3 border rounded-lg mb-2"><input type="radio" name="paymentMethodId" required value={method.id} checked={paymentMethodId === method.id} onChange={() => setPaymentMethodId(method.id)} /><span>{method.name}</span></label>) : <p role="status" className="text-sm text-feather">{paymentError ? "Unable to load payment methods. You can submit your request and contact our team." : "Our team will confirm the available payment options with you."}</p>}
            </fieldset>

            <section className="bg-white border rounded-xl p-5 space-y-3"><h2 className="font-heading text-xl">Review before submitting</h2><PolicyLinks /><p className="text-sm text-feather">Submitting is not payment confirmation. See cancellation eligibility and refund steps before you pay. Approved refunds are initiated within 5 business days; provider crediting may take a further indicative 3–10 business days.</p></section>

            {/* Consent */}
            <fieldset className="bg-forest/5 border border-forest/20 rounded-xl p-5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={form.consent}
                  onChange={(e) => update("consent", e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-feather/50 text-tail-red focus-ring"
                />
                <span className="text-[13px] font-body text-slate leading-relaxed">
                  I confirm that I am at least 18 and the information above is accurate. I agree to the Terms of Service, Payment, Delivery and Refund policies linked above. I consent
                  to be contacted by an authorized ParrotRehome agent regarding my
                  request, and I understand that <strong>no payment is
                  collected on this website</strong>. Payment instructions
                  will be sent only through secure, traceable, agent-verified
                  channels. I have read the{" "}
                  <Link href="/cms/privacy" className="text-tail-red hover:underline">privacy policy</Link>.
                </span>
              </label>
            </fieldset>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-tail-red hover:bg-tail-red-dark text-white text-[15px] font-body font-semibold transition-colors focus-ring shadow-sm disabled:bg-feather/40"
            >
              {submitting ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Submit request
                </>
              )}
            </button>
          </form>

          {/* Sidebar — summary */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-xl border border-feather/20 p-5 sticky top-24">
              <h2 className="font-heading text-slate text-[18px] font-semibold mb-4 flex items-center gap-2">
                <Heart className="h-4 w-4 text-tail-red" aria-hidden /> Request summary
              </h2>
              <ul className="space-y-2.5 max-h-64 overflow-y-auto custom-scroll">
                {items.map((i) => (
                  <li key={i.refId} className="flex justify-between gap-2 text-[13px] font-body">
                    <div className="min-w-0">
                      <p className="text-slate font-semibold truncate">{i.name}</p>
                      <p className="text-feather text-[11px] uppercase tracking-wide">
                        {i.type === "BIRD" ? "Parrot" : i.type === "PRODUCT" ? "Accessory" : "Consultation"} × {i.qty}
                      </p>
                    </div>
                    <span className="text-slate font-semibold whitespace-nowrap">
                      {formatUsd(i.priceUsd * i.qty)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-feather/15 my-4" />
              <div className="flex justify-between items-baseline">
                <span className="text-slate font-heading text-[16px] font-semibold">
                  Estimated total
                </span>
                <span className="font-heading text-slate text-[22px] font-bold">
                  {formatUsd(total)}
                </span>
              </div>
              <div className="mt-4 p-3 bg-forest/5 border border-forest/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-forest flex-shrink-0 mt-0.5" aria-hidden />
                  <p className="text-[12px] font-body text-slate leading-relaxed">
                    Final pricing confirmed by an identified agent after
                    request review. No on-site payment.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  icon: Icon,
  children,
}: {
  label: string;
  htmlFor: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">
        {label}
      </label>
      <div className="relative mt-1">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-feather" aria-hidden />
        {children}
      </div>
    </div>
  );
}
