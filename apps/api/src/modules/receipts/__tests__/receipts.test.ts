import { describe, expect, it } from 'vitest';
import app from '../../../index.js';
import { resetMemoryRepo } from '../../../db/factory.js';
import { signReceipt, verifyReceipt, DEV_RECEIPT_SECRET, canonicalStringify } from '../signing.js';

async function makeMutualPlan(): Promise<{ jobId: string; creatorCookie: string }> {
  const createRes = await app.request('/v1/jobs', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Tiles', categoryKey: 'builder', creatorName: 'A', initialNotes: '' }),
  });
  const create = (await createRes.json()) as { job: { id: string }; invite: { token: string }; creatorParticipantId: string };
  const creatorCookie = createRes.headers.get('set-cookie') ?? '';

  await app.request(`/v1/invites/${create.invite.token}/claim`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-device-key': 'd-recip' },
    body: JSON.stringify({ displayName: 'B' }),
  });
  const invite = (await (await app.request(`/v1/invites/${create.invite.token}`, { headers: { 'x-device-key': 'd-recip' } })).json()) as { myParticipantId: string };

  await app.request(`/v1/invites/${create.invite.token}/ack`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie: creatorCookie, 'x-participant-id': create.creatorParticipantId },
    body: JSON.stringify({ participantId: create.creatorParticipantId, action: 'reviewed' }),
  });
  await app.request(`/v1/invites/${create.invite.token}/ack`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-device-key': 'd-recip', 'x-participant-id': invite.myParticipantId ?? '' },
    body: JSON.stringify({ participantId: invite.myParticipantId, action: 'reviewed' }),
  });
  return { jobId: create.job.id, creatorCookie };
}

describe('receipt signing primitives', () => {
  it('canonical form is stable', () => {
    const a = canonicalStringify({ b: 1, a: 2, c: { z: 0, a: 9 } });
    const b = canonicalStringify({ c: { a: 9, z: 0 }, b: 1, a: 2 });
    expect(a).toBe(b);
  });

  it('sign + verify round-trips and detects tampering', async () => {
    const payload = { schema: 'nwa.receipt/v1' as const, jobId: 'j1', jobTitle: 't', categoryKey: 'c',
      versionNumber: 1, versionReason: null, fields: [], acknowledgedBy: [], mutualAt: '2026-01-01T00:00:00Z',
      product: { name: 'NaWeAgree', url: 'https://naweagree.app' } };
    const signed = await signReceipt(payload, undefined);
    expect(signed.sig.alg).toBe('HS256');
    expect(signed.sig.dev).toBe(true);
    const v = await verifyReceipt(signed, DEV_RECEIPT_SECRET);
    expect(v.ok).toBe(true);
    const tampered = { ...signed, jobTitle: 'tampered' };
    const v2 = await verifyReceipt(tampered, DEV_RECEIPT_SECRET);
    expect(v2.ok).toBe(false);
    expect(v2.reason).toBe('bad_signature');
  });
});

describe('receipt API', () => {
  it('refuses receipt before mutual ack', async () => {
    await resetMemoryRepo();
    const createRes = await app.request('/v1/jobs', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Hair', categoryKey: 'hair', creatorName: 'A', initialNotes: '' }),
    });
    const create = (await createRes.json()) as { job: { id: string } };
    const cookie = createRes.headers.get('set-cookie') ?? '';
    const res = await app.request(`/v1/jobs/${create.job.id}/receipt`, { headers: { cookie } });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('STATE_TRANSITION_INVALID');
  });

  it('returns signed receipt after mutual ack, and /verify round-trips; txt format works', async () => {
    await resetMemoryRepo();
    const { jobId, creatorCookie } = await makeMutualPlan();

    const receipt = await app.request(`/v1/jobs/${jobId}/receipt`, { headers: { cookie: creatorCookie } });
    expect(receipt.status).toBe(200);
    const r = (await receipt.json()) as { sig: { value: string; alg: string; dev: boolean }; jobTitle: string; versionNumber: number };
    expect(r.sig.alg).toBe('HS256');
    expect(r.sig.dev).toBe(true);
    expect(r.jobTitle).toBe('Tiles');
    expect(r.versionNumber).toBe(1);

    const v = await app.request('/v1/receipts/verify', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(r),
    });
    expect(v.status).toBe(200);
    const vb = (await v.json()) as { ok: boolean };
    expect(vb.ok).toBe(true);

    const txt = await app.request(`/v1/jobs/${jobId}/receipt.txt`, { headers: { cookie: creatorCookie } });
    expect(txt.status).toBe(200);
    expect(txt.headers.get('content-type')).toMatch(/text\/plain/);
    const tb = await txt.text();
    expect(tb).toContain('NAWEAGREE — SHARED RECORD');
    expect(tb).toContain('Tiles');
    expect(tb).toContain('Signature');
  });

  it('blocks non-participants from downloading a receipt', async () => {
    await resetMemoryRepo();
    const { jobId } = await makeMutualPlan();
    const r = await app.request(`/v1/jobs/${jobId}/receipt`, { headers: { 'x-device-key': 'stranger-device' } });
    expect(r.status).toBe(403);
  });
});
