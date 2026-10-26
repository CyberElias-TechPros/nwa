import { describe, expect, it } from 'vitest';
import app from '../index.js';

describe('health endpoints', () => {
  it('GET /v1/health returns ok', async () => {
    const res = await app.request('/v1/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; service: string };
    expect(body).toMatchObject({ status: 'ok', service: 'nwa-api' });
  });

  it('GET /v1/ready returns ready', async () => {
    const res = await app.request('/v1/ready');
    expect(res.status).toBe(200);
  });

  it('unknown path returns NOT_FOUND_OR_NOT_VISIBLE with requestId', async () => {
    const res = await app.request('/v1/nope');
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string; requestId: string } };
    expect(body.error.code).toBe('NOT_FOUND_OR_NOT_VISIBLE');
    expect(body.error.requestId).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
  });
});
