import { db } from "@/lib/db";
import ReactMarkdown from "react-markdown";

export const metadata = { title: "Our promise" };

export default async function AboutPage() {
  const page = await db.cmsPage.findUnique({ where: { slug: "about" } });
  const body = page?.body ?? defaultBody;

  return (
    <div className="bg-ivory min-h-[60vh]">
      <section className="bg-white border-b border-feather/20 py-14 lg:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="eyebrow mb-3">ParrotRehome</p>
          <h1 className="display-heading text-slate text-[36px] lg:text-[52px] mb-4">
            Our promise
          </h1>
          <p className="text-feather text-[17px] font-body leading-relaxed max-w-2xl mx-auto">
            Four pillars guide everything we do — and every request we process.
          </p>
        </div>
      </section>

      <section className="py-10 lg:py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="prose prose-slate max-w-none prose-headings:font-heading prose-headings:text-slate prose-p:font-body prose-p:text-feather prose-p:leading-relaxed prose-h2:font-semibold prose-h2:text-[24px] prose-strong:text-slate prose-strong:font-semibold">
            <ReactMarkdown>{body}</ReactMarkdown>
          </div>
        </div>
      </section>
    </div>
  );
}

const defaultBody = `# Our promise

ParrotRehome was founded on a simple belief: a brighter life with birds begins with responsible, transparent, and caring practices.

## Nature
We show every bird in natural, dignified imagery. We never use misleading AI-generated photos for actual animals — every photo you see on a bird's file is the real bird.

## Trust
Each bird has an individual dossier with provenance documents, health records, and verified identity. We do not sell 'quantities of stock' — we help place specific, traceable individuals.

## Care
The well-being of every bird matters more than any sale. We screen adopters' experience and habitat, and we decline requests that we cannot responsibly fulfill.

## Accompaniment
A real, identified agent reviews every request. You always know what step comes next.`;
