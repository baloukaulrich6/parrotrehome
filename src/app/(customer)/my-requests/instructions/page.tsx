import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDateUTC } from "@/lib/constants";
import { ParrotRehomeLogo } from "@/components/parrotrehome/logo";
import { Lock, Clock, ShieldCheck, AlertTriangle } from "lucide-react";

export const metadata = { title: "Secure payment instructions" };

// Allow direct token-based access (from agent-signed email link)
// Token is non-guessable (32 random bytes hex) per Cahier p.09
export default async function SecureInstructionsPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) return notFound();

  const instruction = await db.paymentInstruction.findUnique({
    where: { secureLinkHash: token },
    include: {
      request: {
        select: {
          id: true,
          reference: true,
          customerName: true,
          customerEmail: true,
          totalQuoteUsd: true,
          status: true,
        },
      },
      agent: { select: { id: true, name: true } },
    },
  });

  if (!instruction) return notFound();

  const isExpired =
    new Date(instruction.expiryAt).getTime() < Date.now() ||
    instruction.status === "EXPIRED";
  const isRevoked = instruction.status === "REVOKED";
  const blocked = isExpired || isRevoked;

  return (
    <div className="min-h-[80vh] bg-ivory flex flex-col items-center px-4 py-10">
      <Link href="/" className="mb-6">
        <ParrotRehomeLogo size="md" />
      </Link>

      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl border border-feather/20 shadow-sm overflow-hidden">
          {/* Header bar */}
          <div className={`px-6 py-4 ${blocked ? "bg-feather/15" : "bg-iris/10 border-b border-iris/30"}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-heading text-slate text-[16px] font-semibold flex items-center gap-2">
                <Lock className="h-4 w-4 text-iris" aria-hidden /> Secure payment instructions
              </p>
              <span className={`text-[11px] font-body font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                blocked ? "bg-tail-red/10 text-tail-red" : "bg-forest/15 text-forest"
              }`}>
                {isRevoked ? "Revoked" : isExpired ? "Expired" : "Active"}
              </span>
            </div>
            <p className="text-[12px] text-feather font-body mt-1">
              Request <strong className="text-slate">{instruction.request.reference}</strong> · Prepared by{" "}
              <strong className="text-slate">{instruction.agent.name}</strong>
            </p>
          </div>

          {/* Body */}
          <div className="p-6">
            {blocked ? (
              <div className="text-center py-6">
                <AlertTriangle className="h-10 w-10 text-tail-red mx-auto mb-3" aria-hidden />
                <h1 className="font-heading text-slate text-[22px] font-semibold mb-2">
                  {isRevoked ? "This link has been revoked" : "This link has expired"}
                </h1>
                <p className="text-feather text-[14px] font-body mb-4 max-w-md mx-auto">
                  For your security, secure payment instructions have a limited
                  validity window. Please contact our team to request a fresh
                  link.
                </p>
                <p className="text-feather text-[12px] font-body mb-5">
                  Link expired at: <strong>{formatDateUTC(new Date(instruction.expiryAt))}</strong>
                </p>
                <Link
                  href={`/sign-in?callbackUrl=/my-requests/${instruction.request.id}`}
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-tail-red hover:bg-tail-red-dark text-white text-[14px] font-body font-semibold"
                >
                  Sign in to view request
                </Link>
              </div>
            ) : (
              <>
                <p className="text-feather text-[14px] font-body mb-4">
                  Dear {instruction.request.customerName},
                </p>
                <p className="text-slate text-[14px] font-body mb-4">
                  Your secure payment instructions are ready. Please follow them
                  exactly. <strong>Do not send card numbers or passwords by
                  email.</strong>
                </p>

                <div className="bg-ivory border border-feather/20 rounded-lg p-4 my-4">
                  <p className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide mb-2">
                    Official instructions
                  </p>
                  <pre className="whitespace-pre-wrap font-body text-[14px] text-slate leading-relaxed">
                    {instruction.body}
                  </pre>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[13px] font-body mb-4">
                  <div>
                    <p className="text-feather text-[11px] uppercase font-semibold tracking-wide">Estimated amount</p>
                    <p className="text-slate font-semibold">
                      ${Number(instruction.request.totalQuoteUsd ?? 0).toFixed(2)} USD
                    </p>
                  </div>
                  <div>
                    <p className="text-feather text-[11px] uppercase font-semibold tracking-wide">Valid until</p>
                    <p className="text-slate font-semibold flex items-center gap-1">
                      <Clock className="h-3 w-3" aria-hidden />
                      {formatDateUTC(new Date(instruction.expiryAt))}
                    </p>
                  </div>
                </div>

                <div className="bg-forest/5 border border-forest/20 rounded-lg p-4 mb-5">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-forest flex-shrink-0 mt-0.5" aria-hidden />
                    <p className="text-[12px] font-body text-slate leading-relaxed">
                      <strong>Why this matters:</strong> Your payment will be
                      verified manually by an authorized agent through the
                      official provider. A status of <em>Paid - verified</em>{" "}
                      requires that manual confirmation — never just a click on
                      this link.
                    </p>
                  </div>
                </div>

                <Link
                  href={`/sign-in?callbackUrl=/my-requests/${instruction.request.id}`}
                  className="inline-flex items-center justify-center gap-2 w-full h-11 rounded-full bg-tail-red hover:bg-tail-red-dark text-white text-[14px] font-body font-semibold"
                >
                  Sign in to deposit payment reference
                </Link>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-[12px] text-feather font-body mt-5">
          ParrotRehome never collects card details on-site. If you have any concern,
          please <Link href="/contact" className="text-tail-red hover:underline">contact us</Link>.
        </p>
      </div>
    </div>
  );
}
