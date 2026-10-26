export const metadata = { title: 'Terms' };

export default function TermsPage() {
  return (
    <main>
      <h1>Terms of Service</h1>
      <p className="muted">Short, plain English. We're not trying to trick you.</p>

      <div className="card">
        <h3>The short version</h3>
        <p>NaWeAgree provides a shared page for two people to record what they agreed to. We are not lawyers, we do not arbitrate disputes, and we do not hold money. The service is provided as-is while it is in beta.</p>
      </div>

      <div className="card">
        <h3>What NaWeAgree is</h3>
        <p>A tool for recording the terms of a casual or small-business agreement between two people. A plan on NaWeAgree is a helpful record. It is <strong>not</strong>, on its own, a legally binding contract. If you need a contract for high-value work, please consult a lawyer.</p>
      </div>

      <div className="card">
        <h3>Your responsibilities</h3>
        <ul>
          <li>Be honest. Don't create plans impersonating someone else.</li>
          <li>Don't use NaWeAgree for anything illegal, harassing, or dangerous.</li>
          <li>Don't try to break into the service, guess invite tokens, or scrape data.</li>
          <li>You're responsible for keeping your device secure — anyone with your phone can open "My plans".</li>
        </ul>
      </div>

      <div className="card">
        <h3>What we are NOT responsible for</h3>
        <ul>
          <li>If the other person doesn't do what they said. We are a record, not an enforcer.</li>
          <li>If you lose access to your device and can't get back into your plans.</li>
          <li>If a plan leaks because you shared the link with the wrong person. (You can reset the link at any time.)</li>
          <li>If the service is down during beta. We do our best but beta software breaks.</li>
        </ul>
      </div>

      <div className="card warning">
        <h3>Disputes between users</h3>
        <p style={{ margin: 0 }}>If two users disagree about what a plan means, NaWeAgree is not a court. We will provide the plan history to both parties on request, but we won't "side with" anyone. For serious disputes, please see a lawyer or a community mediator.</p>
      </div>

      <div className="card">
        <h3>Changes</h3>
        <p>We may update these terms as the product grows. We'll post changes on this page and, for material changes, show a notice in the app.</p>
      </div>

      <p className="footer-note">Questions? <a href="mailto:hello@naweagree.app">hello@naweagree.app</a>.</p>
    </main>
  );
}
