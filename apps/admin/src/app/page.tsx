export default function AdminHome() {
  return (
    <main style={{ maxWidth: 960, margin: '48px auto', fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>NaWeAgree admin</h1>
      <p style={{ color: '#64748b', marginBottom: 24 }}>Internal dashboard (W15). Wired to /api/proxy in production; today it surfaces the design system and route map.</p>

      <section style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <Card title="Health" lines={['GET /v1/ready', 'Memory or Postgres backend', 'Receipt HMAC status']} />
        <Card title="Abuse reports" lines={['POST /v1/abuse/report', 'List / triage UI', '24h SLA during beta']} />
        <Card title="NDPR requests" lines={['POST /v1/privacy/requests', 'Export download', 'Anonymise on delete']} />
        <Card title="Receipts" lines={['GET /v1/jobs/:id/receipt', 'HS256 tamper-evident', '/v1/receipts/verify']} />
        <Card title="Scheduler" lines={['Cron 09:00 UTC daily', 'Nudge after 48h idle', 'Stalled after 7 days']} />
        <Card title="Rate limits" lines={['30 req / min / IP', 'Idempotency-Key supported', 'Sliding window in KV']} />
      </section>

      <section style={{ marginTop: 36 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Production wiring checklist</h2>
        <ul style={{ lineHeight: 1.7, color: '#334155' }}>
          <li>Set DATABASE_URL to Neon pooled (eu-west-2).</li>
          <li>Set RECEIPT_SECRET to a 32-byte random hex (rotate yearly; track via <code>kid</code>).</li>
          <li>Set SCHEDULER_SECRET for /_scheduler/sweep cron binding.</li>
          <li>Resend + FCM in W5/W7 (needs vendor keys — not sandboxed).</li>
          <li>Deploy Cloudflare Worker cron trigger: <code>0 9 * * *</code></li>
        </ul>
      </section>
    </main>
  );
}

function Card({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>{title}</h3>
      <ul style={{ margin: 0, paddingLeft: 18, color: '#475569', fontSize: 14, lineHeight: 1.6 }}>
        {lines.map((l) => <li key={l}>{l}</li>)}
      </ul>
    </div>
  );
}
