"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { ParrotRehomeLogo } from "@/components/parrotrehome/logo";
import { Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

function SignInContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (!res || res.error) {
        toast.error("Invalid email or password.");
        return;
      }
      toast.success("Signed in.");
      router.push(callbackUrl);
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

        {/* Demo accounts helper — clearly illustrative */}
        <div className="mt-5 bg-slate/5 border border-slate/15 rounded-xl p-4 text-[12px] font-body text-slate">
          <p className="font-semibold mb-2">Demo accounts (password: <code className="bg-ivory px-1 rounded">parrotrehome123</code>)</p>
          <ul className="space-y-1 text-feather">
            <li>• <code>admin@parrotrehome.com</code> — Super admin</li>
            <li>• <code>manager@parrotrehome.com</code> — Manager</li>
            <li>• <code>agent@parrotrehome.com</code> — Agent</li>
            <li>• <code>stock@parrotrehome.com</code> — Stock manager</li>
            <li>• <code>vet@parrotrehome.com</code> — Avian professional</li>
            <li>• <code>client@example.com</code> — Client</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return <Suspense fallback={<p className="p-6 text-feather">Loading…</p>}><SignInContent /></Suspense>;
}
