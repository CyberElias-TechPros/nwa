import Link from 'next/link';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="foot-inner">
        <div>
          <h4>NaWeAgree</h4>
          <p className="muted" style={{ fontSize: 14, maxWidth: 320 }}>
            Shared plans for work you agree on. Built for Nigeria, usable anywhere. Silence is not consent.
          </p>
        </div>
        <div>
          <h4>Product</h4>
          <ul>
            <li><Link href="/new">Start a plan</Link></li>
            <li><Link href="/plans">My plans</Link></li>
            <li><Link href="/how">How it works</Link></li>
            <li><Link href="/offline">Offline</Link></li>
          </ul>
        </div>
        <div>
          <h4>Company</h4>
          <ul>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/principles">Our principles</Link></li>
            <li><a href="mailto:hello@naweagree.app">Contact</a></li>
          </ul>
        </div>
        <div>
          <h4>Fine print</h4>
          <ul>
            <li><Link href="/privacy">Privacy</Link></li>
            <li><Link href="/terms">Terms</Link></li>
            <li><Link href="/safety">Safety & trust</Link></li>
          </ul>
        </div>
      </div>
      <div className="container" style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <small className="muted">© {year} NaWeAgree. Made with care in Lagos.</small>
        <small className="muted">No accounts · No tracking · 100% you-in-control</small>
      </div>
    </footer>
  );
}
