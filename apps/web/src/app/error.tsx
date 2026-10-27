'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[nwa error boundary]', error);
  }, [error]);
  return (
    <main className="container" style={{ padding: 'var(--space-8) var(--space-4)', textAlign: 'center' }}>
      <p className="eyebrow" style={{ color: 'var(--color-clay)', marginBottom: 'var(--space-3)' }}>Something went wrong</p>
      <h1 className="display-title" style={{ marginBottom: 'var(--space-3)' }}>We hit a snag.</h1>
      <p className="lead" style={{ maxWidth: 520, margin: '0 auto var(--space-6)' }}>
        An unexpected problem came up. We logged it automatically. Reloading usually fixes it — if it keeps happening, tell us so we can patch it.
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary" onClick={() => reset()}>Try again</button>
        <Link href="/" className="btn btn-ghost">Go home</Link>
        <Link href="/safety" className="btn btn-ghost">Report a problem</Link>
      </div>
      {error.digest ? (
        <p className="muted" style={{ marginTop: 'var(--space-6)', fontSize: 13 }}>Error code: <code>{error.digest}</code></p>
      ) : null}
    </main>
  );
}
