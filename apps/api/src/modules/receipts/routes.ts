/**
 * Receipt routes — download / verify signed receipts for mutually-acknowledged plans.
 *
 * Mount jobReceiptRoutes at /v1/jobs → /v1/jobs/:id/receipt, /v1/jobs/:id/receipt.txt
 * Mount receiptVerifyRoutes at /v1/receipts → /v1/receipts/verify
 */
import { Hono } from 'hono';
import type { Context } from 'hono';
import { DomainError, ErrorCode, JobStatus, type JobAggregate, type JobVersion, type Participant } from '@nwa/domain';
import type { Env } from '../../db/factory.js';
import { buildReceiptPayload, receiptToText, signReceipt, verifyReceipt } from './signing.js';

export const jobReceiptRoutes = new Hono<Env>();
export const receiptVerifyRoutes = new Hono<Env>();

const RECEIPT_ELIGIBLE_STATUSES = new Set<string>([
  JobStatus.mutually_acknowledged,
  JobStatus.in_progress,
  JobStatus.completion_review,
  JobStatus.completed,
  JobStatus.archived,
]);

type C = Context<Env>;
interface AuthJob { row: { job: JobAggregate; versions: { id: string }[] }; version: JobVersion }

async function loadAuthorisedJob(c: C): Promise<AuthJob> {
  const id = c.req.param('id');
  const repo = c.get('repo');
  const deviceKey = c.get('deviceKey');
  const row = await repo.getJob(id as never);
  if (!row) throw new DomainError(ErrorCode.NOT_FOUND_OR_NOT_VISIBLE, "We couldn't find that plan.");
  if (!RECEIPT_ELIGIBLE_STATUSES.has(row.job.status)) {
    throw new DomainError(ErrorCode.STATE_TRANSITION_INVALID, 'Receipts are only available once everyone has reviewed the plan.');
  }
  const participant = row.job.participants.find((p: Participant) => p.deviceKey === deviceKey);
  if (!participant) throw new DomainError(ErrorCode.FORBIDDEN, 'Only people on this plan can download its receipt.');
  const v = row.versions.find((x: { id: string }) => x.id === row.job.currentVersionId);
  if (!v) throw new DomainError(ErrorCode.INTERNAL_ERROR, 'No current version found.');
  return { row, version: v as JobVersion };
}

function getSecret(c: C): string | undefined {
  return ((c.env ?? {}) as Record<string, string | undefined>).RECEIPT_SECRET;
}

jobReceiptRoutes.get('/:id/receipt', async (c: C) => {
  const { row, version } = await loadAuthorisedJob(c);
  const payload = buildReceiptPayload(row.job, version);
  const signed = await signReceipt(payload, getSecret(c));
  const filename = `naweagree-${row.job.id}-v${version.number}.json`;
  return c.json(signed, 200, {
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'private, max-age=30',
  });
});

jobReceiptRoutes.get('/:id/receipt.txt', async (c: C) => {
  const { row, version } = await loadAuthorisedJob(c);
  const payload = buildReceiptPayload(row.job, version);
  const signed = await signReceipt(payload, getSecret(c));
  const text = receiptToText(signed) + `\n\nSignature (HS256, kid=${signed.sig.kid}): ${signed.sig.value}\n`;
  const filename = `naweagree-${row.job.id}-v${version.number}.txt`;
  return c.text(text, 200, {
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'private, max-age=30',
  });
});

receiptVerifyRoutes.post('/verify', async (c: C) => {
  let body: unknown;
  try { body = await c.req.json(); } catch { throw new DomainError(ErrorCode.VALIDATION_FAILED, 'Paste the receipt JSON.'); }
  const res = await verifyReceipt(body, getSecret(c));
  return c.json(res, res.ok ? 200 : 400);
});
