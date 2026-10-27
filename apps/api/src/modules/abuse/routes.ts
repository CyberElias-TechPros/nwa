/**
 * Abuse reporting (gap G27).
 *
 * Accepts a report, returns a tracking id, and writes it to the audit log.
 * In production this will fan out to email + moderation queue; today it
 * records in the store so we can surface reports in the admin UI and build
 * trust signals (we don't silently drop them).
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { DomainError, ErrorCode } from '@nwa/domain';
import type { Env } from '../../db/factory.js';

export const abuseRoutes = new Hono<Env>();

const ReportSchema = z.object({
  reason: z.enum(['harassment', 'scam', 'impersonation', 'under_age', 'violence', 'other']),
  jobId: z.string().min(1).max(64).optional(),
  token: z.string().min(1).max(120).optional(),
  description: z.string().trim().min(10, 'A short description helps us act.').max(2000),
  contact: z.string().trim().max(200).optional(),
});

abuseRoutes.post('/report', async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch { throw new DomainError(ErrorCode.VALIDATION_FAILED, 'Tell us what happened.'); }
  const parsed = ReportSchema.safeParse(body);
  if (!parsed.success) {
    throw new DomainError(ErrorCode.VALIDATION_FAILED, 'Tell us what happened.', false,
      parsed.error.issues.map((i) => ({ path: i.path.join('.'), code: i.code, message: i.message })));
  }
  const repo = c.get('repo');
  const deviceKey = c.get('deviceKey');
  const id = await repo.recordAbuseReport({
    reason: parsed.data.reason,
    jobId: parsed.data.jobId,
    token: parsed.data.token,
    description: parsed.data.description,
    contact: parsed.data.contact,
    reporterDeviceKey: deviceKey ?? null,
  });
  return c.json({ id, status: 'received', message: 'Thanks — a human will look at this.' }, 201);
});
