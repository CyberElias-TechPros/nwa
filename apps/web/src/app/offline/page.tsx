import Link from 'next/link';

export default function OfflinePage() {
  return (
    <main style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)' }}>
      <p className="eyebrow">Offline</p>
      <h1 className="display-title" style={{ marginBottom: 'var(--space-3)' }}>You&apos;re offline</h1>
      <p className="lead" style={{ maxWidth: 520, margin: '0 auto var(--space-6)' }}>
        NaWeAgree needs a connection to load new plans or send your responses. Anything you&apos;ve already opened stays visible, and taps you made while offline are queued — they send the moment you&apos;re back.
      </p>
      <div className="card soft" style={{ maxWidth: 480, margin: '0 auto var(--space-6)', textAlign: 'left' }}>
        <h3 style={{ marginBottom: 6 }}>What works offline</h3>
        <ul style={{ margin: 0 }}>
          <li>Reading plans you opened before losing signal.</li>
          <li>Drafting a response — it sits in your outbox.</li>
          <li>Starting a new plan (sends when you&apos;re back).</li>
        </ul>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/plans" className="btn btn-primary">Open my plans</Link>
        <Link href="/" className="btn btn-ghost">Go home</Link>
      </div>
    </main>
  );
}
