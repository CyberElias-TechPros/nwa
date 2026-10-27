import { describe, expect, it } from 'vitest';
import app from '../../../index.js';
import { resetMemoryRepo } from '../../../db/factory.js';

describe('privacy (NDPR/GDPR)', () => {
  it('creates export request and returns ready payload', async () => {
    await resetMemoryRepo();
    // Create a job on this device first.
    await app.request('/v1/jobs', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-device-key': 'd-export' },
      body: JSON.stringify({ title: 'Plumber fix', categoryKey: 'other', creatorName: 'Z', initialNotes: 'tap' }),
    });
    const r = await app.request('/v1/privacy/requests', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-device-key': 'd-export' },
      body: JSON.stringify({ kind: 'export' }),
    });
    expect(r.status).toBe(201);
    const b = (await r.json()) as { request: { id: string; status: string; kind: string } };
    expect(b.request.kind).toBe('export');
    expect(['ready', 'pending']).toContain(b.request.status);

    const list = await app.request('/v1/privacy/requests', { headers: { 'x-device-key': 'd-export' } });
    const lb = (await list.json()) as { requests: { id: string }[] };
    expect(lb.requests.length).toBeGreaterThanOrEqual(1);

    const dl = await app.request(`/v1/privacy/requests/${b.request.id}`, { headers: { 'x-device-key': 'd-export' } });
    expect(dl.status).toBe(200);
  });

  it('creates delete request and marks completed (anonymises)', async () => {
    await resetMemoryRepo();
    await app.request('/v1/jobs', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-device-key': 'd-del' },
      body: JSON.stringify({ title: 'Hair', categoryKey: 'hair', creatorName: 'Z', initialNotes: '' }),
    });
    const r = await app.request('/v1/privacy/requests', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-device-key': 'd-del' },
      body: JSON.stringify({ kind: 'delete' }),
    });
    expect(r.status).toBe(201);
    const b = (await r.json()) as { request: { status: string } };
    expect(b.request.status).toBe('completed');
  });
});
