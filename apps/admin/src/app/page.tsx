export default function AdminHome() {
  return (
    <main style={{ maxWidth: 720, margin: '48px auto', fontFamily: 'system-ui', padding: 16 }}>
      <h1>NaWeAgree admin</h1>
      <p style={{ color: '#64748b' }}>Wired up in W15 (trust-and-safety / support tooling).</p>
      <ul>
        <li>SAR/delete workflow</li>
        <li>IP blocks &amp; abuse reports</li>
        <li>Feature flag console</li>
      </ul>
    </main>
  );
}
