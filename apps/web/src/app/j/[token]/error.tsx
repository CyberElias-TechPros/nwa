'use client';

import Link from 'next/link';

/**
 * Per-segment error boundary for /j/[token] so an error on one invite page
 * doesn't blank the whole app. Also gives us a place to explain likely
 * causes (token typo, expired invite) without blaming the server.
 */
export default function InviteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main>
      <h1>We couldn't open that invite.</h1>
      <p>
        The link may have expired, been cancelled, or had a typo. Ask the person who sent it to share it again. If you
        just restarted the prototype, in-memory plans from the previous run were cleared — create a fresh plan from the
        home page.
      </p>
      <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn" onClick={() => reset()}>Try again</button>
        <Link className="btn" style={{ background: '#475569', textDecoration: 'none', display: 'inline-block' }} href="/new">Start a new plan</Link>
        <Link className="btn" style={{ background: '#64748b', textDecoration: 'none', display: 'inline-block' }} href="/">Go home</Link>
      </p>
    </main>
  );
}
