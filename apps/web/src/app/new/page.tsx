'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type ApiClientError } from '../../lib/api';

const CATEGORIES = [
  { key: 'tailor', label: 'Tailor / sewing' },
  { key: 'carpenter', label: 'Carpenter / furniture' },
  { key: 'printer', label: 'Printer / branding' },
  { key: 'caterer', label: 'Caterer / food' },
  { key: 'repair', label: 'Repair / fix' },
  { key: 'hair', label: 'Hair / beauty' },
  { key: 'other', label: 'Other custom work' },
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
      // Navigate to the share page with metadata so it can persist to local storage.
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
      <h1>Start a new shared plan</h1>
      <p className="muted">Write the basics so both sides remember the same thing. You can change any of this before the other person sees it.</p>

      <form onSubmit={onSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span>Your name (or what they call you)</span>
          <input name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ada" maxLength={60} style={inputStyle} />
          {fieldErrors.creatorName && <small style={{ color: '#b91c1c' }}>{fieldErrors.creatorName}</small>}
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span>What's the work? <span style={{ color: '#b91c1c' }}>*</span></span>
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sew a navy senator suit"
            required
            minLength={3}
            maxLength={120}
            autoFocus
            style={inputStyle}
          />
          {fieldErrors.title && <small style={{ color: '#b91c1c' }}>{fieldErrors.title}</small>}
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span>Kind of work</span>
          <select name="category" value={categoryKey} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
            {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span>What you already agreed on (optional)</span>
          <textarea
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Material: navy ankara. Deadline: two weeks. Price we talked about: N25,000."
            rows={5}
            maxLength={4000}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          <small className="muted">Plain language. You don't have to fill everything in now.</small>
        </label>

        {error && <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: 12, borderRadius: 8, color: '#b91c1c' }}>{error}</div>}

        <button type="submit" className="btn" disabled={submitting || title.trim().length < 3}>
          {submitting ? 'Creating…' : 'Create plan & get share link'}
        </button>
      </form>

      <p className="muted" style={{ marginTop: 16 }}>
        Reminder: this is a prototype. Plans aren't contracts. This page creates a shareable preview page you can send to the other person — they'll be able to read, ask questions, and confirm when they open it.
      </p>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: 16,
  border: '1px solid var(--nwa-color-border)',
  borderRadius: 10,
  background: '#fff',
  fontFamily: 'var(--font-sans)',
};
