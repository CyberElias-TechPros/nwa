'use client';

import { useEffect, useState } from 'react';
import { subscribe, enqueue, type OutboxItem } from './outbox';

export function useOutbox() {
  const [items, setItems] = useState<OutboxItem[]>([]);
  useEffect(() => subscribe(setItems), []);
  return items;
}

export function useOnline() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

/**
 * Wrapped fetch that routes non-GET requests through the outbox when offline.
 * Resolves to the Response when online, or to a synthetic 202 "queued" Response
 * when offline so the caller can show a queued banner.
 */
export async function smartFetch(input: RequestInfo, init: RequestInit & { offlineQueueable?: boolean } = {}): Promise<Response> {
  const url = typeof input === 'string' ? input : (input as Request).url;
  const method = (init.method ?? 'GET').toUpperCase();
  const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
  if (method === 'GET' || isOnline || !init.offlineQueueable) {
    return fetch(input, init);
  }
  let body: unknown = undefined;
  if (init.body && typeof init.body === 'string') {
    try { body = JSON.parse(init.body); } catch { body = init.body; }
  }
  const headersObj: Record<string, string> = {};
  if (init.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((v, k) => { headersObj[k] = v; });
    } else if (Array.isArray(init.headers)) {
      for (const [k, v] of init.headers) headersObj[k] = v;
    } else {
      const h = init.headers as Record<string, string>;
      for (const k of Object.keys(h)) headersObj[k] = h[k] ?? '';
    }
  }
  await enqueue({ method, url, body, headers: headersObj });
  return new Response(JSON.stringify({ queued: true }), { status: 202, headers: { 'content-type': 'application/json' } });
}

export function useQueueCount(): number {
  const items = useOutbox();
  return items.length;
}
