import ReactMarkdown from "react-markdown";
import { notFound } from "next/navigation";
import { publicContent } from "@/lib/public-content";
import { PolicyLinks } from "@/components/parrotrehome/policy-links";
export const metadata = { title: "About ParrotRehome" };
export default async function ContentPage() {
  const page = await publicContent("about");
  if (!page) return notFound();
  return <section className="max-w-4xl mx-auto px-4 py-12 space-y-8"><h1 className="display-heading text-slate text-4xl">{page.title}</h1><div className="prose prose-slate max-w-none prose-headings:font-heading prose-a:text-forest"><ReactMarkdown>{page.body}</ReactMarkdown></div><div className="border-t pt-6"><PolicyLinks /></div></section>;
}
