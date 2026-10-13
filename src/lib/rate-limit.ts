// ============================================================
// ParrotRehome — Simple in-memory rate limiter
// For production, replace with Redis-based (@upstash/ratelimit)
// ============================================================

interface RateEntry {
  count: number;
  resetAt: number; // epoch ms
}

const store = new Map<string, RateEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (entry.count >= maxRequests) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { ok: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

// Helper: get client IP from request (handles proxies)
export function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIP = req.headers.get("x-real-ip");
  if (realIP) return realIP;
  return "unknown";
}

// Rate limit configs
export const RATE_LIMITS = {
  SIGN_IN: { max: 5, windowMs: 15 * 60 * 1000 },        // 5 attempts per 15 min
  SIGN_UP: { max: 3, windowMs: 60 * 60 * 1000 },          // 3 per hour
  COUPON_VALIDATE: { max: 10, windowMs: 10 * 60 * 1000 }, // 10 per 10 min
  NEWSLETTER: { max: 3, windowMs: 60 * 60 * 1000 },        // 3 per hour
  CONTACT: { max: 5, windowMs: 60 * 60 * 1000 },           // 5 per hour
  APPOINTMENT: { max: 5, windowMs: 60 * 60 * 1000 },       // 5 per hour
  REQUEST_SUBMIT: { max: 10, windowMs: 60 * 60 * 1000 },  // 10 per hour
};

// Helper: check rate limit and return 429 if exceeded
export function checkRateLimit(
  req: Request,
  action: keyof typeof RATE_LIMITS
): { ok: boolean; response?: import("next/server").NextResponse } {
  const config = RATE_LIMITS[action];
  const ip = getClientIP(req);
  const result = rateLimit(`rate:${action}:${ip}`, config.max, config.windowMs);
  if (!result.ok) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    return {
      ok: false,
      response: new Response(
        JSON.stringify({
          error: `Too many ${action.toLowerCase().replace(/_/g, " ")} attempts. Please try again in ${retryAfter} seconds.`,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
          },
        }
      ),
    };
  }
  return { ok: true };
}
