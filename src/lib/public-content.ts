import { db } from "./db";
import { contentPages, POLICY_VERSION } from "./policy-content";
import { mailConfiguration } from "./email-transport";
export async function publicContent(slug: string) {
  const saved = await db.cmsPage.findUnique({ where: { slug } });
  if (saved && !saved.isPublished) return null;
  const page = saved || (Object.hasOwn(contentPages, slug) ? contentPages[slug] : null);
  if (!page) return null;
  return { title: page.title, body: page.body.replaceAll("{{supportEmail}}", mailConfiguration().replyTo), version: saved ? saved.updatedAt.toISOString() : POLICY_VERSION };
}
