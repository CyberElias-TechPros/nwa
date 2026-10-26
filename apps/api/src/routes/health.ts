import { Hono } from 'hono';

export const healthRoutes = new Hono();

healthRoutes.get('/health', (c) =>
  c.json({ status: 'ok', service: 'nwa-api', time: new Date().toISOString() }),
);

healthRoutes.get('/ready', (c) =>
  // W2: extend with DB / queue reachability checks.
  c.json({ status: 'ready', checks: { db: 'not-configured-yet', queue: 'not-configured-yet' } }),
);
