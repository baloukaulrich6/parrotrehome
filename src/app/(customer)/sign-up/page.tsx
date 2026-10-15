"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { ParrotRehomeLogo } from "@/components/parrotrehome/logo";
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { trackConversion } from "@/components/google-analytics";

function SignUpContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") || "/";
  const prefillEmail = sp.get("email") ?? "";

  // Pre-fill email if provided (e.g., from a guest request submission)
  useEffect(() => {
    if (prefillEmail) {
      setForm((f) => ({ ...f, email: prefillEmail }));
    }
  }, [prefillEmail]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    consent: false,
  });
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    if (!form.consent) {
      toast.error("Please accept the consent checkbox.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sign-up failed");

      // Auto sign in
      const r2 = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (!r2 || r2.error) {
        toast.success("Account created — please sign in.");
        router.push(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }
      toast.success("Welcome to ParrotRehome.");
      trackConversion("sign_up");
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-up failed");
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
            Create your account
          </h1>
          <p className="text-feather text-[14px] font-body mb-6">
            Track your requests and receive secure payment instructions.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="name" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">Full name</label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-feather" aria-hidden />
                <input
                  id="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className="w-full h-11 pl-10 pr-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring"
                />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">Email</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-feather" aria-hidden />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  className="w-full h-11 pl-10 pr-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">
                Password <span className="text-feather/60 normal-case font-normal">(min 8 characters)</span>
              </label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-feather" aria-hidden />
                <input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
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
            <div>
              <label htmlFor="confirm" className="text-[12px] font-body font-semibold text-feather uppercase tracking-wide">Confirm password</label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-feather" aria-hidden />
                <input
                  id="confirm"
                  type={showPwd ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={form.confirm}
                  onChange={(e) => update("confirm", e.target.value)}
                  className="w-full h-11 pl-10 pr-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring"
                />
              </div>
            </div>
            <label className="flex items-start gap-2 text-[13px] font-body text-feather leading-relaxed cursor-pointer">
              <input
                type="checkbox"
                required
                checked={form.consent}
                onChange={(e) => update("consent", e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-feather/50 text-tail-red focus-ring"
              />
              <span>
                I consent to be contacted by ParrotRehome agents about my requests,
                and to the{" "}
                <Link href="/cms/privacy" className="text-tail-red hover:underline">privacy policy</Link>.
              </span>
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-full bg-tail-red hover:bg-tail-red-dark text-white text-[15px] font-body font-semibold transition-colors focus-ring shadow-sm disabled:bg-feather/40"
            >
              {submitting ? "Creating..." : "Create account"}
              {!submitting && <ArrowRight className="h-4 w-4" aria-hidden />}
            </button>
          </form>

          <p className="text-[13px] text-feather font-body text-center mt-5">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-tail-red hover:text-tail-red-dark font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return <Suspense fallback={<p className="p-6 text-feather">Loading…</p>}><SignUpContent /></Suspense>;
}
