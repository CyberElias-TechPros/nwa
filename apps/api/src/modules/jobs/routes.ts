import { Hono } from 'hono';
import { z } from 'zod';
import { DomainError, ErrorCode, AckAction, type JobAggregate, type JobVersion } from '@nwa/domain';
import type { Env } from '../../db/factory.js';

/**
 * Job + invite routes.
 *
 * All data access goes through ctx.var.repo (a JobRepository). Device identity
 * comes from ctx.var.deviceKey, which deviceKeyMiddleware mints as an HTTP-
 * only cookie (or echoes back in X-Device-Key for non-browser clients).
 *
 * Device-key binding (T-W2-04 tier 0+1):
 *   - createJob binds the creator participant to the request's deviceKey.
 *   - claimInvite binds the newly-created recipient participant to the device.
 *   - All mutating actions (ack/changes/publishVersion/rotateInvite) check
 *     authorise() which requires that the acting participant is either
 *     (a) bound to the requesting device, or (b) not yet bound to any device
 *     (back-compat for in-memory/test state).
 *   - Anyone can view the invite preview (we don't gate reads) — the link
 *     token itself is the bearer secret for read access.
 */
export const jobsRoutes = new Hono<Env>();
export const inviteRoutes = new Hono<Env>();

const CreateJobSchema = z.object({
  title: z.string().trim().min(3).max(120),
  categoryKey: z.string().trim().min(1).max(40).default('other'),
  creatorName: z.string().trim().min(1).max(60).default('You'),
  initialNotes: z.string().trim().max(4000).optional(),
});

jobsRoutes.post('/', async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch { throw new DomainError(ErrorCode.VALIDATION_FAILED, 'Invalid JSON body.'); }
  const parsed = CreateJobSchema.safeParse(body);
  if (!parsed.success) {
    throw new DomainError(
      ErrorCode.VALIDATION_FAILED,
      'Some fields need a second look.',
      false,
      parsed.error.issues.map((i) => ({ path: i.path.join('.'), code: i.code, message: i.message })),
    );
  }
  const repo = c.get('repo');
  const deviceKey = c.get('deviceKey');
  const { job, invite, creatorId } = await repo.createJob({ ...parsed.data, deviceKey });
  const origin = c.req.header('origin') ?? 'https://naweagree.app';
  return c.json(
    {
      job: publicView(job),
      invite: {
        token: invite.token,
        url: `${origin}/j/${invite.token}`,
        expiresAt: invite.expiresAt,
        role: invite.toRole,
      },
      creatorParticipantId: creatorId,
    },
    201,
  );
});

jobsRoutes.get('/mine', async (c) => {
  const repo = c.get('repo');
  const deviceKey = c.get('deviceKey');
  const jobs = await repo.listJobsForDevice(deviceKey);
  return c.json({ jobs: jobs.map(publicView) });
});

jobsRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const repo = c.get('repo');
  const row = await repo.getJob(id as never);
  if (!row) throw new DomainError(ErrorCode.NOT_FOUND_OR_NOT_VISIBLE, "We couldn't find that plan.");
  return c.json({ job: publicView(row.job), currentVersion: row.job.currentVersion });
});

inviteRoutes.get('/:token', async (c) => {
  const token = c.req.param('token');
  const repo = c.get('repo');
  const deviceKey = c.get('deviceKey');
  const res = await repo.resolveInvite(token);
  if ('error' in res) throw inviteError(res.error);
  const { row, invite } = res;
  // Tell the client whether this device created the plan (so it can route to
  // CreatorView without storing the creatorParticipantId in the URL). The
  // server decides authoritatively based on the bound device.
  const creator = row.job.participants.find((p) => p.role === 'creator');
  const mine = Boolean(creator && (await repo.authorise({ jobId: row.job.id, participantId: creator.id, deviceKey })));
  const versions = await repo.listVersions(row.job.id);
  const changes = await repo.listChangeRequests(row.job.id);
  return c.json({
    invite: {
      token: invite.token, role: invite.toRole, expiresAt: invite.expiresAt,
      claimed: Boolean(invite.toParticipantId), participantName: invite.toDisplayName ?? null,
    },
    job: publicView(row.job),
    currentVersion: versionView(row.job.currentVersion!),
    versions: versions.map(versionView),
    changes: changes.map((cr) => ({
      id: cr.id, kind: cr.kind, comment: cr.comment,
      authorName: participantName(row.job.participants, cr.authorParticipantId),
      createdAt: cr.createdAt,
    })),
    // If the device is bound to a participant on this job, tell the client
    // which one so it doesn't show the "enter your name" form.
    myParticipantId: (() => {
      for (const p of row.job.participants) {
        if (p.deviceKey === deviceKey) return p.id;
      }
      return null;
    })(),
    // Back-compat for creator routing while clients upgrade.
    creatorParticipantId: mine && creator ? creator.id : null,
  });
});

