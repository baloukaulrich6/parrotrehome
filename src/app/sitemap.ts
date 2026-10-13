import type { MetadataRoute } from "next";

const BASE = process.env.NEXTAUTH_URL ?? "https://parrotrehome.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  // Public pages — high priority
  const publicPages = [
    { url: `${BASE}/`, priority: 1.0, changeFrequency: "daily" as const },
    { url: `${BASE}/parrots`, priority: 0.9, changeFrequency: "daily" as const },
    { url: `${BASE}/supplies`, priority: 0.9, changeFrequency: "weekly" as const },
    { url: `${BASE}/avian-advice`, priority: 0.8, changeFrequency: "monthly" as const },
    { url: `${BASE}/how-it-works`, priority: 0.7, changeFrequency: "monthly" as const },
    { url: `${BASE}/about`, priority: 0.6, changeFrequency: "monthly" as const },
    { url: `${BASE}/contact`, priority: 0.6, changeFrequency: "monthly" as const },
    { url: `${BASE}/guides`, priority: 0.5, changeFrequency: "weekly" as const },
    { url: `${BASE}/favorites`, priority: 0.3, changeFrequency: "weekly" as const },
  ];
  return publicPages.map((p) => ({
    url: p.url,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
