import Link from 'next/link';

export const metadata = { title: 'About NaWeAgree' };

export default function AboutPage() {
  return (
    <main>
      <h1>About NaWeAgree</h1>
      <p className="muted">
        NaWeAgree was built by a small team in Lagos who kept getting burned by the same thing: "I thought you said" moments with tailors, welders, carpenters, and dispatch riders.
      </p>

      <div className="card">
        <h3>The problem</h3>
        <p>
          Most small-scale custom work in Nigeria happens verbally — on a street corner, over a phone call, in a WhatsApp voice note.
          Both people leave the conversation with slightly different versions. When things go wrong (wrong fabric, late delivery, surprise price), there's nothing to look back at. Nobody is necessarily a bad person — memory is just bad.
        </p>
      </div>

      <div className="card success">
        <h3>The fix</h3>
        <p style={{ margin: 0 }}>
          A single, shared, editable page both of you have. It takes 30 seconds to make. You don't need an account. You don't need an app. You just need a link.
        </p>
      </div>

      <div className="card">
        <h3>What we believe</h3>
        <ul>
          <li><strong>Trust is built by clarity.</strong> Not by signatures, deposits, or threats.</li>
          <li><strong>Memory is a feature, not a product.</strong> We sell nothing but an honest piece of paper.</li>
          <li><strong>Small work deserves good tools.</strong> Carpenters and hairdressers and okada riders deserve software as good as what a Fortune 500 company gets.</li>
          <li><strong>Privacy is respect.</strong> We don't sell your data. We don't train AI on your conversations. We don't send spam.</li>
        </ul>
      </div>

      <div className="card warning">
        <h3>What we are NOT</h3>
        <p style={{ margin: 0 }}>
          We are not lawyers. We are not judges. We don't hold money, we don't do escrow, we don't rate vendors. NaWeAgree is a memory for both people, not a weapon for one.
        </p>
      </div>

      <h3>Contact us</h3>
      <p>
        Found a bug? Have a story? We'd love to hear it. Email us at <a href="mailto:hello@naweagree.app">hello@naweagree.app</a> or open an issue <a href="https://github.com/CyberElias-TechPros/nwa">on GitHub</a>.
      </p>

      <p className="footer-note">
        <Link href="/new">Start a plan</Link> · <Link href="/how">How it works</Link> · <Link href="/principles">Our principles</Link>
      </p>
    </main>
  );
}
