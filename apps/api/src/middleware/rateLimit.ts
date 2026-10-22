import type { MiddlewareHandler } from 'hono';
import { DomainError, ErrorCode } from '@nwa/domain';

/**
 * In-memory sliding-window rate limit. W2: this moves to Cloudflare KV or
 * a Redis-compatible store so limits survive across Worker isolates.
 *
 * Buckets defined per T-W1-06. For prototype we only enforce a generic
 * per-IP limit to avoid runaway abuse.
 */
const WINDOW_MS = 60_000;
const GENERIC_LIMIT = 120; // requests/min/IP — generous for a single user.

const buckets = new Map<string, { hits: number; resetAt: number }>();

function clientIp(c: { req: { header: (k: string) => string | undefined } }): string {
  const cf = c.req.header('cf-connecting-ip');
  const xff = c.req.header('x-forwarded-for');
  return cf ?? (xff ? xff.split(',')[0]!.trim() : 'unknown');
}

export function rateLimit(max = GENERIC_LIMIT, windowMs = WINDOW_MS): MiddlewareHandler {
  return async (c, next) => {
    const key = `${clientIp(c)}:${max}:${windowMs}`;
    const now = Date.now();
    let b = buckets.get(key);
    if (!b || b.resetAt < now) {
      b = { hits: 0, resetAt: now + windowMs };
      buckets.set(key, b);
    }
    b.hits++;
    c.header('x-ratelimit-limit', String(max));
    c.header('x-ratelimit-remaining', String(Math.max(0, max - b.hits)));
    c.header('x-ratelimit-reset', String(Math.ceil((b.resetAt - now) / 1000)));
    if (b.hits > max) {
      throw new DomainError(ErrorCode.RATE_LIMITED, 'Slow down a little — too many requests. Try again in a minute.', true);
    }
    await next();
  };
}

/** Exported for tests. */
export function __resetBuckets() {
  buckets.clear();
}
