import Link from 'next/link';

export const metadata = { title: 'Our principles' };

export default function PrinciplesPage() {
  const principles = [
    {
      title: 'Silence is never consent',
      body: 'We will never mark something "agreed" because the other person didn\'t tap a button. Inaction means the plan is waiting. Always.',
    },
    {
      title: 'No AI speaks for you',
      body: 'We won\'t auto-summarise what you said or guess your intent. Your words are your words. History is what was written, not what a model thought was written.',
    },
    {
      title: 'Versions never disappear',
      body: 'When something changes, it creates a new version. The old one stays. You can always point at what was there before.',
    },
    {
      title: 'Work on bad networks',
      body: 'The page must load on a Glo 2G connection in Oshodi during rain. Every kB we add is a kB we justify.',
    },
    {
      title: 'No surprise pressure',
      body: 'Reminders are gentle. They never say "you must respond by X" or treat delay as rejection. People are busy. We trust them to respond when they can.',
    },
    {
      title: 'You can leave',
      body: 'You can delete any plan you are part of, any time. You can stop a plan that is going badly. There is no lock-in because there is no account to lock you in.',
    },
    {
      title: 'No ratings, no shaming',
      body: 'We will never have a star system. People make mistakes, prices change, life happens. Public ratings turn honest disagreements into reputational weapons.',
    },
    {
      title: 'Built by people who use it',
      body: 'If we wouldn\'t send a NaWeAgree link to our own tailor or carpenter, we don\'t ship it.',
    },
  ];
  return (
    <main>
      <h1>Our principles</h1>
      <p className="muted">These are not slogans. They are the rules we use to decide what to build, what not to build, and how to behave when the hard calls come.</p>

      <div className="features" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        {principles.map((p, i) => (
          <div key={i} className={`feature ${i % 3 === 1 ? 'teal' : i % 3 === 2 ? 'gold' : ''}`}>
            <h3>{p.title}</h3>
            <p>{p.body}</p>
          </div>
        ))}
      </div>

      <div className="card soft" style={{ marginTop: 32 }}>
        <p style={{ margin: 0 }}>
          If we ever break one of these, please tell us: <a href="mailto:principles@naweagree.app">principles@naweagree.app</a>. We take it seriously.
        </p>
      </div>

      <p className="footer-note">
        <Link href="/new">Start a plan</Link> · <Link href="/about">About</Link> · <Link href="/how">How it works</Link>
      </p>
    </main>
  );
}
