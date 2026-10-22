'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * App-level error boundary. Shown when a Server Component throws on render
 * or a client component throws during render/event handling. The Next.js
 * default is a blank "Application error: a server-side exception has
 * occurred" — this is our friendlier version that also resets on retry.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[nwa error boundary]', error);
  }, [error]);
  return (
    <main style={{ padding: 32, maxWidth: 560, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Something went wrong.</h1>
      <p style={{ color: '#475569' }}>
        We hit an unexpected problem. The error has been logged. Try reloading — most issues are a temporary glitch.
      </p>
      <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          className="btn"
          onClick={() => reset()}
          style={{ background: '#155eef', color: '#fff', border: 0, padding: '10px 18px', borderRadius: 10, cursor: 'pointer', fontSize: 15 }}
        >
          Try again
        </button>
        <Link href="/" style={{ padding: '10px 18px', borderRadius: 10, background: '#e2e8f0', color: '#0f172a', textDecoration: 'none' }}>Go home</Link>
      </p>
      {error.digest ? (
        <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 24 }}>Error code: {error.digest}</p>
      ) : null}
    </main>
  );
}
