import Link from 'next/link';
import en from '@nwa/i18n/locales/en-NG.json';
import pcm from '@nwa/i18n/locales/pcm.json';

type Health = { ok: true; status: string; time: string } | { ok: false };

async function getApiHealth(): Promise<Health> {
  try {
    const apiUrl = process.env.NWA_API_URL ?? 'http://127.0.0.1:8787';
    const res = await fetch(`${apiUrl}/v1/health`, { cache: 'no-store' });
    if (!res.ok) return { ok: false };
    const j = (await res.json()) as { status: string; time: string };
    return { ok: true, ...j };
  } catch {
    return { ok: false };
  }
}

export default async function HomePage() {
  const health = await getApiHealth();
  return (
    <main>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 28, margin: '0 0 8px' }}>{en['app.name']}</h1>
        <span className="badge" style={{ background: health.ok ? '#0f766e' : '#b45309' }}>
          {health.ok ? 'online' : 'offline'}
        </span>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>{en['app.tagline']}.</p>

      <div className="honesty">
        <strong>Prototype.</strong> {en['legal.notContract']} Plans are stored in server memory right now — they disappear when the demo restarts.
      </div>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>What it does</h2>
        <p>
          Turns scattered WhatsApp chats, voice notes and market-stall conversations into one shared plan — with a clear record when something changes. Built first for tailors, carpenters, printers, caterers and repair people in Nigeria.
        </p>
        <ul style={{ paddingLeft: 20, margin: '8px 0 16px' }}>
          <li>Write the basics and send one link.</li>
          <li>Both sides see the same version. Either can ask a question or propose changes.</li>
          <li>Updates make a <em>new version</em> — old ones stay visible, and everyone re-confirms. Silence is never agreement.</li>
        </ul>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link className="btn" href="/new" style={{ display: 'inline-block', textDecoration: 'none' }}>
            {en['cta.getStarted']}
          </Link>
          <Link className="btn" href="/plans" style={{ display: 'inline-block', textDecoration: 'none', background: '#475569' }}>
            My plans
          </Link>
        </div>
      </section>

      <section className="card" style={{ background: 'var(--nwa-color-primary-soft)', borderColor: '#c7d7fe' }}>
        <h3 style={{ marginTop: 0 }}>Pidgin</h3>
        <p style={{ margin: 0 }}>{pcm['app.tagline']}.</p>
      </section>

      <p className="footer">
        Built for Android + web. No contracts, no payments, no ratings in MVP — just shared memory. See <a href="https://github.com/CyberElias-TechPros/nwa/tree/arena/72dac57a-nwa/docs">the planning docs</a> and the <a href="https://github.com/CyberElias-TechPros/nwa/tree/arena/72dac57a-nwa/docs/08-ultra-granular-todo.md">build todo list</a>.
      </p>
    </main>
  );
}
