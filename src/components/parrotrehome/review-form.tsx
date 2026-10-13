"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star, Send, Clock, Check } from "lucide-react";

export function ReviewForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 3) {
      toast.error("Title is too short (min 3 characters).");
      return;
    }
    if (body.trim().length < 10) {
      toast.error("Review body is too short (min 10 characters).");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          rating,
          title: title.trim(),
          body: body.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setSubmitted(true);
      toast.success(data.message ?? "Review submitted for moderation.");
      setTimeout(() => router.refresh(), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-forest/5 border border-forest/30 rounded-xl p-5 text-center">
        <Check className="h-8 w-8 text-forest mx-auto mb-2" aria-hidden />
        <h3 className="font-heading text-slate text-[16px] font-semibold mb-1">
          Review submitted
        </h3>
        <p className="text-feather text-[13px] font-body">
          Your review is pending moderation. It will appear once an admin approves it.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-feather/20 p-5 space-y-4">
      <h3 className="font-heading text-slate text-[16px] font-semibold flex items-center gap-2">
        <Star className="h-4 w-4 text-iris" aria-hidden /> Leave a verified review
      </h3>
      <p className="text-[12px] text-feather font-body">
        Only customers with a completed request can review — your review will be moderated by our team before being published.
      </p>

      {/* Star rating */}
      <div>
        <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Rating</label>
        <div className="mt-1 flex items-center gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n !== 1 ? "s" : ""}`}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              className="p-1 focus-ring rounded"
            >
              <Star
                className={`h-6 w-6 transition-colors ${
                  (hover || rating) >= n ? "text-iris" : "text-feather/40"
                }`}
                fill={(hover || rating) >= n ? "currentColor" : "none"}
                aria-hidden
              />
            </button>
          ))}
          <span className="ml-2 text-[13px] font-body font-semibold text-slate">
            {rating} / 5
          </span>
        </div>
      </div>

      <div>
        <label htmlFor="review-title" className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">
          Title *
        </label>
        <input
          id="review-title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarize your experience"
          className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring"
        />
      </div>

      <div>
        <label htmlFor="review-body" className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">
          Your review *
        </label>
        <textarea
          id="review-body"
          required
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share details about your experience with ParrotRehome, your bird, the agent, the consultation..."
          className="mt-1 w-full px-3 py-2 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring"
        />
        <p className="text-[11px] text-feather mt-1">{body.length} / 2000 characters</p>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-full bg-iris hover:bg-iris-dark text-slate text-[14px] font-body font-semibold transition-colors focus-ring disabled:bg-feather/40"
      >
        {submitting ? (
          <>
            <Clock className="h-4 w-4 animate-spin" /> Submitting...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" /> Submit review
          </>
        )}
      </button>
    </form>
  );
}
