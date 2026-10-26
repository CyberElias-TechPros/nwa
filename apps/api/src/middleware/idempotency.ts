import type { MiddlewareHandler } from 'hono';

/**
 * Idempotency-key middleware (T-W1-03).
 *
 * For prototype: if a client sends an `Idempotency-Key` header on a POST,
 * we replay a previously-seen 2xx/4xx response for the same key + URL within
 * a 24h TTL. W2: move cache to KV with body hashing and per-key locks.
 */
const store = new Map<string, { status: number; body: string; contentType: string; date: number }>();
const TTL_MS = 24 * 3600_000;

export const idempotency: MiddlewareHandler = async (c, next) => {
  const key = c.req.header('idempotency-key');
  if (!key || (c.req.method !== 'POST' && c.req.method !== 'PATCH')) {
    await next();
    return;
  }
  const k = `${key}:${c.req.url}`;
  const cached = store.get(k);
  if (cached && Date.now() - cached.date < TTL_MS) {
    return c.newResponse(cached.body, {
      status: cached.status as 200,
      headers: new Headers({ 'content-type': cached.contentType, 'Idempotency-Replay': 'true' }),
    });
  }
  await next();
  // Best-effort: cache JSON bodies for 2xx/4xx responses after downstream runs.
  if (c.res && c.res.status >= 200 && c.res.status < 500) {
    const ct = c.res.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) {
      try {
        const cloned = c.res.clone();
        const body = await cloned.text();
        store.set(k, { status: c.res.status, body, contentType: ct, date: Date.now() });
      } catch {
        /* non-readable — skip */
      }
    }
  }
  return;
};

export function __resetIdempotency() {
  store.clear();
}
