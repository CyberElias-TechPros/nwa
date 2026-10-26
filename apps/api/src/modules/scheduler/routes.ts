/**
 * Scheduler (cron) routes — W4 gap G22.
 *
 * Cloudflare Workers Cron Triggers hit `GET /_scheduler/sweep` on a cron
 * expression defined in wrangler.toml. We also accept POST for manual
 * triggers from the admin tooling. The sweep handler enforces
 * SCHEDULER_SECRET when the secret is set.
 */
import { Hono } from 'hono';
import type { Env } from '../../db/factory.js';
import { runSweep } from './sweep.js';

export const schedulerRoutes = new Hono<Env>();

schedulerRoutes.get('/sweep', async (c) => {
  const result = await runSweep(c);
  return c.json({ ok: true, ...result });
});

schedulerRoutes.post('/sweep', async (c) => {
  const result = await runSweep(c);
  return c.json({ ok: true, ...result }, 200);
});
