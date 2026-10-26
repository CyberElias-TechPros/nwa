import Link from 'next/link';
import { HandshakeIllustration } from '@/components/illustrations/handshake';

export const metadata = { title: 'How it works' };

export default function HowPage() {
  return (
    <main className="wide">
      <div className="center" style={{ padding: '48px 0 8px' }}>
        <span className="badge soft" style={{ marginBottom: 16 }}>How it works</span>
        <h1>Plans both people can see.</h1>
        <p className="muted" style={{ maxWidth: 560, margin: '16px auto 32px' }}>
          NaWeAgree is not a contract. It is not an escrow. It is not ratings. It is a shared, honest piece of paper between two people — digital, private, and impossible to misremember.
        </p>
        <HandshakeIllustration />
      </div>

      <section>
        <div className="steps" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <div className="step">
            <h3>1. Create</h3>
            <p>Open <Link href="/new">/new</Link>, write a title, and jot down what you agreed — price, material, date, anything you'd otherwise forget. Hit send.</p>
          </div>
          <div className="step">
            <h3>2. Share</h3>
            <p>Send one link through WhatsApp, SMS, or any app. The other person taps it, sees exactly what you wrote, and types their name so they can respond.</p>
          </div>
          <div className="step">
            <h3>3. Agree</h3>
            <p>Both sides tap "Yes, that's what we talked about". The plan becomes <span className="badge soft teal" style={{ margin: '0 4px' }}>mutually acknowledged</span> and you both have a copy.</p>
          </div>
          <div className="step">
            <h3>4. Update honestly</h3>
            <p>When something changes — price goes up, fabric changes, date shifts — anyone proposes a new version. Old versions stay visible. Everyone re-taps "agreed" on the new one.</p>
          </div>
        </div>
      </section>

      <section>
        <div className="card soft" style={{ marginTop: 32 }}>
          <h3>What NaWeAgree is NOT</h3>
          <ul style={{ marginBottom: 0 }}>
            <li>It is not a legally binding contract. If you need one, see a lawyer.</li>
            <li>It does not hold money or handle payments. Payment remains between you.</li>
            <li>It does not rate or shame people. There is no star system.</li>
            <li>It does not send reminders pretending you agreed if you didn't.</li>
          </ul>
        </div>
        <div className="card warning">
          <p style={{ margin: 0 }}>
            <strong>Silence is never consent.</strong> If the other person doesn't tap anything, the plan is <em>waiting</em> — not agreed. This is our most important rule, and we will never change it.
          </p>
        </div>
      </section>

      <div className="center" style={{ margin: '48px 0' }}>
        <Link href="/new" className="btn">Start a plan →</Link>
      </div>
    </main>
  );
}
