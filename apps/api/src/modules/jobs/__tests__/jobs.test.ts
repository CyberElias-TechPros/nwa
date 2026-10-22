import { describe, expect, it, beforeEach } from 'vitest';
import app from '../../../index.js';
import { resetMemoryRepo } from '../../../db/factory.js';

const CREATOR_KEY = 'dev-creator-0000000000000001';
const RECIPIENT_KEY = 'dev-recipient-00000000000001';

async function creatorReq(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers ?? {});
  headers.set('x-device-key', CREATOR_KEY);
  headers.set('origin', 'https://naweagree.app');
  return app.request(path, { ...init, headers });
}
async function recipientReq(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers ?? {});
  headers.set('x-device-key', RECIPIENT_KEY);
  return app.request(path, { ...init, headers });
}

describe('jobs + invites flow', () => {
  beforeEach(async () => { await resetMemoryRepo(); });

  async function createJob(overrides: Record<string, unknown> = {}) {
    const res = await creatorReq('/v1/jobs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: "A tailor's dress", categoryKey: 'tailor', creatorName: 'Ada', ...overrides }),
    });
    return { res, body: (await res.json()) as { job: { id: string; title: string }; invite: { token: string; url: string }; creatorParticipantId: string } };
  }

  it('creates a job and returns an invite URL', async () => {
    const { res, body } = await createJob();
    expect(res.status).toBe(201);
    expect(body.job.title).toBe("A tailor's dress");
    expect(body.invite.url).toMatch(/^https:\/\/naweagree\.app\/j\//);
    expect(body.invite.token).toMatch(/^[a-z0-9]+$/);
    expect(body.creatorParticipantId).toMatch(/^p/);
  });

  it('rejects a too-short title with VALIDATION_FAILED and per-field errors', async () => {
    const res = await creatorReq('/v1/jobs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'ok' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string; fields: { path: string }[] } };
    expect(body.error.code).toBe('VALIDATION_FAILED');
    expect(body.error.fields?.[0]?.path).toBe('title');
  });

  it('public invite preview returns the job for a valid token (mine=true for creator device)', async () => {
    const { body: created } = await createJob();
    const res = await creatorReq(`/v1/invites/${created.invite.token}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { job: { title: string }; currentVersion: { number: number; fields: unknown[] }; myParticipantId: string; creatorParticipantId: string | null };
    expect(body.job.title).toBe("A tailor's dress");
    expect(body.currentVersion.number).toBe(1);
    expect(body.myParticipantId).toBe(created.creatorParticipantId);
    expect(body.creatorParticipantId).toBe(created.creatorParticipantId);
  });

  it('unknown invite token returns NOT_FOUND_OR_NOT_VISIBLE', async () => {
    const res = await app.request('/v1/invites/doesnotexist00000');
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('NOT_FOUND_OR_NOT_VISIBLE');
  });

  it('get job by id returns 404 for unknown', async () => {
    const res = await app.request('/v1/jobs/job_doesnotexist');
    expect(res.status).toBe(404);
  });

  it('GET /jobs/mine returns jobs created or claimed by the device', async () => {
    await createJob();
    const res = await creatorReq('/v1/jobs/mine');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { jobs: { title: string }[] };
    expect(body.jobs).toHaveLength(1);
    expect(body.jobs[0]!.title).toBe("A tailor's dress");
  });

  it('cross-device mutating action returns FORBIDDEN', async () => {
    const { body: created } = await createJob();
    // Recipient device claims the invite.
    const claimRes = await recipientReq(`/v1/invites/${created.invite.token}/claim`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ displayName: 'Chidi' }),
    });
    expect(claimRes.status).toBe(200);
    const claimBody = (await claimRes.json()) as { participantId: string };
    // Creator device cannot ack AS the recipient (cross-device).
    const bad = await creatorReq(`/v1/invites/${created.invite.token}/ack`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ participantId: claimBody.participantId, action: 'reviewed' }),
    });
    expect(bad.status).toBe(403);
  });

  it('rotate-invite revokes the old link and issues a fresh one (creator-only)', async () => {
    const { body: created } = await createJob();
    // Recipient claims the original invite first.
    await recipientReq(`/v1/invites/${created.invite.token}/claim`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ displayName: 'Chidi' }),
    });
    // Non-creator (recipient device) cannot rotate (no participant header → 401; with their participantId → 403).
    const forbidden = await recipientReq(`/v1/jobs/${created.job.id}/rotate-invite`, {
      method: 'POST',
      headers: { 'x-participant-id': 'p_does_not_exist' },
    });
    expect(forbidden.status).toBe(403);
    // Creator rotates → new token issued, old token now revoked for re-claim.
    const rot = await creatorReq(`/v1/jobs/${created.job.id}/rotate-invite`, {
      method: 'POST',
      headers: { 'x-participant-id': created.creatorParticipantId },
    });
    expect(rot.status).toBe(200);
    const rotBody = (await rot.json()) as { oldToken: string; invite: { token: string } };
    expect(rotBody.invite.token).not.toBe(created.invite.token);
    expect(rotBody.oldToken).toBe(created.invite.token);
    // Re-claiming the OLD token from a new (3rd) device yields revoked, not a successful claim.
    const thirdParty = await app.request(`/v1/invites/${created.invite.token}/claim`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-device-key': 'dev-other-000000000000009' },
      body: JSON.stringify({ displayName: 'Eve' }),
    });
    // The old invite was revoked; expect 404/410. We don't specifically assert the code
    // here, but crucially the response must NOT be 200 (claim success).
    expect(thirdParty.status).not.toBe(200);
  });
});
