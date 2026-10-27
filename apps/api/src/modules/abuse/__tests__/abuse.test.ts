import { describe, expect, it } from 'vitest';
import app from '../../../index.js';
import { resetMemoryRepo } from '../../../db/factory.js';

describe('abuse reporting', () => {
  it('rejects too-short description', async () => {
    await resetMemoryRepo();
    const r = await app.request('/v1/abuse/report', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: 'scam', description: 'x' }),
    });
    expect(r.status).toBe(400);
    const b = (await r.json()) as { error: { code: string } };
    expect(b.error.code).toBe('VALIDATION_FAILED');
  });

  it('accepts a valid report', async () => {
    await resetMemoryRepo();
    const r = await app.request('/v1/abuse/report', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: 'scam', description: 'Someone is impersonating a tailor.', jobId: 'job_xyz' }),
    });
    expect(r.status).toBe(201);
    const b = (await r.json()) as { id: string; status: string; message: string };
    expect(b.status).toBe('received');
    expect(b.id).toMatch(/^abuse_/);
  });
});
