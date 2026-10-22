import { describe, expect, it, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { DomainError, ErrorCode } from '@nwa/domain';
import { rateLimit, __resetBuckets } from '../rateLimit.js';

function withError(app: Hono) {
  app.onError((err, c) => {
    if (err instanceof DomainError) {
      const status = err.code === ErrorCode.RATE_LIMITED ? 429 : 400;
      return c.json({ error: { code: err.code, message: err.message, requestId: c.get('requestId') ?? 't', retryable: err.retryable } }, status);
    }
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'err', requestId: 't', retryable: false } }, 500);
  });
  return app;
}

describe('rateLimit middleware', () => {
  beforeEach(() => __resetBuckets());

  it('allows requests under the limit and sets headers', async () => {
    const app = withError(new Hono());
    app.use('*', rateLimit(3, 60_000));
    app.get('/', (c) => c.json({ ok: true }));
    const res = await app.request('/');
    expect(res.status).toBe(200);
    expect(res.headers.get('x-ratelimit-limit')).toBe('3');
    expect(res.headers.get('x-ratelimit-remaining')).toBe('2');
  });

  it('returns 429 RATE_LIMITED after the bucket is exhausted', async () => {
    const app = withError(new Hono());
    app.use('*', rateLimit(2, 60_000));
    app.get('/', (c) => c.json({ ok: true }));
    await app.request('/');
    await app.request('/');
    const res = await app.request('/');
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: { code: string; retryable: boolean } };
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(body.error.retryable).toBe(true);
  });
});
