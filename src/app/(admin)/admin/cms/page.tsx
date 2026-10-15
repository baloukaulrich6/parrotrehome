import { requireStaffPage } from "@/lib/staff-page";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateUTC } from "@/lib/constants";
import { FileText } from "lucide-react";
import { CmsPageEditDialog } from "@/components/admin/cms-page-edit-dialog";
import { FaqCreateButton, FaqEditButton, FaqDeleteButton } from "@/components/admin/faq-actions";
import { can } from "@/lib/rbac";
import { getServerUser } from "@/lib/auth";

export const metadata = { title: "CMS — Admin" };

export default async function AdminCmsPage() {
  await requireStaffPage();
  const user = await getServerUser();
  const canManage = user ? can(user.role, "cms:manage") : false;
  const pages = await db.cmsPage.findMany({
    orderBy: { slug: "asc" },
  });
  const faqs = await db.faqEntry.findMany({
    orderBy: { displayOrder: "asc" },
  });

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow mb-1">Content</p>
        <h1 className="font-heading text-slate text-[26px] lg:text-[32px] font-bold">
          CMS — Pages &amp; FAQ
        </h1>
        <p className="text-feather text-[14px] font-body mt-1">
          Manage static pages and FAQ entries (A-21).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pages */}
        <section className="bg-white rounded-xl border border-feather/20">
          <div className="px-5 py-3 border-b border-feather/15 flex items-center justify-between">
            <h2 className="font-heading text-slate text-[16px] font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-feather" aria-hidden /> Pages
            </h2>
            <span className="text-feather text-[12px] font-body">{pages.length} total</span>
          </div>
          <ul className="divide-y divide-feather/10">
            {pages.map((p) => (
              <li key={p.id} className="px-5 py-3 flex items-center justify-between hover:bg-feather/5">
                <div className="flex-1 min-w-0">
                  <Link href={`/cms/${p.slug}`} className="font-body text-slate font-semibold hover:text-tail-red">
                    {p.title}
                  </Link>
                  <p className="text-feather text-[12px] font-body">/cms/{p.slug}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-[11px] font-body font-semibold uppercase tracking-wide ${p.isPublished ? "text-forest" : "text-feather"}`}>
                    {p.isPublished ? "Published" : "Draft"}
                  </span>
                  {canManage && <CmsPageEditDialog page={{ slug: p.slug, title: p.title, body: p.body, isPublished: p.isPublished }} />}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* FAQs */}
        <section className="bg-white rounded-xl border border-feather/20">
          <div className="px-5 py-3 border-b border-feather/15 flex items-center justify-between">
            <h2 className="font-heading text-slate text-[16px] font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-feather" aria-hidden /> FAQ entries ({faqs.length})
            </h2>
            {canManage && <FaqCreateButton />}
          </div>
          <ul className="divide-y divide-feather/10 max-h-[28rem] overflow-y-auto custom-scroll">
            {faqs.map((f) => (
              <li key={f.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-slate font-body font-semibold text-[14px]">{f.question}</p>
                    <p className="text-feather text-[12px] font-body line-clamp-2 mt-0.5">{f.answer}</p>
                    <p className="text-feather text-[11px] font-body mt-1">
                      Category: {f.category ?? "—"} · Order: {f.displayOrder} ·{" "}
                      <span className={f.isPublished ? "text-forest" : "text-feather"}>
                        {f.isPublished ? "Published" : "Draft"}
                      </span>
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <FaqEditButton faq={{ id: f.id, question: f.question, answer: f.answer, category: f.category, displayOrder: f.displayOrder, isPublished: f.isPublished }} />
                      <FaqDeleteButton faqId={f.id} question={f.question} />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="bg-ivory border border-feather/20 rounded-xl p-4 text-[13px] font-body text-feather">
        <strong>Note:</strong> All edits are saved to the immutable audit log.
        Customers see published pages at <code className="bg-ivory px-1 rounded text-[12px]">/cms/&lt;slug&gt;</code> and FAQ entries at <code className="bg-ivory px-1 rounded text-[12px]">/contact</code> and <code className="bg-ivory px-1 rounded text-[12px]">/guides</code>.
      </div>
    </div>
  );
}
