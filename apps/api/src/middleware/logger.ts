import type { MiddlewareHandler } from 'hono';

/**
 * Structured request logger.
 *
 * T-W2-09: structured JSON with requestId, method, path, status, latency.
 * Does NOT log bodies, query strings, auth headers, or phone numbers.
 * In W2 we hook this up to Sentry / a log drain.
 */
export const logger: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = new URL(c.req.url).pathname;
  try {
    await next();
  } finally {
    const latency = Date.now() - start;
    const status = c.res.status;
    // Redact known-sensitive path segments: invite tokens are quasi-secret,
    // but we still want to know the route shape, so strip the actual value.
    const safePath = path.replace(/\/j\/[A-Za-z0-9_-]+/g, '/j/:token');
    const line = {
      ts: new Date().toISOString(),
      req: c.get('requestId'),
      method,
      path: safePath,
      status,
      latencyMs: latency,
    };
    // Worker-compatible: stdout is captured by Wrangler/Cloudflare logs.
    console.log(JSON.stringify(line));
  }
};
