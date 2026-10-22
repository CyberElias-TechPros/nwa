import Link from 'next/link';

export function Nav() {
  return (
    <nav style={{ borderBottom: '1px solid var(--nwa-color-border)', background: 'var(--nwa-color-surface)' }}>
      <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '10px var(--nwa-space-6)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/" style={{ fontWeight: 700, color: 'var(--nwa-color-text)', textDecoration: 'none', fontSize: 17 }}>
          NaWeAgree
        </Link>
        <div style={{ flex: 1 }} />
        <Link href="/new" style={{ color: 'var(--nwa-color-text-muted)', textDecoration: 'none', fontSize: 14 }}>New plan</Link>
        <Link href="/plans" style={{ color: 'var(--nwa-color-text-muted)', textDecoration: 'none', fontSize: 14 }}>My plans</Link>
      </div>
    </nav>
  );
}