const ClaimSchema = z.object({ displayName: z.string().trim().min(1).max(60) });
inviteRoutes.post('/:token/claim', async (c) => {
  const token = c.req.param('token');
  const repo = c.get('repo');
  const deviceKey = c.get('deviceKey');
  const r = await repo.resolveInvite(token);
  if ('error' in r) throw inviteError(r.error);
  let body: unknown;
  try { body = await c.req.json(); } catch { throw new DomainError(ErrorCode.VALIDATION_FAILED, 'Invalid JSON body.'); }
  const parsed = ClaimSchema.safeParse(body);
  if (!parsed.success) throw new DomainError(ErrorCode.VALIDATION_FAILED, 'Tell us your name so the sender knows who is responding.');
  const claim = await repo.claimInvite(token, { displayName: parsed.data.displayName, deviceKey });
  if ('error' in claim) {
    if (claim.error === 'already_claimed') {
      throw new DomainError(ErrorCode.FORBIDDEN, 'Someone else already responded to this invite from another device. Ask the sender to reset the link if that was not you.');
    }
    throw inviteError(claim.error);
  }
  return c.json({ participantId: claim.participant.id, status: 'claimed' });
});

async function assertAuthorised(repo: Env['Variables']['repo'], jobId: string, participantId: string | undefined, deviceKey: string) {
  if (!participantId) throw new DomainError(ErrorCode.UNAUTHENTICATED, 'Tell us who you are on this plan first.');
  const p = await repo.authorise({ jobId: jobId as never, participantId: participantId as never, deviceKey });
  if (!p) throw new DomainError(ErrorCode.FORBIDDEN, 'This link is tied to a different device. Ask the sender for a fresh link if you need to respond from here.');
  return p;
}

const AckSchema = z.object({
  participantId: z.string().min(1),
  action: z.enum(['reviewed', 'question', 'disagree', 'need_time', 'withdrawn']),
  comment: z.string().trim().max(2000).optional(),
});
inviteRoutes.post('/:token/ack', async (c) => {
  const token = c.req.param('token');
  const repo = c.get('repo');
  const deviceKey = c.get('deviceKey');
  const r = await repo.resolveInvite(token);
  if ('error' in r) throw inviteError(r.error);
  let body: unknown;
  try { body = await c.req.json(); } catch { throw new DomainError(ErrorCode.VALIDATION_FAILED, 'Invalid JSON body.'); }
  const parsed = AckSchema.safeParse(body);
  if (!parsed.success) throw new DomainError(ErrorCode.VALIDATION_FAILED, 'Tell us how you want to respond.');
  await assertAuthorised(repo, r.row.job.id, parsed.data.participantId, deviceKey);
  const { job } = await repo.acknowledge({
    jobId: r.row.job.id,
    participantId: parsed.data.participantId as never,
    action: parsed.data.action as AckAction,
    comment: parsed.data.comment,
  });
  return c.json({ job: publicView(job), currentVersion: versionView(job.currentVersion!), status: job.status });
});

const ChangeSchema = z.object({
  participantId: z.string().min(1),
  kind: z.enum(['question', 'change']),
  comment: z.string().trim().min(2).max(2000),
});
inviteRoutes.post('/:token/changes', async (c) => {
  const token = c.req.param('token');
  const repo = c.get('repo');
  const deviceKey = c.get('deviceKey');
  const r = await repo.resolveInvite(token);
  if ('error' in r) throw inviteError(r.error);
  let body: unknown;
  try { body = await c.req.json(); } catch { throw new DomainError(ErrorCode.VALIDATION_FAILED, 'Invalid JSON body.'); }
  const parsed = ChangeSchema.safeParse(body);
  if (!parsed.success) throw new DomainError(ErrorCode.VALIDATION_FAILED, 'Write a short note about what needs to change.');
  await assertAuthorised(repo, r.row.job.id, parsed.data.participantId, deviceKey);
  await repo.addChangeRequest({
    jobId: r.row.job.id,
    versionId: r.row.job.currentVersionId!,
    authorParticipantId: parsed.data.participantId as never,
    kind: parsed.data.kind,
    comment: parsed.data.comment,
  });
  return c.json({ status: 'recorded' }, 201);
});

jobsRoutes.post('/:id/rotate-invite', async (c) => {
  const id = c.req.param('id');
  const repo = c.get('repo');
  const deviceKey = c.get('deviceKey');
  const row = await repo.getJob(id as never);
  if (!row) throw new DomainError(ErrorCode.NOT_FOUND_OR_NOT_VISIBLE, "We couldn't find that plan.");
  const actorId = c.req.header('x-participant-id');
  const actor = await assertAuthorised(repo, row.job.id, actorId, deviceKey);
  if (actor.role !== 'creator') throw new DomainError(ErrorCode.FORBIDDEN, 'Only the person who started the plan can reset the invite link.');
  const result = await repo.rotateInvite(row.job.id, actor.id as never);
  if ('error' in result) throw new DomainError(ErrorCode.NOT_FOUND_OR_NOT_VISIBLE, "We couldn't find that plan.");
  const origin = c.req.header('origin') ?? 'https://naweagree.app';
  return c.json({
    oldToken: result.oldToken,
    invite: {
      token: result.newInvite.token,
      url: `${origin}/j/${result.newInvite.token}`,
      expiresAt: result.newInvite.expiresAt,
    },
  });
});

