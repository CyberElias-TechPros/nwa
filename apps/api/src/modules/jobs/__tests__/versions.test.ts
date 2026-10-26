import { describe, expect, it, beforeEach } from 'vitest';
import app from '../../../index.js';
import { resetMemoryRepo } from '../../../db/factory.js';

const CREATOR_KEY = 'dev-creator-v-000000000001';
const RECIPIENT_KEY = 'dev-recipient-v-0000000001';

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

async function setup() {
  await resetMemoryRepo();
  const created = await creatorReq('/v1/jobs', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Two chairs', categoryKey: 'carpenter', creatorName: 'Ada', initialNotes: 'Oak wood' }),
  });
  const c = (await created.json()) as { job: { id: string }; invite: { token: string }; creatorParticipantId: string };
  const claimed = await recipientReq(`/v1/invites/${c.invite.token}/claim`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ displayName: 'Bisi' }),
  });
  const { participantId } = (await claimed.json()) as { participantId: string };
  return { token: c.invite.token, jobId: c.job.id, participantId, creatorId: c.creatorParticipantId };
}

describe('versions (ADR-106: append-only, acks reset)', () => {
  beforeEach(async () => { await resetMemoryRepo(); });

  it('publishing a new version supersedes the old and resets state to ready_for_review', async () => {
    const { jobId, creatorId } = await setup();
    const res = await creatorReq(`/v1/jobs/${jobId}/versions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-participant-id': creatorId },
      body: JSON.stringify({ reason: 'Switched to mahogany after talking', expectedVersion: 1, fields: [{ key: 'material', label: 'Wood', value: 'Mahogany' }] }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      job: { status: string; currentVersionId: string };
      version: { number: number; fields: { value: string }[] };
      versions: { number: number; status: string }[];
    };
    expect(body.version.number).toBe(2);
    expect(body.job.status).toBe('ready_for_review');
    expect(body.versions).toHaveLength(2);
    const v1 = body.versions.find((v) => v.number === 1)!;
    expect(v1.status).toBe('superseded');
  });

  it('requires a valid participant id', async () => {
    const { jobId } = await setup();
    const res = await creatorReq(`/v1/jobs/${jobId}/versions`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: 'x', fields: [{ key: 'x', label: 'x', value: 'y' }] }),
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects empty field list', async () => {
    const { jobId, creatorId } = await setup();
    const res = await creatorReq(`/v1/jobs/${jobId}/versions`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-participant-id': creatorId },
      body: JSON.stringify({ reason: 't', fields: [] }),
    });
    expect(res.status).toBe(400);
  });

  it('requires a change reason (T-W3-03)', async () => {
    const { jobId, creatorId } = await setup();
    const res = await creatorReq(`/v1/jobs/${jobId}/versions`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-participant-id': creatorId },
      body: JSON.stringify({ fields: [{ key: 'x', label: 'x', value: 'y' }] }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects change requests without a comment (T-W3-03)', async () => {
    const { token, participantId } = await setup();
    const res = await recipientReq(`/v1/invites/${token}/changes`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ participantId, kind: 'change', comment: '?' }),
    });
    // The comment '?' is too short / invalid; expect 400.
    expect(res.status).toBe(400);
  });

  it('returns 409 VERSION_CONFLICT when expectedVersion is stale (T-W3-04)', async () => {
    const { jobId, creatorId } = await setup();
    await creatorReq(`/v1/jobs/${jobId}/versions`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-participant-id': creatorId },
      body: JSON.stringify({ reason: 'First edit', expectedVersion: 1, fields: [{ key: 'x', label: 'x', value: 'y' }] }),
    });
    const res = await creatorReq(`/v1/jobs/${jobId}/versions`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-participant-id': creatorId },
      body: JSON.stringify({ reason: 'Stale edit', expectedVersion: 1, fields: [{ key: 'x', label: 'x', value: 'z' }] }),
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VERSION_CONFLICT');
  });
});
