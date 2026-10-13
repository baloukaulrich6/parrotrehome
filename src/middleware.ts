import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

// ============================================================
// ParrotRehome — Security middleware (rate limiting only)
// Only intercepts the NextAuth credentials callback for rate limiting.
// Security headers are set via next.config.ts headers() instead.
// ============================================================

export function middleware(req: NextRequest) {
  // Rate limit on sign-in attempts (NextAuth credentials callback)
  if (req.nextUrl.pathname === "/api/auth/callback/credentials" && req.method === "POST") {
    const ip = getClientIP(req as unknown as Request);
    const result = rateLimit(`rate:SIGN_IN:${ip}`, 5, 15 * 60 * 1000);
    if (!result.ok) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: `Too many sign-in attempts. Please try again in ${retryAfter} seconds.`,
        },
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
          },
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  // ONLY match the auth callback — don't intercept page routes or other APIs
  // (page-level auth redirects must not be intercepted by middleware)
  matcher: ["/api/auth/callback/credentials"],
};
