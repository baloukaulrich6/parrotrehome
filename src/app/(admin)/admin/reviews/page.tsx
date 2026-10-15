import { requireStaffPage } from "@/lib/staff-page";
import Link from "next/link";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { formatDateUTC } from "@/lib/constants";
import { ReviewModerationButtons } from "@/components/admin/review-moderation-buttons";
import { Star, MessageSquare } from "lucide-react";

export const metadata = { title: "Reviews — Admin" };

type SearchParams = { status?: string };

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireStaffPage();
  const sp = await searchParams;
  const user = await getServerUser();
  if (!user) return null;
  if (!can(user.role, "cms:manage")) {
    return (
      <div className="bg-white rounded-xl border border-feather/20 p-12 text-center">
        <MessageSquare className="h-10 w-10 text-feather mx-auto mb-3" aria-hidden />
        <h1 className="font-heading text-slate text-[20px] mb-2">Access restricted</h1>
        <p className="text-feather text-[14px] font-body mb-4">
          Only managers and super-admins can moderate reviews.
        </p>
        <Link href="/admin" className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-tail-red text-white text-[13px] font-body font-semibold">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const statusFilter = sp.status ?? "PENDING_MODERATION";
  const reviews = await db.review.findMany({
    where: sp.status ? { status: sp.status as "PENDING_MODERATION" | "PUBLISHED" | "REJECTED" } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const pendingCount = await db.review.count({ where: { status: "PENDING_MODERATION" } });
  const publishedCount = await db.review.count({ where: { status: "PUBLISHED" } });
  const rejectedCount = await db.review.count({ where: { status: "REJECTED" } });

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow mb-1">Trust &amp; quality</p>
        <h1 className="font-heading text-slate text-[26px] lg:text-[32px] font-bold flex items-center gap-2">
          <Star className="h-6 w-6 text-iris" aria-hidden /> Verified reviews
        </h1>
        <p className="text-feather text-[14px] font-body mt-1">
          Moderate customer reviews (A-24). Only reviews from completed requests are accepted.
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        <Link
          href="/admin/reviews?status=PENDING_MODERATION"
          className={`inline-flex items-center gap-2 h-9 px-4 rounded-full text-[13px] font-body font-semibold transition-colors ${
            statusFilter === "PENDING_MODERATION" ? "bg-tail-red text-white" : "bg-white border border-feather/30 text-feather hover:bg-feather/10"
          }`}
        >
          Pending ({pendingCount})
        </Link>
        <Link
          href="/admin/reviews?status=PUBLISHED"
          className={`inline-flex items-center gap-2 h-9 px-4 rounded-full text-[13px] font-body font-semibold transition-colors ${
            statusFilter === "PUBLISHED" ? "bg-forest text-white" : "bg-white border border-feather/30 text-feather hover:bg-feather/10"
          }`}
        >
          Published ({publishedCount})
        </Link>
        <Link
          href="/admin/reviews?status=REJECTED"
          className={`inline-flex items-center gap-2 h-9 px-4 rounded-full text-[13px] font-body font-semibold transition-colors ${
            statusFilter === "REJECTED" ? "bg-slate text-ivory" : "bg-white border border-feather/30 text-feather hover:bg-feather/10"
          }`}
        >
          Rejected ({rejectedCount})
        </Link>
        <Link
          href="/admin/reviews"
          className="inline-flex items-center gap-2 h-9 px-4 rounded-full text-[13px] font-body font-semibold bg-white border border-feather/30 text-feather hover:bg-feather/10"
        >
          All ({pendingCount + publishedCount + rejectedCount})
        </Link>
      </div>

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-feather/20 p-12 text-center">
          <MessageSquare className="h-10 w-10 text-feather mx-auto mb-3" aria-hidden />
          <h2 className="font-heading text-slate text-[20px] mb-2">No reviews in this view</h2>
          <p className="text-feather text-[14px] font-body">
            Reviews appear here when customers submit them after a completed request.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <article key={r.id} className="bg-white rounded-xl border border-feather/20 p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-heading text-slate text-[16px] font-semibold">{r.customerName}</span>
                    <span className="inline-flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i < r.rating ? "text-iris" : "text-feather/30"}`}
                          fill={i < r.rating ? "currentColor" : "none"}
                          aria-hidden
                        />
                      ))}
                    </span>
                    <span className={`status-badge ${
                      r.status === "PUBLISHED" ? "status-paid" :
                      r.status === "REJECTED" ? "status-canceled" :
                      "status-pending"
                    } text-[11px]`}>
                      {r.status === "PENDING_MODERATION" ? "Pending" : r.status === "PUBLISHED" ? "Published" : "Rejected"}
                    </span>
                  </div>
                  <p className="text-feather text-[12px] font-body">
                    {formatDateUTC(r.createdAt)} · Linked to {r.requestId.slice(0, 12)}…
                  </p>
                </div>
              </div>
              <h3 className="font-heading text-slate text-[18px] font-semibold mb-1">{r.title}</h3>
              <p className="text-feather text-[14px] font-body leading-relaxed whitespace-pre-line">{r.body}</p>
              {r.moderatorNote && (
                <p className="mt-3 text-[12px] text-feather italic bg-feather/5 border-l-2 border-feather pl-3 py-2">
                  Moderator note: {r.moderatorNote}
                </p>
              )}
              {r.status === "PENDING_MODERATION" && (
                <div className="mt-4 pt-3 border-t border-feather/15">
                  <ReviewModerationButtons reviewId={r.id} />
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
