'use client';

import { useState } from 'react';

type Result =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'ok'; message: string; payload?: { jobTitle?: string; versionNumber?: number; mutualAt?: string; dev?: boolean } }
  | { kind: 'bad'; message: string };

export default function VerifyReceiptPage() {
  const [json, setJson] = useState('');
  const [result, setResult] = useState<Result>({ kind: 'idle' });

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setResult({ kind: 'checking' });
    try {
      const parsed = JSON.parse(json);
      const res = await fetch('/api/proxy/v1/receipts/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      const data = (await res.json()) as { ok: boolean; reason?: string; payload?: { jobTitle?: string; versionNumber?: number; mutualAt?: string; sig?: { dev?: boolean } } };
      if (data.ok) {
        setResult({
          kind: 'ok',
          message: data.reason === 'dev_secret'
            ? 'Signature matches, but this was signed with the development key — not a production record.'
            : 'Signature matches — this is a genuine NaWeAgree record.',
          payload: {
            jobTitle: data.payload?.jobTitle,
            versionNumber: data.payload?.versionNumber,
            mutualAt: data.payload?.mutualAt,
            dev: data.reason === 'dev_secret' || data.payload?.sig?.dev,
          },
        });
      } else {
        setResult({ kind: 'bad', message: "This doesn't look like one of our receipts (signature didn't match)." });
      }
    } catch {
      setResult({ kind: 'bad', message: 'That isn\'t valid JSON. Paste the full receipt file, including the "sig" block.' });
    }
  }

  return (
    <main>
      <p className="eyebrow">Receipt verification</p>
      <h1 className="display-title" style={{ marginBottom: 'var(--space-3)' }}>
        Check a NaWeAgree receipt
      </h1>
      <p className="lead" style={{ marginBottom: 'var(--space-6)' }}>
        Paste the full receipt JSON (from the .json file someone sent you). We&apos;ll verify its signature against our key. We never store the pasted content.
      </p>

      <form onSubmit={onVerify} className="card soft">
        <label htmlFor="receipt" style={{ display: 'block', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
          Receipt JSON
        </label>
        <textarea
          id="receipt"
          required
          rows={10}
          value={json}
          onChange={(e) => setJson(e.target.value)}
          placeholder='Paste the entire { "schema": "nwa.receipt/v1", ..., "sig": { ... } } file here.'
          style={{
            width: '100%', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 13,
            padding: 12, borderRadius: 'var(--nwa-radius-md)', border: '1px solid var(--nwa-color-border)',
            background: 'var(--nwa-color-surface)', color: 'var(--nwa-color-text)', resize: 'vertical',
          }}
        />
        <div style={{ marginTop: 'var(--space-4)' }}>
          <button type="submit" className="btn btn-primary" disabled={result.kind === 'checking' || !json.trim()}>
            {result.kind === 'checking' ? 'Checking…' : 'Verify signature'}
          </button>
        </div>
      </form>

      {result.kind === 'ok' && (
        <div className="card success" role="status" aria-live="polite">
          <h3 style={{ marginBottom: 8 }}>✓ Genuine</h3>
          <p style={{ margin: 0 }}>{result.message}</p>
          {result.payload?.jobTitle ? (
            <ul style={{ marginTop: 12 }}>
              <li><strong>Plan:</strong> {result.payload.jobTitle}</li>
              {result.payload.versionNumber ? <li><strong>Version:</strong> {result.payload.versionNumber}</li> : null}
              {result.payload.mutualAt ? <li><strong>Mutually acknowledged:</strong> {new Date(result.payload.mutualAt).toLocaleString()}</li> : null}
            </ul>
          ) : null}
        </div>
      )}

      {result.kind === 'bad' && (
        <div className="card danger" role="alert">
          <h3 style={{ marginBottom: 8 }}>Not a recognised receipt</h3>
          <p style={{ margin: 0 }}>{result.message}</p>
        </div>
      )}

      <p className="muted" style={{ marginTop: 'var(--space-6)' }}>
        We verify signatures locally on the server and don&apos;t retain pasted receipts. If you believe you received a forged receipt, please <a href="/safety">report it</a>.
      </p>
    </main>
  );
}
