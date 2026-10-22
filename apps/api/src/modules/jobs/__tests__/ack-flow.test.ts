import { describe, expect, it, beforeEach } from 'vitest';
import app from '../../../index.js';
import { resetMemoryRepo } from '../../../db/factory.js';

const CREATOR_KEY = 'dev-creator-a-000000000001';
const RECIPIENT_KEY = 'dev-recipient-a-0000000001';

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

async function createAndClaim(overrides: Record<string, unknown> = {}) {
  const created = await creatorReq('/v1/jobs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Make two chairs', categoryKey: 'carpenter', creatorName: 'Ada', ...overrides }),
  });
  const c = (await created.json()) as { job: { id: string }; invite: { token: string }; creatorParticipantId: string };
  const claimed = await recipientReq(`/v1/invites/${c.invite.token}/claim`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ displayName: 'Chidi' }),
  });
  const claimBody = (await claimed.json()) as { participantId: string };
  return { token: c.invite.token, jobId: c.job.id, participantId: claimBody.participantId, creatorId: c.creatorParticipantId };
}

describe('ack + change flow', () => {
  beforeEach(async () => { await resetMemoryRepo(); });

  it('claim adds the recipient as a participant and marks the job ready_for_review', async () => {
    const { token } = await createAndClaim();
    const res = await recipientReq(`/v1/invites/${token}`);
    const body = (await res.json()) as { job: { status: string; participants: { displayName: string }[] }; invite: { claimed: boolean; participantName: string | null } };
    expect(body.invite.claimed).toBe(true);
    expect(body.invite.participantName).toBe('Chidi');
    expect(body.job.status).toBe('ready_for_review');
    expect(body.job.participants).toHaveLength(2);
  });

  it('recipient + creator both acknowledging sets status to mutually_acknowledged', async () => {
    const { token, participantId, creatorId } = await createAndClaim();
    // Recipient agrees:
    let res = await recipientReq(`/v1/invites/${token}/ack`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ participantId, action: 'reviewed' }),
    });
    let body = (await res.json()) as { status: string };
    expect(body.status).toBe('partially_acknowledged');

    // Creator also agrees:
    res = await creatorReq(`/v1/invites/${token}/ack`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ participantId: creatorId, action: 'reviewed' }),
    });
    body = (await res.json()) as { status: string };
    expect(body.status).toBe('mutually_acknowledged');
  });

  it('recipient can post a question, status becomes clarification_needed', async () => {
    const { token, participantId } = await createAndClaim();
    const res = await recipientReq(`/v1/invites/${token}/changes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ participantId, kind: 'question', comment: 'Which wood again?' }),
    });
    expect(res.status).toBe(201);
    const preview = (await (await recipientReq(`/v1/invites/${token}`)).json()) as {
      job: { status: string; openQuestionCount: number };
      changes: { comment: string }[];
    };
    expect(preview.job.openQuestionCount).toBe(1);
    expect(preview.changes[0]?.comment).toBe('Which wood again?');
    expect(preview.job.status).toBe('clarification_needed');
  });

  it('empty comment is rejected with VALIDATION_FAILED', async () => {
    const { token, participantId } = await createAndClaim();
    const res = await recipientReq(`/v1/invites/${token}/changes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ participantId, kind: 'change', comment: '  ' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_FAILED');
  });

  it('claiming an already-claimed invite from a different device returns FORBIDDEN', async () => {
    const { token } = await createAndClaim();
    // Third device tries to claim the same invite → already claimed.
    const third = await app.request(`/v1/invites/${token}/claim`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-device-key': 'dev-eve-0000000000000009' },
      body: JSON.stringify({ displayName: 'Eve' }),
    });
    expect(third.status).toBe(403);
    const body = (await third.json()) as { error: { code: string } };
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('unknown invite returns NOT_FOUND_OR_NOT_VISIBLE', async () => {
    const res = await app.request('/v1/invites/token_does_not_exist');
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('NOT_FOUND_OR_NOT_VISIBLE');
  });
});
