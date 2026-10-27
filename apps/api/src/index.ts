import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestId } from './middleware/requestId.js';
import { logger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimit } from './middleware/rateLimit.js';
import { idempotency } from './middleware/idempotency.js';
import { deviceKeyMiddleware } from './middleware/deviceKey.js';
import { repositoryMiddleware, type Env } from './db/factory.js';
import { healthRoutes } from './routes/health.js';
import { jobsRoutes, inviteRoutes } from './modules/jobs/routes.js';
import { schedulerRoutes } from './modules/scheduler/routes.js';
import { jobReceiptRoutes, receiptVerifyRoutes } from './modules/receipts/routes.js';
import { abuseRoutes } from './modules/abuse/routes.js';
import { privacyRoutes } from './modules/privacy/routes.js';

/**
 * NaWeAgree API entry point (Hono on Cloudflare Workers).
 *
 * W1 tasks will expand this router with identity, jobs, versions, etc.
 * Today it exposes /v1/health and /v1/ready plus a strict error envelope.
 */
const app = new Hono<Env>();

app.use('*', requestId);
app.use('*', logger);
app.use('*', rateLimit());
app.use('*', idempotency);
// Device key: issues a browser/device identifier cookie, used to bind
// participants to a device (T-W2-04 tier 0+1). Must come BEFORE repo
// middleware since auth checks in repo calls look at ctx.var.deviceKey.
app.use('*', deviceKeyMiddleware());
// Repository middleware picks Postgres when DATABASE_URL is set, otherwise
// falls back to the in-memory store.
app.use('*', repositoryMiddleware());
// W3: tighten allow list; browsers go through the BFF, not directly against the API.
// For local dev we allow localhost; replaced with strict origin list at deploy.
// CORS: allow known deploy hosts + localhost. Browsers always go through the
// web app (same-origin) in production; CORS exists mainly for local dev and
// for future PWA/Android direct API calls. The match list is permissive for
// preview hosts because there is no credentialed auth yet.
const ALLOWED_ORIGIN_SUFFIXES = ['naweagree.app', 'naweagree.com', '-naweagree.vercel.app'];
app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return '*';
      if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return origin;
      try {
        const { host } = new URL(origin);
        if (ALLOWED_ORIGIN_SUFFIXES.some((s) => host === s || host.endsWith('.' + s))) return origin;
      } catch {
        /* invalid origin, fall through */
      }
      return 'https://naweagree.app';
    },
    credentials: false,
    maxAge: 600,
  }),
);

app.route('/v1', healthRoutes);
app.route('/v1/jobs', jobsRoutes);
app.route('/v1/jobs', jobReceiptRoutes);   // /v1/jobs/:id/receipt(.txt)
app.route('/v1/invites', inviteRoutes);
app.route('/v1/abuse', abuseRoutes);       // /v1/abuse/report
app.route('/v1/privacy', privacyRoutes);   // /v1/privacy/requests...
app.route('/v1/receipts', receiptVerifyRoutes); // /v1/receipts/verify
// Internal scheduler routes (cron-invoked, SCHEDULER_SECRET-gated).
app.route('/_scheduler', schedulerRoutes);

app.onError(errorHandler);

app.notFound((c) =>
  c.json(
    {
      error: {
        code: 'NOT_FOUND_OR_NOT_VISIBLE',
        message: "We couldn't find that.",
        requestId: c.get('requestId'),
        retryable: false,
      },
    },
    404,
  ),
);

/**
 * Cloudflare Workers Cron Trigger handler — W4 gap G22.
 *
 * Exposed as `app.scheduled` so the Worker entry in wrangler can export both
 * `fetch` (the Hono app itself, preserving the test-friendly .request helper)
 * and `scheduled`. We forward to the same sweep logic used by
 * /_scheduler/sweep via an internal fetch so there is a single code path.
 */
(app as unknown as { scheduled: (c: unknown, env: Record<string, unknown>, ctx: { waitUntil: (p: Promise<unknown>) => void; passThroughOnException: () => void }) => Promise<void> }).scheduled = async function scheduled(
  _controller: unknown,
  env: Record<string, unknown>,
  executionCtx: { waitUntil: (p: Promise<unknown>) => void; passThroughOnException: () => void },
) {
  const url = 'https://nwa-api.intern/_scheduler/sweep';
  const req = new Request(url, { method: 'GET', headers: { 'x-scheduler-internal': '1' } });
  const resPromise = Promise.resolve(app.fetch(req as never, env as never, executionCtx as never));
  executionCtx.waitUntil(resPromise);
  try { await resPromise; } catch (err: unknown) { console.error('[cron] sweep failed:', err); }
};

export default app;
