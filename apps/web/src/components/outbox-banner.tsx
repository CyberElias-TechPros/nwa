'use client';

import Link from 'next/link';
import { useOutbox, useOnline } from '../lib/use-outbox';

export function OutboxBanner() {
  const items = useOutbox();
  const online = useOnline();
  if (online && items.length === 0) return null;
  if (!online) {
    return (
      <div role="status" className="offline-banner" style={{ background: 'var(--nwa-color-goldSoft, #fdf3dd)', borderBottom: '1px solid var(--nwa-color-gold, #c2410c)' }}>
        <span>You&apos;re offline. Your taps are saved and will send when you&apos;re back.</span>
        <Link href="/offline" className="btn sm" style={{ marginLeft: 'auto', background: 'var(--nwa-color-ink, #1a1a1a)', color: '#fff' }}>Learn more</Link>
      </div>
    );
  }
  return (
    <div role="status" className="offline-banner" style={{ background: 'var(--nwa-color-teal-soft, #e6f5f1)', borderBottom: '1px solid var(--nwa-color-teal, #0f766e)' }}>
      <span>Sending {items.length} saved {items.length === 1 ? 'response' : 'responses'}…</span>
    </div>
  );
}
