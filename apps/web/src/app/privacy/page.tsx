export const metadata = { title: 'Privacy' };

export default function PrivacyPage() {
  return (
    <main>
      <h1>Privacy</h1>
      <p className="muted">Last updated: October 2026. Short version: we collect almost nothing and we sell nothing.</p>

      <div className="card">
        <h3>What we store</h3>
        <ul>
          <li><strong>The plans you create.</strong> Title, notes, fields, versions, acks, and comments. That is the product — without it there is nothing to agree on.</li>
          <li><strong>A random device key</strong> (a 16-byte cookie) so the app knows it's you when you come back to "My plans". We don't tie this to your name, email, or phone unless you later give us one.</li>
          <li><strong>Display names</strong> that participants type when they open an invite (e.g. "Chidi" or "Aisha").</li>
        </ul>
      </div>

      <div className="card">
        <h3>What we do NOT store</h3>
        <ul>
          <li>Your phone number, unless you explicitly give it to us in a future version.</li>
          <li>Your email, unless you opt in to email reminders later.</li>
          <li>Your location.</li>
          <li>Your contacts or your messages.</li>
          <li>Your payment information (we don't handle payments).</li>
          <li>Any advertising identifiers. There are no ads, and no trackers.</li>
        </ul>
      </div>

      <div className="card">
        <h3>Who can see a plan</h3>
        <p>Only people who have the invite link, plus you. Invite tokens are 22+ random characters — unguessable. If you ever suspect a link leaked, the plan creator can press "Reset invite link" to issue a fresh one; the old link stops working immediately.</p>
      </div>

      <div className="card">
        <h3>Deletion</h3>
        <p>You can delete any plan you're part of from the plan page (coming in W4). Until then, email <a href="mailto:privacy@naweagree.app">privacy@naweagree.app</a> from any address and we will delete plans associated with your device within 7 days.</p>
      </div>

      <div className="card">
        <h3>Data location</h3>
        <p>Data is stored in Neon Postgres in the EU (eu-west-2) with encrypted transport and storage-at-rest. We do not replicate to servers outside the EU for launch.</p>
      </div>

      <div className="card warning">
        <h3>Important</h3>
        <p style={{ margin: 0 }}>NaWeAgree is not end-to-end encrypted. It is designed to be visible to both parties (that is the point). Don't put bank PINs, medical information, or deeply personal secrets in a plan. It is a record of an agreement, not a vault.</p>
      </div>
    </main>
  );
}
