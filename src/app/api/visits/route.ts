import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getClientIP, rateLimit } from "@/lib/rate-limit";
import { canQualify, validVisitToken, visitorKey, visitSource, visitToken, VISIT_RETENTION_MS } from "@/lib/visit-tracking";
const start = z.object({ action: z.literal("start"), visitorId: z.string().uuid(), referrer: z.string().max(2048), landing: z.string().max(2048), consent: z.literal(true) }).strict();
const qualify = z.object({ action: z.literal("qualify"), id: z.string().uuid(), token: z.string().length(64), activeMs: z.number().finite().min(5001).max(1800000), consent: z.literal(true) }).strict();
export async function POST(req: Request) {
  const origin = new URL(process.env.NEXTAUTH_URL || req.url).origin;
  if (req.headers.get("origin") !== origin || req.headers.get("sec-gpc") === "1") return new Response(null, { status: 403 });
  if (/bot|crawler|spider|headless/i.test(req.headers.get("user-agent") || "")) return new Response(null, { status: 204 });
  if (!rateLimit(`visits:${getClientIP(req)}`, 60, 60000).ok) return new Response(null, { status: 429 });
  if (Number(req.headers.get("content-length")) > 8192) return new Response(null, { status: 413 });
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return new Response(null, { status: 503 });
  try {
    const raw = await req.text();
    if (raw.length > 8192) return new Response(null, { status: 413 });
    const parsed = z.union([start, qualify]).safeParse(JSON.parse(raw));
    if (!parsed.success) return new Response(null, { status: 400 });
    const data = parsed.data;
    const now = new Date();
    if (data.action === "start") {
      const landing = new URL(data.landing, origin);
      if (landing.origin !== origin || /^\/(admin|api|staff-mfa)(\/|$)/.test(landing.pathname)) return new Response(null, { status: 400 });
      const id = randomUUID();
      await db.siteVisit.deleteMany({ where: { startedAt: { lt: new Date(now.getTime() - VISIT_RETENTION_MS) } } });
      await db.siteVisit.create({ data: { id, visitorKey: visitorKey(data.visitorId, secret), source: visitSource(data.referrer, data.landing, origin), startedAt: now } });
      return NextResponse.json({ id, token: visitToken(id, secret) }, { headers: { "Cache-Control": "no-store" } });
    }
    if (!validVisitToken(data.id, data.token, secret)) return new Response(null, { status: 403 });
    const visit = await db.siteVisit.findUnique({ where: { id: data.id } });
    if (!visit) return new Response(null, { status: 404 });
    if (!canQualify(visit.startedAt, now)) return new Response(null, { status: 409 });
    await db.siteVisit.updateMany({ where: { id: visit.id, qualifiedAt: null }, data: { qualifiedAt: now } });
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) return new Response(null, { status: 400 });
    console.error("[visits] recording failed", error);
    return new Response(null, { status: 503 });
  }
}
