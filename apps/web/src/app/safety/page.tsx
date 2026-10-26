import Link from 'next/link';

export const metadata = { title: 'Safety & trust' };

export default function SafetyPage() {
  return (
    <main>
      <h1>Safety & trust</h1>
      <p className="muted">How we try to make NaWeAgree honest, private, and hard to abuse.</p>

      <div className="card success">
        <h3>The honest design rule</h3>
        <p style={{ margin: 0 }}>If a feature would let one person pressure, trick, or impersonate the other, we don't ship it. Examples we've already said no to: auto-confirm timers, "reminders" that imply agreement, sending plans from a phone number the other person doesn't recognise.</p>
      </div>

      <div className="card">
        <h3>Invite links</h3>
        <ul>
          <li>Invite tokens are 22+ random characters. You cannot guess one.</li>
          <li>Once someone has opened the plan from their device, other devices are shown "this invite has been claimed on another device" and cannot claim it.</li>
          <li>The creator can press "Reset invite link" at any time to revoke the old link and issue a fresh one.</li>
          <li>Invites expire after 14 days by default, though the plan remains accessible to people who already opened it.</li>
        </ul>
      </div>

      <div className="card">
        <h3>Device identity (no accounts)</h3>
        <p>Instead of passwords or phone OTP, NaWeAgree remembers your device with a random cookie. This is deliberately weaker than an account — it means you can't just "log in" from a new device and see plans, which prevents phone-number theft attacks. In W5 we will add optional email magic links for people who want to reclaim plans across devices.</p>
      </div>

      <div className="card">
        <h3>Harassment & abuse</h3>
        <p>If you receive a plan that is threatening, harassing, or spam, please forward the link to <a href="mailto:safety@naweagree.app">safety@naweagree.app</a>. We will revoke it and ban the creator. We respond to every safety report within 24 hours during beta.</p>
      </div>

      <div className="card">
        <h3>What to do if something goes wrong</h3>
        <ol>
          <li>If a link was shared by mistake, ask the creator to press "Reset invite link".</li>
          <li>If you disagree with what's written, tap "Something needs to change" — don't just agree to keep the peace.</li>
          <li>If you feel pressured, close the page. You are not obligated to respond.</li>
          <li>For high-stakes work (weddings, large payments), use a written contract. NaWeAgree is perfect for everyday small work; it's not a replacement for a lawyer.</li>
        </ol>
      </div>

      <p className="footer-note"><Link href="/principles">Read our principles</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link></p>
    </main>
  );
}
