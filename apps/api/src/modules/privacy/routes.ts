/**
 * Privacy / data-subject routes (gap G29 — NDPR/GDPR data portability + erasure).
 *
 *   POST /v1/privacy/requests      { kind: 'export' | 'delete' }
 *   GET  /v1/privacy/requests      list your own requests
 *   GET  /v1/privacy/requests/:id  download a ready export
 *
 * Requests are bound to the requesting deviceKey; admins can list all via
 * the admin app. Processing is synchronous in the memory adapter and will
 * become async (worker queue) in Postgres/Workers.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { DomainError, ErrorCode } from '@nwa/domain';
import type { Env } from '../../db/factory.js';

export const privacyRoutes = new Hono<Env>();

const CreateRequest = z.object({ kind: z.enum(['export', 'delete']) });

privacyRoutes.post('/requests', async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch { throw new DomainError(ErrorCode.VALIDATION_FAILED, 'Choose export or delete.'); }
  const parsed = CreateRequest.safeParse(body);
  if (!parsed.success) throw new DomainError(ErrorCode.VALIDATION_FAILED, 'Choose export or delete.');
  const repo = c.get('repo');
  const deviceKey = c.get('deviceKey');
  // De-dupe: if a request of this kind is already pending/ready, return it.
  const existing = await repo.listPrivacyRequests(deviceKey);
  const open = existing.find((r) => r.kind === parsed.data.kind && (r.status === 'pending' || r.status === 'ready'));
  if (open) return c.json({ request: open }, 200);

  const req = await repo.createPrivacyRequest({ kind: parsed.data.kind, deviceKey });
  // Kick off processing immediately (in-memory impl is synchronous; Postgres
  // impl will enqueue a background job).
  let processed = req;
  try {
    processed = req.kind === 'export'
      ? (await repo.processPrivacyExport(req.id)) ?? req
      : (await repo.processPrivacyDelete(req.id)) ?? req;
  } catch {
    // If processing fails (e.g. pg migration not run), leave as pending —
    // the admin will process it manually.
  }
  return c.json({ request: processed }, 201);
});

privacyRoutes.get('/requests', async (c) => {
  const repo = c.get('repo');
  const deviceKey = c.get('deviceKey');
  const list = await repo.listPrivacyRequests(deviceKey);
  return c.json({ requests: list });
});

privacyRoutes.get('/requests/:id', async (c) => {
  const repo = c.get('repo');
  const deviceKey = c.get('deviceKey');
  const id = c.req.param('id');
  const list = await repo.listPrivacyRequests(deviceKey);
  const req = list.find((r) => r.id === id);
  if (!req) throw new DomainError(ErrorCode.NOT_FOUND_OR_NOT_VISIBLE, 'No such request.');
  if (req.kind === 'export' && req.status === 'ready') {
    return c.json({ request: { id: req.id, kind: req.kind, status: req.status, createdAt: req.createdAt }, data: req.payload }, 200,
      { 'Content-Disposition': `attachment; filename="naweagree-export-${req.id}.json"` });
  }
  return c.json({ request: req });
});
