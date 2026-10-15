"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { ParrotRehomeLogo } from "@/components/parrotrehome/logo";
import { Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

function SignInContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        totp,
        redirect: false,
      });
      if (!res || res.error) {
        toast.error("Check your email, password and authenticator code. If a code was just used, wait for the next one.");
        return;
      }
      toast.success("Signed in.");
      const session = await getSession();
      if (session?.user?.role && session.user.role !== "CLIENT" && !session.user.mfaKeyId) {
        router.push("/staff-mfa"); router.refresh(); return;
      }
      const fallback = session?.user?.role === "CLIENT" ? "/my-requests" : "/admin";
      const destination = new URL(callbackUrl || fallback, window.location.origin);
      router.push(destination.origin === window.location.origin ? destination.pathname + destination.search : fallback);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[80vh] bg-ivory flex flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8">
        <ParrotRehomeLogo size="md" />
      </Link>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-feather/20 shadow-sm p-8">
          <h1 className="font-heading text-slate text-[26px] font-semibold mb-1">
            Welcome back
          </h1>
          <p className="text-feather text-[14px] font-body mb-6">
            Sign in to track your requests and view secure payment instructions.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">
                Email
              </label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-feather" aria-hidden />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 pl-10 pr-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">
                Password
              </label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-feather" aria-hidden />
                <input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-10 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-feather hover:text-slate focus-ring rounded"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <label className="block text-sm text-feather">Authenticator code (if enabled)
              <input value={totp} onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code" className="block w-full h-11 px-3 mt-1 border border-feather/30 rounded-md bg-ivory text-slate tracking-widest" />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-full bg-tail-red hover:bg-tail-red-dark text-white text-[15px] font-body font-semibold transition-colors focus-ring shadow-sm disabled:bg-feather/40"
            >
              {submitting ? "Signing in..." : "Sign in"}
              {!submitting && <ArrowRight className="h-4 w-4" aria-hidden />}
            </button>
          </form>

          <p className="text-[13px] text-feather font-body text-center mt-5">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="text-tail-red hover:text-tail-red-dark font-semibold">
              Create one
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}

export default function SignInPage() {
  return <Suspense fallback={<p className="p-6 text-feather">Loading…</p>}><SignInContent /></Suspense>;
}
