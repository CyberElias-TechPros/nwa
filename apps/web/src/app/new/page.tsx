'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type ApiClientError } from '../../lib/api';

const CATEGORIES = [
  { key: 'tailor', label: 'Tailor / sewing', emoji: '🧵' },
  { key: 'carpenter', label: 'Carpenter / furniture', emoji: '🪑' },
  { key: 'printer', label: 'Printer / branding', emoji: '🖨️' },
  { key: 'caterer', label: 'Caterer / food', emoji: '🍲' },
  { key: 'repair', label: 'Repair / fix', emoji: '🔧' },
  { key: 'hair', label: 'Hair / beauty', emoji: '💈' },
  { key: 'ride', label: 'Okada / dispatch', emoji: '🏍️' },
  { key: 'other', label: 'Other custom work', emoji: '🤝' },
];

export default function NewPlanPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [categoryKey, setCategory] = useState('tailor');
  const [notes, setNotes] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      const result = await api.createJob({ title, categoryKey, creatorName: name || undefined, initialNotes: notes || undefined });
      router.push(`/j/${result.invite.token}/share?title=${encodeURIComponent(title)}&jobId=${encodeURIComponent(result.job.id)}&creatorId=${encodeURIComponent(result.creatorParticipantId)}`);
    } catch (err) {
      const e = err as ApiClientError;
      if (e?.payload?.error?.fields?.length) {
        const fe: Record<string, string> = {};
        for (const f of e.payload.error.fields) fe[f.path] = f.message ?? 'Check this field.';
        setFieldErrors(fe);
      }
      setError(e?.payload?.error?.message ?? 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <div style={{ marginBottom: 24 }}>
        <span className="badge soft gold" style={{ marginBottom: 12 }}>Step 1 of 3 · write</span>
        <h1 style={{ marginBottom: 8 }}>Start a shared plan</h1>
        <p className="muted" style={{ fontSize: 17, maxWidth: 560 }}>
          Write the basics so you both remember the same thing. You can change anything before sending. The other person will see exactly what's here and be invited to agree or ask a question.
        </p>
      </div>

      <form onSubmit={onSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: 28 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Your name <span className="muted" style={{ fontWeight: 400 }}>(what they call you)</span></span>
          <input name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ada" maxLength={60} />
          {fieldErrors.creatorName && <small style={{ color: 'var(--nwa-color-danger)' }}>{fieldErrors.creatorName}</small>}
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>What's the work? <span aria-hidden style={{ color: 'var(--nwa-color-danger)' }}>*</span></span>
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sew a navy senator suit with gold buttons"
            required
            minLength={3}
            maxLength={120}
            autoFocus
          />
          {fieldErrors.title && <small style={{ color: 'var(--nwa-color-danger)' }}>{fieldErrors.title}</small>}
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Kind of work</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className="btn ghost sm"
                style={{
                  justifyContent: 'flex-start',
                  padding: '10px 12px',
                  background: categoryKey === c.key ? 'var(--nwa-color-primarySoft)' : undefined,
                  borderColor: categoryKey === c.key ? 'var(--nwa-color-primary)' : undefined,
                  color: categoryKey === c.key ? 'var(--nwa-color-primary)' : undefined,
                }}
                aria-pressed={categoryKey === c.key}
              >
                <span aria-hidden style={{ fontSize: 18 }}>{c.emoji}</span>
                <span style={{ fontSize: 14 }}>{c.label}</span>
              </button>
            ))}
          </div>
          <select name="category" value={categoryKey} onChange={(e) => setCategory(e.target.value)} style={{ display: 'none' }} aria-hidden>
            {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>What you already agreed on <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></span>
          <textarea
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={"Material: navy ankara. Deadline: two weeks. Price: N25,000. Pickup at shop."}
            rows={5}
            maxLength={4000}
            style={{ resize: 'vertical' }}
          />
          <small className="muted">Plain language, bullet points fine. You don't have to fill everything in now — either of you can propose updates later.</small>
        </label>

        {error && (
          <div role="alert" className="card danger" style={{ margin: 0, padding: 14, background: 'var(--nwa-color-dangerSoft)', borderColor: 'transparent' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
          <button type="submit" className="btn" disabled={submitting || title.trim().length < 3}>
            {submitting ? 'Creating…' : 'Create plan →'}
          </button>
          <span className="muted" style={{ fontSize: 13 }}>
            Takes ~30 seconds · No account needed
          </span>
        </div>
      </form>

      <div className="card soft" style={{ marginTop: 16 }}>
        <p style={{ margin: 0, fontSize: 15 }}>
          <strong>Reminder:</strong> NaWeAgree is a shared record, not a contract. Nothing is agreed until both of you tap "Yes, that's what we talked about".
        </p>
      </div>

      <p style={{ marginTop: 16 }}>
        <Link href="/how" className="muted">Learn more about how it works →</Link>
      </p>
    </main>
  );
}
