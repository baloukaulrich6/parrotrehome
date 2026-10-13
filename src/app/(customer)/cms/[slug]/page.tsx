import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function CmsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await db.cmsPage.findUnique({ where: { slug } });
  if (!page || !page.isPublished) return notFound();

  return (
    <div className="bg-ivory min-h-[60vh]">
      <section className="bg-white border-b border-feather/20 py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-1 text-feather hover:text-tail-red text-[13px] font-body font-semibold mb-3">
            <ArrowLeft className="h-3.5 w-3.5" /> Home
          </Link>
          <h1 className="display-heading text-slate text-[32px] lg:text-[44px]">
            {page.title}
          </h1>
        </div>
      </section>
      <section className="py-10 lg:py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="prose prose-slate max-w-none prose-headings:font-heading prose-headings:text-slate prose-p:font-body prose-p:text-feather prose-p:leading-relaxed prose-h2:font-semibold prose-h2:text-[24px] prose-strong:text-slate prose-strong:font-semibold prose-a:text-tail-red hover:prose-a:text-tail-red-dark">
            <ReactMarkdown>{page.body}</ReactMarkdown>
          </div>
        </div>
      </section>
    </div>
  );
}
