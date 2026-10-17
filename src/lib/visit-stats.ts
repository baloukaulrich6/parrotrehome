import { db } from "./db";
import { VISIT_SOURCES, type VisitSource } from "./visit-tracking";
// Attribute a browser once per period, to its first qualified visit in that period.
export async function visitStats(since: Date) {
  const groups = await db.siteVisit.groupBy({ by: ["visitorKey", "source"], where: { qualifiedAt: { gte: since } }, _min: { qualifiedAt: true }, orderBy: [{ _min: { qualifiedAt: "asc" } }, { source: "asc" }] });
  const sources = Object.fromEntries(VISIT_SOURCES.map(source => [source, 0])) as Record<VisitSource, number>;
  const seen = new Set<string>();
  for (const group of groups) {
    if (seen.has(group.visitorKey)) continue;
    seen.add(group.visitorKey);
    if (VISIT_SOURCES.includes(group.source as VisitSource)) sources[group.source as VisitSource]++;
  }
  return { total: seen.size, sources };
}
