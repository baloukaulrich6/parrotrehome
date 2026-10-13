"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Mail, Send, Loader2 } from "lucide-react";
import { trackConversion } from "@/components/google-analytics";

export function NewsletterSubscribeForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined, source: "footer" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setSubmitted(true);
      toast.success(data.message || "Subscribed!");
      trackConversion("newsletter_subscribe");
      setEmail("");
      setName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div>
        <p className="font-heading text-ivory text-[16px] font-semibold mb-1">
          You&apos;re subscribed!
        </p>
        <p className="text-ivory/70 text-[12px] font-body mb-2">
          Thank you for joining. Watch your inbox for news, care tips, and exclusive offers.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="text-iris hover:text-iris-dark text-[12px] font-body font-semibold"
        >
          Subscribe another email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <p className="font-heading text-ivory text-[16px] font-semibold mb-1 flex items-center gap-2">
        <Mail className="h-4 w-4 text-iris" aria-hidden /> Newsletter
      </p>
      <p className="text-ivory/70 text-[12px] font-body">
        Care tips, new arrivals, and exclusive offers — once a month, never spam.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 h-9 px-3 rounded-md border border-feather/30 bg-ivory text-[13px] font-body focus-ring"
        />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-1 h-9 px-4 rounded-md bg-iris hover:bg-iris-dark text-slate text-[13px] font-body font-semibold disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Subscribe
        </button>
      </div>
      <p className="text-ivory/50 text-[11px] font-body">
        By subscribing, you consent to receive emails from ParrotRehome. Unsubscribe anytime.
      </p>
    </form>
  );
}
