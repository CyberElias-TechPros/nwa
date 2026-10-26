import Link from 'next/link';
import { HandshakeIllustration } from '@/components/illustrations/handshake';

async function getApiHealth(): Promise<{ ok: boolean; latencyMs?: number }> {
  try {
    const apiUrl = process.env.NWA_API_URL ?? 'http://127.0.0.1:8787';
    const t0 = Date.now();
    const res = await fetch(`${apiUrl}/v1/health`, { cache: 'no-store' });
    return { ok: res.ok, latencyMs: Date.now() - t0 };
  } catch {
    return { ok: false };
  }
}

export default async function HomePage() {
  const health = await getApiHealth();
  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <span className="badge soft" style={{ marginBottom: 20 }}>
            <span aria-hidden>✨</span> Built for Nigeria · works everywhere
          </span>
          <h1>No more<br />"I thought you said…"</h1>
          <p className="lede">
            NaWeAgree turns a market-stall chat, a WhatsApp voice note, or a quick negotiation into a <strong>shared plan</strong> both people can see, update, and actually agree to. No app to download. No accounts. Just a link.
          </p>
          <div className="cta-row">
            <Link href="/new" className="btn">Start a plan — it's free</Link>
            <Link href="/how" className="btn ghost">See how it works →</Link>
          </div>
          <div style={{ marginTop: 16 }}>
            <span className="badge soft teal" style={{ fontSize: 12 }}>
              {health.ok ? `● Live · API responding in ${health.latencyMs ?? '?'}ms` : '● Demo mode — in-memory preview'}
            </span>
          </div>
          <div style={{ marginTop: 48 }}>
            <HandshakeIllustration />
          </div>
        </div>
      </section>

      <main className="wide">
        {/* Features */}
        <section id="features">
          <div className="section-head">
            <div className="eyebrow">Why NaWeAgree</div>
            <h2>Verbal agreements deserve a memory.</h2>
            <p>You don't need a contract for everyday work. You need something honest both of you can look back on — without the friction of forms, payments, or accounts.</p>
          </div>
          <div className="features">
            <div className="feature">
              <div className="icon" aria-hidden>📝</div>
              <h3>Write it in 30 seconds</h3>
              <p>What the job is, price, when it's ready, anything special. Tap send. They get one link.</p>
            </div>
            <div className="feature teal">
              <div className="icon" aria-hidden>🤲</div>
              <h3>Both people see the same thing</h3>
              <p>No screenshots, no forwarded voice notes, no "the message I sent said…". One page, always up to date.</p>
            </div>
            <div className="feature gold">
              <div className="icon" aria-hidden>🔄</div>
              <h3>Changes are honest</h3>
              <p>When something changes, it becomes a <em>new version</em>. Older versions stay visible, and everyone taps to re-confirm.</p>
            </div>
            <div className="feature">
              <div className="icon" aria-hidden>🔕</div>
              <h3>Gentle reminders</h3>
              <p>If nobody has responded in a couple of days, we nudge both people. No spam. Silence is never treated as agreement.</p>
            </div>
            <div className="feature teal">
              <div className="icon" aria-hidden>📴</div>
              <h3>Works offline</h3>
              <p>Bad network? The page loads anyway and syncs when you're back. Designed for 2G, not just fibre.</p>
            </div>
            <div className="feature gold">
              <div className="icon" aria-hidden>🔒</div>
              <h3>No accounts. No tracking.</h3>
              <p>We remember your device with a cookie, that's it. No phone numbers sold, no Facebook pixels, no "sign in with Google".</p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how">
          <div className="section-head">
            <div className="eyebrow">How it works</div>
            <h2>Three taps. No friction.</h2>
            <p>From market stall to agreed plan in under a minute.</p>
          </div>
          <div className="steps">
            <div className="step">
              <h3>Write it</h3>
              <p>Open NaWeAgree and type what you agreed — or paste from your chat. Price, material, pickup day, anything important.</p>
            </div>
            <div className="step">
              <h3>Send the link</h3>
              <p>Share one link on WhatsApp, SMS, anywhere. They tap it, see exactly what you wrote, and add their name so they can respond.</p>
            </div>
            <div className="step">
              <h3>Both tap "agreed"</h3>
              <p>When both people confirm, the plan is mutually acknowledged. If something changes, propose a new version — history stays.</p>
            </div>
          </div>
          <div className="center" style={{ marginTop: 24 }}>
            <Link href="/new" className="btn">Start your first plan</Link>
          </div>
        </section>

        {/* Quote */}
        <section>
          <div className="quote">
            <blockquote>
              "My tailor used a different fabric from what I described and said I agreed. I showed him the chat — he said I didn't say it like that. NaWeAgree is the thing I wish I'd had that day."
            </blockquote>
            <cite>Amaka, graphic designer, Lagos</cite>
          </div>
        </section>

        {/* Who it's for */}
        <section id="who">
          <div className="section-head">
            <div className="eyebrow">Who it's for</div>
            <h2>Anyone who's ever said "we talked about this".</h2>
            <p>If you've ever left a negotiation wondering whether you were both talking about the same thing, this is for you.</p>
          </div>
          <div className="features">
            <div className="feature"><h3>Tailors & fashion</h3><p>Material, style, measurements, delivery day.</p></div>
            <div className="feature teal"><h3>Carpenters & welders</h3><p>Wood type, dimensions, finish, payment milestones.</p></div>
            <div className="feature gold"><h3>Caterers & events</h3><p>Guest count, menu, serving time, venue.</p></div>
            <div className="feature"><h3>Hairdressers & barbers</h3><p>Style, attachments, price, appointment time.</p></div>
            <div className="feature teal"><h3>Okada & dispatch</h3><p>Pickup, drop-off, fare — agreed before the ride.</p></div>
            <div className="feature gold"><h3>Repair people</h3><p>What's broken, parts needed, when it'll be ready.</p></div>
          </div>
        </section>

        {/* Principles */}
        <section id="principles">
          <div className="section-head">
            <div className="eyebrow">Our principles</div>
            <h2>Designed like your conscience would.</h2>
          </div>
          <div className="card honesty" style={{ marginTop: 24 }}>
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6 }}>
              <strong>Silence is not consent.</strong> We will never mark something "agreed" because someone didn't respond. We will never auto-confirm after a timer. We will never send a reminder that implies pressure. We exist to make agreement visible, not to manufacture it.
            </p>
          </div>
          <div className="features">
            <div className="feature teal"><h3>No AI speaks for you</h3><p>We won't summarise your words or guess what you meant. Words stay words.</p></div>
            <div className="feature gold"><h3>History is visible</h3><p>Old versions never disappear. If something changes, you see what was there before.</p></div>
            <div className="feature"><h3>You own your words</h3><p>You can delete a plan any time. We don't train models on what you write.</p></div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ textAlign: 'center', padding: '64px 0', marginTop: 48 }}>
          <h2 style={{ marginBottom: 12 }}>Start a plan in 30 seconds.</h2>
          <p className="muted" style={{ maxWidth: 480, margin: '0 auto 24px' }}>
            No app to install. No phone number. No spam. Send the link, and finally know you're both talking about the same thing.
          </p>
          <Link href="/new" className="btn" style={{ fontSize: 17, padding: '16px 28px' }}>
            Create your first plan →
          </Link>
          <p className="footer-note">
            Free while in beta. Built in Lagos by people who've been on the wrong end of "I thought you said".
          </p>
        </section>
      </main>
    </>
  );
}
