import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="container" style={{ padding: 'var(--space-8) var(--space-4)', textAlign: 'center' }}>
      <p className="eyebrow" style={{ color: 'var(--color-clay)', marginBottom: 'var(--space-3)' }}>404</p>
      <h1 className="display-title" style={{ marginBottom: 'var(--space-3)' }}>
        We couldn&apos;t find that.
      </h1>
      <p className="lead" style={{ maxWidth: 480, margin: '0 auto var(--space-6)' }}>
        The link may have a typo, been reset, or expired (invites last 14 days). Ask the sender for a fresh link, or start your own plan.
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/new" className="btn btn-primary">Start a plan</Link>
        <Link href="/" className="btn btn-ghost">Go home</Link>
      </div>
    </main>
  );
}
