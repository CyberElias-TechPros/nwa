import { Hono } from 'hono';
import type { Env } from '../db/factory.js';

export const healthRoutes = new Hono<Env>();

healthRoutes.get('/health', (c) =>
  c.json({ status: 'ok', service: 'nwa-api', time: new Date().toISOString() }),
);

healthRoutes.get('/ready', async (c) => {
  const repo = c.get('repo');
  const env = (c.env ?? {}) as Record<string, string | undefined>;
  const secret = env.RECEIPT_SECRET;
  return c.json({
    status: 'ready',
    service: 'nwa-api',
    time: new Date().toISOString(),
    checks: {
      db: repo.backend,
      receipts: secret ? 'configured' : 'dev-secret',
      queue: 'in-process',
      scheduler: 'cron-09:00-utc',
    },
    limits: {
      maxPlanLength: 4000,
      maxParticipants: 8,
      inviteTtlDays: 14,
      nudgeAfterHours: 48,
      stalledAfterDays: 7,
    },
  });
});
