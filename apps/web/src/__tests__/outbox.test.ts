import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage before importing outbox
const store = new Map<string, string>();
class InMemoryStorage implements Storage {
  get length() { return store.size; }
  clear() { store.clear(); }
  getItem(k: string) { return store.get(k) ?? null; }
  key(i: number) { return Array.from(store.keys())[i] ?? null; }
  removeItem(k: string) { store.delete(k); }
  setItem(k: string, v: string) { store.set(k, v); }
}
const storage = new InMemoryStorage();
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
Object.defineProperty(globalThis.navigator, 'onLine', { writable: true, value: true, configurable: true });

const fetchMock = vi.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

const listeners: Record<string, ((e: Event) => void)[]> = {};
globalThis.addEventListener = vi.fn((t: string, fn: EventListenerOrEventListenerObject) => {
  listeners[t] = listeners[t] || [];
  listeners[t].push(fn as (e: Event) => void);
}) as unknown as typeof window.addEventListener;
globalThis.removeEventListener = vi.fn((t: string, fn: EventListenerOrEventListenerObject) => {
  listeners[t] = (listeners[t] || []).filter((f) => f !== fn);
}) as unknown as typeof window.removeEventListener;

import { enqueue, flush, queueCount, subscribe } from '../lib/outbox';
import { smartFetch } from '../lib/use-outbox';

describe('outbox', () => {
  beforeEach(() => {
    storage.clear();
    fetchMock.mockReset();
    setOnline(true);
  });

  function setOnline(v: boolean) { (navigator as unknown as Record<string, unknown>).onLine = v; }

  it('enqueue stores pending work and increments count', async () => {
    await enqueue({ method: 'POST', url: '/api/proxy/v1/jobs', body: { title: 'X' } });
    expect(queueCount()).toBe(1);
    expect(storage.getItem('nwa.outbox.v1')).toContain('/v1/jobs');
  });

  it('flush skips when offline (drain returns early)', async () => {
    setOnline(false);
    await enqueue({ method: 'POST', url: '/u', body: {} });
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(queueCount()).toBe(1);
  });

  it('flush drains successful requests with idempotency key', async () => {
    setOnline(true);
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) } as Response);
    await enqueue({ method: 'POST', url: '/v1/jobs', body: { title: 'Test' } });
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/v1/jobs');
    const h = init.headers as Record<string, string>;
    expect(h['idempotency-key']).toBeTruthy();
    expect(queueCount()).toBe(0);
  });

  it('smartFetch queues offline POST and returns sentinel 202', async () => {
    setOnline(false);
    const res = await smartFetch('/v1/jobs', { method: 'POST', body: '{}', offlineQueueable: true });
    expect(res.status).toBe(202);
    const j = await res.json() as { queued?: boolean };
    expect(j.queued).toBe(true);
    expect(queueCount()).toBe(1);
  });

  it('smartFetch does not queue GET requests', async () => {
    setOnline(false);
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) } as Response);
    await smartFetch('/v1/ready');
    expect(fetchMock).toHaveBeenCalled();
    expect(queueCount()).toBe(0);
  });

  it('drops after 4xx and notifies subscribers', async () => {
    setOnline(true);
    fetchMock.mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: { code: 'BAD' } }) } as Response);
    let seen: unknown;
    subscribe((items) => { seen = items; });
    await enqueue({ method: 'POST', url: '/v1/jobs', body: { title: 'bad' } });
    await flush();
    // The bad one should be dropped (remaining = 0).
    expect(queueCount()).toBe(0);
    expect(seen).toEqual([]);
  });

  it('requeues on 5xx/network failure and retries', async () => {
    setOnline(true);
    // First call: network throw; second: success.
    fetchMock
      .mockRejectedValueOnce(new Error('net down'))
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) } as Response);
    await enqueue({ method: 'POST', url: '/v1/jobs', body: { title: 'X' } });
    await flush();
    expect(queueCount()).toBe(1); // requeued after failure
    await flush();
    expect(queueCount()).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
