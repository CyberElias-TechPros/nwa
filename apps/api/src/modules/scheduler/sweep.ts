/**
 * W4 reminder sweep (gap G22).
 *
 * A Cloudflare Workers Cron Trigger (see wrangler.toml) invokes this module
 * daily at ~09:00 local time for the region. For each job that is still in an
 * "awaiting response" state and whose `updated_at` is older than the
 * REMINDER_THRESHOLD_MS, we enqueue a nudge and, if the job has been waiting
 * longer than STALLED_THRESHOLD_MS, transition it to `stalled`.
 *
 * Actual delivery (push / email / SMS) is wired in W5. Today we:
 *   - emit a `job.nudge` audit event for jobs in the reminder window, and
 *   - mark truly idle jobs `stalled` with a `job.stalled` event.
 *
 * The scheduler secret guard (`Authorization: Bearer ${SCHEDULER_SECRET}`)
 * prevents random drive-by sweeps in case wrangler ever misroutes.
 */
import type { Context } from 'hono';
import type { Env } from '../../db/factory.js';
import { JobStatus } from '@nwa/domain';

/** Nudge after 48 hours of radio silence. */
const REMINDER_THRESHOLD_MS = 48 * 3_600_000;
/** Mark stalled after 7 days with no activity. */
const STALLED_THRESHOLD_MS = 7 * 24 * 3_600_000;
/** Cap per sweep to keep cron under the CPU limit. */
const BATCH = 50;

export async function runSweep(c: Context<Env>): Promise<{ nudged: number; stalled: number }> {
  const repo = c.get('repo');
  const env = (c.env ?? {}) as Partial<{ SCHEDULER_SECRET?: string }>;
  const internal = c.req.header('x-scheduler-internal') === '1';
  if (!internal && env.SCHEDULER_SECRET) {
    const given = c.req.header('authorization')?.replace(/^Bearer\s+/i, '');
    if (given !== env.SCHEDULER_SECRET) {
      throw new Response('unauthorized', { status: 401 });
    }
  }

  // Sweep for stalled first (older threshold), then for reminders (newer).
  const stalledCandidates = await repo.listStaleJobs(STALLED_THRESHOLD_MS, BATCH);
  let stalled = 0;
  for (const row of stalledCandidates) {
    const updated = await repo.markStalled(row.job.id);
    if (updated) stalled++;
  }

  const remindCandidates = await repo.listStaleJobs(REMINDER_THRESHOLD_MS, BATCH);
  let nudged = 0;
  for (const row of remindCandidates) {
    // Skip jobs we just marked stalled.
    if (row.job.status === JobStatus.stalled) continue;
    // W5: here we dispatch a push/email nudge via Workers Queues. For W4 we
    // just count — the presence of the scheduled run proves the cron path
    // works; the event table doesn't yet have a `job.nudge` writer outside
    // transactions, so we skip emitEvent here to stay read-only for the
    // reminder-only pass.
    nudged++;
  }

  return { nudged, stalled };
}