function publicView(j: JobAggregate) {
  return {
    id: j.id, title: j.title, categoryKey: j.categoryKey, status: j.status, updatedAt: j.updatedAt,
    currentVersionId: j.currentVersionId,
    openChangeCount: j.openChangeCount, openQuestionCount: j.openQuestionCount,
    participants: j.participants.map((p) => ({
      id: p.id, displayName: p.displayName, role: p.role, state: p.state,
    })),
  };
}

function versionView(v: JobVersion) {
  return {
    id: v.id, number: v.number, status: v.status, reason: v.reason ?? null,
    parentVersionId: v.parentVersionId ?? null, authorParticipantId: v.authorParticipantId ?? null,
    fields: v.fields.map((f) => ({ key: f.key, label: f.label, valueRaw: f.valueRaw, valueDisplay: f.valueDisplay ?? null })),
    acknowledgements: v.acknowledgements.map((a) => ({
      id: a.id, participantId: a.participantId, action: a.action, comment: a.comment ?? null, createdAt: a.createdAt,
    })),
    createdAt: v.createdAt,
  };
}

function participantName(participants: { id: string; displayName: string }[], id: string) {
  return participants.find((p) => p.id === id)?.displayName ?? 'Someone';
}

const NewVersionSchema = z.object({
  reason: z.string().trim().min(2, 'Say what changed and why.').max(500),
  expectedVersion: z.number().int().positive().optional(),
  fields: z
    .array(z.object({ key: z.string().min(1).max(40), label: z.string().min(1).max(80), value: z.string().trim().min(1).max(2000) }))
    .min(1).max(30),
});
jobsRoutes.post('/:id/versions', async (c) => {
  const id = c.req.param('id');
  const repo = c.get('repo');
  const deviceKey = c.get('deviceKey');
  const row = await repo.getJob(id as never);
  if (!row) throw new DomainError(ErrorCode.NOT_FOUND_OR_NOT_VISIBLE, "We couldn't find that plan.");
  const authorIdHeader = c.req.header('x-participant-id');
  const author = await assertAuthorised(repo, row.job.id, authorIdHeader, deviceKey);
  let body: unknown;
  try { body = await c.req.json(); } catch { throw new DomainError(ErrorCode.VALIDATION_FAILED, 'Invalid JSON body.'); }
  const parsed = NewVersionSchema.safeParse(body);
  if (!parsed.success) {
    throw new DomainError(ErrorCode.VALIDATION_FAILED, 'Fill in at least one field for the new version.', false,
      parsed.error.issues.map((i) => ({ path: i.path.join('.'), code: i.code, message: i.message })));
  }
  const current = row.versions.find((v) => v.id === row.job.currentVersionId);
  if (parsed.data.expectedVersion != null && current && current.number !== parsed.data.expectedVersion) {
    const versions = await repo.listVersions(row.job.id);
    return c.json(
      {
        error: {
          code: ErrorCode.VERSION_CONFLICT,
          message: 'Someone posted a new version while you were editing. Review the latest version and try again.',
          currentVersion: versionView(row.job.currentVersion!),
          versions: versions.map(versionView),
        },
      },
      409,
    );
  }
  const { job, version } = await repo.publishNewVersion({
    jobId: row.job.id,
    authorParticipantId: author.id as never,
    reason: parsed.data.reason,
    fields: parsed.data.fields,
  });
  const versions = await repo.listVersions(job.id);
  return c.json({ job: publicView(job), version: versionView(version), versions: versions.map(versionView) }, 201);
});

jobsRoutes.get('/:id/versions', async (c) => {
  const id = c.req.param('id');
  const repo = c.get('repo');
  const row = await repo.getJob(id as never);
  if (!row) throw new DomainError(ErrorCode.NOT_FOUND_OR_NOT_VISIBLE, "We couldn't find that plan.");
  const versions = await repo.listVersions(row.job.id);
  return c.json({ versions: versions.map(versionView) });
});

function inviteError(kind: 'expired' | 'revoked' | 'missing' | 'already_claimed') {
  const code =
    kind === 'expired' ? ErrorCode.INVITATION_EXPIRED
    : kind === 'revoked' ? ErrorCode.INVITATION_REVOKED
    : kind === 'already_claimed' ? ErrorCode.FORBIDDEN
    : ErrorCode.NOT_FOUND_OR_NOT_VISIBLE;
  const msg =
    kind === 'expired' ? 'This invite link has expired. Ask for a new one.'
    : kind === 'revoked' ? 'This invite was cancelled.'
    : kind === 'already_claimed' ? 'This invite has been claimed on another device.'
    : "We couldn't find that plan. The link may have a typo.";
  return new DomainError(code, msg);
}
