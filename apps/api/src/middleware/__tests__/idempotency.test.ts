import { describe, expect, it, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { idempotency, __resetIdempotency } from '../idempotency.js';

describe('idempotency middleware', () => {
  beforeEach(() => __resetIdempotency());

  it('replays a cached response for the same key + URL', async () => {
    const app = new Hono();
    let calls = 0;
    app.use('*', idempotency);
    app.post('/x', async (c) => {
      calls++;
      return c.json({ n: calls });
    });
    const h = { 'content-type': 'application/json', 'idempotency-key': 'k1' };
    const a = await app.request('/x', { method: 'POST', headers: h });
    const b = await app.request('/x', { method: 'POST', headers: h });
    expect(await a.json()).toEqual({ n: 1 });
    expect(await b.json()).toEqual({ n: 1 });
    expect(b.headers.get('idempotency-replay')).toBe('true');
    expect(calls).toBe(1);
  });

  it('does not interfere when there is no key', async () => {
    const app = new Hono();
    let calls = 0;
    app.use('*', idempotency);
    app.post('/x', async (c) => { calls++; return c.json({ n: calls }); });
    await app.request('/x', { method: 'POST', headers: { 'content-type': 'application/json' } });
    await app.request('/x', { method: 'POST', headers: { 'content-type': 'application/json' } });
    expect(calls).toBe(2);
  });
});
