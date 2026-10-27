'use client';

import { useState } from 'react';
import { api, ApiQueuedError } from '@/lib/api';

const REASONS: { key: string; label: string }[] = [
  { key: 'harassment', label: 'Harassment' },
  { key: 'scam', label: 'Scam / fraud' },
  { key: 'impersonation', label: 'Impersonating someone' },
  { key: 'under_age', label: 'Someone under 18' },
  { key: 'violence', label: 'Threats of violence' },
  { key: 'other', label: 'Something else' },
];

export default function ReportPage() {
  const [reason, setReason] = useState('scam');
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [jobId, setJobId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      const data = await api.reportAbuse({
        reason,
        description: description.trim(),
        contact: contact.trim() || undefined,
        jobId: jobId.trim() || undefined,
      });
      setDone(data.id);
    } catch (e2) {
      setErr(e2 instanceof ApiQueuedError ? 'Report saved on this device — will send when you\'re back online.' : (e2 as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <main>
        <p className="eyebrow">Report received</p>
        <h1 className="display-title" style={{ marginBottom: 'var(--space-3)' }}>Thank you.</h1>
        <p className="lead" style={{ marginBottom: 'var(--space-5)' }}>
          A human will look at this. Reference: <code>{done}</code>.
        </p>
        <p>If you&apos;re in immediate danger, please call local emergency services.</p>
      </main>
    );
  }

  return (
    <main>
      <p className="eyebrow">Safety</p>
      <h1 className="display-title" style={{ marginBottom: 'var(--space-3)' }}>Report something wrong</h1>
      <p className="lead" style={{ marginBottom: 'var(--space-6)' }}>
        Tell us what happened. A human reads every report — we don&apos;t auto-ban or auto-reply. Your report is confidential.
      </p>

      <form onSubmit={submit} className="card">
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>What&apos;s wrong?</legend>
          <div style={{ display: 'grid', gap: 8 }}>
            {REASONS.map((r) => (
              <label key={r.key} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', border: '1px solid var(--nwa-color-border)', borderRadius: 'var(--nwa-radius-md)', cursor: 'pointer' }}>
                <input type="radio" name="reason" value={r.key} checked={reason === r.key} onChange={() => setReason(r.key)} style={{ width: 18, height: 18 }} />
                <span>{r.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div style={{ marginTop: 'var(--space-4)' }}>
          <label htmlFor="desc" style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>What happened? <span className="muted">(minimum 10 characters)</span></label>
          <textarea id="desc" rows={5} required minLength={10} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 'var(--nwa-radius-md)', border: '1px solid var(--nwa-color-border)', fontFamily: 'inherit', resize: 'vertical', background: 'var(--nwa-color-surface)', color: 'var(--nwa-color-text)' }} />
        </div>

        <div style={{ marginTop: 'var(--space-4)' }}>
          <label htmlFor="job" style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Plan link or ID <span className="muted">(optional)</span></label>
          <input id="job" type="text" value={jobId} onChange={(e) => setJobId(e.target.value)} placeholder="Paste the naweagree.app/j/... link or paste the plan ID" style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--nwa-radius-md)', border: '1px solid var(--nwa-color-border)', background: 'var(--nwa-color-surface)', color: 'var(--nwa-color-text)', fontSize: '1rem' }} />
        </div>

        <div style={{ marginTop: 'var(--space-4)' }}>
          <label htmlFor="contact" style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Where can we reach you? <span className="muted">(optional)</span></label>
          <input id="contact" type="text" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email or phone, if you want us to follow up" style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--nwa-radius-md)', border: '1px solid var(--nwa-color-border)', background: 'var(--nwa-color-surface)', color: 'var(--nwa-color-text)', fontSize: '1rem' }} />
        </div>

        {err ? <p className="card danger" style={{ marginTop: 'var(--space-4)' }} role="alert">{err}</p> : null}

        <div style={{ marginTop: 'var(--space-5)' }}>
          <button type="submit" className="btn btn-primary" disabled={submitting || description.trim().length < 10}>
            {submitting ? 'Sending…' : 'Send report'}
          </button>
        </div>
      </form>
    </main>
  );
}
