"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, ArrowRight, Mail, User as UserIcon } from "lucide-react";
import { ParrotRehomeLogo } from "@/components/parrotrehome/logo";

function RequestSubmittedContent() {
  const sp = useSearchParams();
  const reference = sp.get("ref") ?? "—";
  const requestId = sp.get("id");
  const email = sp.get("email");

  return (
    <div className="bg-ivory min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <Link href="/" className="inline-block mb-6">
            <ParrotRehomeLogo size="md" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-feather/20 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-forest/5 border-b border-forest/20 px-6 py-8 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-forest/10 mb-3">
              <CheckCircle className="h-7 w-7 text-forest" aria-hidden />
            </span>
            <h1 className="display-heading text-slate text-[28px] lg:text-[34px] mb-2">
              Request received
            </h1>
            <p className="text-feather text-[15px] font-body max-w-md mx-auto">
              Your request has been registered. An authorized agent will review it and
              send secure payment instructions.
            </p>
          </div>

          {/* Reference */}
          <div className="px-6 py-6 border-b border-feather/15">
            <p className="text-feather text-[12px] font-body font-semibold uppercase tracking-wide mb-1">
              Your reference
            </p>
            <p className="font-heading text-slate text-[28px] font-bold tracking-wide">
              {reference}
            </p>
            <p className="text-feather text-[13px] font-body mt-2">
              Save this reference — you&apos;ll need it to track your request.
            </p>
          </div>

          {/* What happens next */}
          <div className="px-6 py-6 border-b border-feather/15">
            <h2 className="font-heading text-slate text-[18px] font-semibold mb-3">
              What happens next
            </h2>
            <ol className="space-y-3 text-[14px] font-body text-slate">
              <li className="flex gap-3">
                <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-feather/15 text-feather font-heading font-bold text-[13px]">1</span>
                <span>An authorized agent reviews your request and assigns the dossier.</span>
              </li>
              <li className="flex gap-3">
                <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-feather/15 text-feather font-heading font-bold text-[13px]">2</span>
                <span>You receive an email with available payment methods and a secure, traceable link.</span>
              </li>
              <li className="flex gap-3">
                <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-feather/15 text-feather font-heading font-bold text-[13px]">3</span>
                <span>After your payment is manually verified by the agent, your request moves to fulfillment.</span>
              </li>
            </ol>
            <div className="mt-4 p-3 bg-iris/5 border border-iris/20 rounded-lg flex items-start gap-2">
              <Mail className="h-4 w-4 text-iris flex-shrink-0 mt-0.5" aria-hidden />
              <p className="text-[13px] font-body text-slate">
                Keep your request reference. Your confirmation and messages are available in My Requests.
              </p>
            </div>
          </div>

          {/* Track your request */}
          {requestId ? (
            <div className="px-6 py-6 bg-ivory/50 border-b border-feather/15">
              <h2 className="font-heading text-slate text-[18px] font-semibold mb-2 flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-tail-red" aria-hidden /> Track your request
              </h2>
              <p className="text-feather text-[13px] font-body mb-3">
                To view your request status, timeline, and secure payment instructions online,
                create an account or sign in. We&apos;ll link your request to your account
                automatically if the email matches.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Link
                  href={`/sign-up?email=${encodeURIComponent(email ?? "")}&callbackUrl=/my-requests/${requestId}`}
                  className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-tail-red hover:bg-tail-red-dark text-white text-[14px] font-body font-semibold transition-colors focus-ring"
                >
                  Create account <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href={`/sign-in?callbackUrl=/my-requests/${requestId}`}
                  className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full border border-slate/30 hover:bg-slate/5 text-slate text-[14px] font-body font-semibold transition-colors focus-ring"
                >
                  Sign in
                </Link>
              </div>
            </div>
          ) : null}

          {/* Footer links */}
          <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-2 text-[13px] font-body">
            <Link href="/parrots" className="text-feather hover:text-tail-red">
              Continue browsing
            </Link>
            <Link href="/how-it-works" className="text-feather hover:text-tail-red">
              How it works
            </Link>
            <Link href="/contact" className="text-feather hover:text-tail-red">
              Contact us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RequestSubmittedPage() {
  return <Suspense fallback={<p className="p-6 text-feather">Loading…</p>}><RequestSubmittedContent /></Suspense>;
}
