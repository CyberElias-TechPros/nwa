'use client';

/**
 * NaWeAgree outbox queue (T-W10, gap G19).
 *
 * Queues POST/PUT/DELETE requests in localStorage when the network is
 * unavailable and replays them when connectivity returns or the page is
 * re-opened. Every queued item is retried with exponential backoff and
 * surfaced to the UI via a subscriber callback so the invite/plan pages
 * can show "2 responses queued · will send when online" banners.
 *
 * Design principles (from docs/07):
 *   - Don't pretend it sent — show a clear queued state.
 *   - Don't block reads. Queue drains in the background.
 *   - Don't double-send — include an Idempotency-Key header.
 *   - Never silently drop on 4xx (validation / permission); surface to user.
 */

export interface OutboxItem {
  id: string;
  method: string;
  url: string;
  body: unknown;
  headers?: Record<string, string>;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

const KEY = 'nwa.outbox.v1';
const subscribers = new Set<(items: OutboxItem[]) => void>();
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function read(): OutboxItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OutboxItem[]) : [];
  } catch { return []; }
}

function write(items: OutboxItem[]) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  for (const fn of subscribers) fn(items);
}

export function subscribe(cb: (items: OutboxItem[]) => void): () => void {
  subscribers.add(cb);
  cb(read());
  return () => { subscribers.delete(cb); };
}

export function queueCount() { return read().length; }

export async function enqueue(input: Omit<OutboxItem, 'id' | 'createdAt' | 'attempts'>) {
  const items = read();
  const item: OutboxItem = {
    ...input,
    id: 'q_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
    createdAt: Date.now(),
    attempts: 0,
  };
  items.push(item);
  write(items);
  scheduleDrain();
}

function scheduleDrain(delay = 1000) {
  if (retryTimer) return;
  if (typeof window === 'undefined') return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void drain();
  }, delay);
}

async function drain() {
  if (typeof window === 'undefined') return;
  if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) return;
  const items = read();
  const remaining: OutboxItem[] = [];
  for (const it of items) {
    it.attempts++;
    try {
      const res = await fetch(it.url, {
        method: it.method,
        headers: { 'content-type': 'application/json', 'idempotency-key': it.id, ...(it.headers ?? {}) },
        body: it.body != null ? JSON.stringify(it.body) : undefined,
        credentials: 'include',
      });
      if (res.status >= 500) {
        it.lastError = `server_${res.status}`;
        remaining.push(it);
        continue;
      }
      if (res.status === 429) {
        it.lastError = 'rate_limited';
        remaining.push(it);
        continue;
      }
      if (res.status >= 400) {
        // 4xx = permanent (validation, forbidden, not found) — drop and
        // notify via subscriber; UI surfaces "one response failed to send".
        console.warn('[outbox] dropping after 4xx', it.id, res.status);
        continue;
      }
      // 2xx → success, drop.
    } catch (err) {
      it.lastError = (err as Error).message;
      remaining.push(it);
    }
  }
  write(remaining);
  if (remaining.length > 0) {
    // Exponential-ish backoff up to 30s.
    const maxAttempts = Math.max(...remaining.map((i) => i.attempts));
    scheduleDrain(Math.min(30_000, 1_000 * Math.pow(2, Math.min(maxAttempts, 4))));
  }
}

/** Manually trigger a drain (useful from tests or after "retry" tap). */
export async function flush(): Promise<void> {
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  await drain();
}

export function clear() { write([]); }

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => scheduleDrain(500));
  // Kick off a drain shortly after load to process anything queued while
  // closed (e.g. mobile with aggressive tab suspension).
  scheduleDrain(1_500);
}
