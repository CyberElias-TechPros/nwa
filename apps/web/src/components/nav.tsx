import Link from 'next/link';

export function Nav() {
  return (
    <nav className="topnav">
      <div className="nav-inner">
        <Link href="/" className="brand" aria-label="NaWeAgree home">
          <span className="mark" aria-hidden>🤝</span>
          <span>NaWeAgree</span>
        </Link>
        <div className="links">
          <Link href="/how">How it works</Link>
          <Link href="/about">About</Link>
          <Link href="/plans">My plans</Link>
          <Link href="/new" className="btn sm">Start a plan</Link>
        </div>
      </div>
    </nav>
  );
}
