'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiClientError, ApiQueuedError, type InvitePreview } from '@/lib/api';

function errMessage(e: unknown, fallback = 'Try again.'): string {
  if (e instanceof ApiQueuedError) return 'Saved on this device — will send when you\'re back online.';
  if (e instanceof ApiClientError) return e.payload?.error?.message ?? fallback;
  return fallback;
}

interface Props {
  token: string;
  initial: InvitePreview;
  participantId: string | null;
}

interface DraftField { key: string; label: string; value: string }

/**
 * "Propose an updated version" panel. Lets any participant edit one or more
 * fields and publish v2. Per ADR-106: publishing a new version does NOT
 * carry acknowledgements forward; both sides must re-review. Silence is
 * not consent.
 */
export function ProposeVersion({ initial, participantId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [drafts, setDrafts] = useState<DraftField[]>(
    initial.currentVersion.fields.map((f) => ({ key: f.key, label: f.label, value: f.valueDisplay ?? f.valueRaw ?? '' })),
  );
  if (drafts.length === 0) {
    drafts.push({ key: 'notes', label: 'What we talked about', value: '' });
  }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(i: number, patch: Partial<DraftField>) {
    setDrafts((d) => d.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function addField() {
    setDrafts((d) => [...d, { key: `field_${d.length + 1}`, label: 'Detail', value: '' }]);
  }
  function removeField(i: number) {
    setDrafts((d) => d.filter((_, idx) => idx !== i));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!participantId) { setError('Open the plan with your name first.'); return; }
    const reasonTrim = reason.trim();
    if (reasonTrim.length < 2) { setError('Say what changed and why (at least 2 characters).'); return; }
    const filled = drafts.filter((d) => d.value.trim().length > 0 && d.label.trim().length > 0);
    if (filled.length === 0) { setError('Change at least one field.'); return; }
    setBusy(true); setError(null);
    try {
      await api.publishVersion(initial.job.id, participantId, filled, reasonTrim, initial.currentVersion.number);
      setOpen(false);
      setReason('');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError && err.payload?.error?.code === 'VERSION_CONFLICT') {
        setError('Someone posted a new version while you were editing. We refreshed the page — review the latest version and try again.');
        setTimeout(() => router.refresh(), 800);
      } else {
        setError(errMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }

  const canPropose = Boolean(participantId);
  return (
    <section className="card" style={{ background: '#f8fafc' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h3 style={{ margin: 0 }}>Suggest an update (new version)</h3>
        {!open && (
          <button
            type="button"
            className="btn"
            style={{ background: '#0f766e', padding: '8px 14px', fontSize: 14 }}
            onClick={() => setOpen(true)}
            disabled={!canPropose}
            title={canPropose ? 'Start a new version of this plan' : 'Open the plan with your name first'}
          >
            + Propose updated plan
          </button>
        )}
      </div>
      {!open && (
        <p className="muted" style={{ margin: '8px 0 0', fontSize: 13 }}>
          If something needs to change, suggest an edited version. The other person will see the new version and has to
          re-confirm — agreements on older versions don't carry forward.
        </p>
      )}
      {open && (
        <form onSubmit={submit} style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {drafts.map((f, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={f.label}
                  onChange={(e) => updateField(i, { label: e.target.value })}
                  placeholder="Label (e.g. Price, Material, Deadline)"
                  maxLength={80}
                  style={input}
                />
                {drafts.length > 1 && (
                  <button type="button" onClick={() => removeField(i)} style={{ background: 'transparent', border: 0, color: '#b91c1c', cursor: 'pointer', padding: '0 8px' }} aria-label="Remove field">×</button>
                )}
              </div>
              <textarea
                value={f.value}
                onChange={(e) => updateField(i, { value: e.target.value })}
                placeholder="New value"
                rows={2}
                maxLength={2000}
                style={{ ...input, resize: 'vertical' }}
              />
            </div>
          ))}
          <button type="button" onClick={addField} style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px dashed var(--nwa-color-border)', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', color: 'var(--nwa-color-text-muted)' }}>+ Add another field</button>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 13 }}><strong>What changed and why?</strong> <span className="muted">(required)</span></span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Switched to mahogany after we talked this morning." maxLength={500} style={input} required minLength={2} />
          </label>
          {error && <div role="alert" style={{ color: '#b91c1c', fontSize: 14 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn" disabled={busy}>{busy ? 'Publishing…' : 'Send updated plan'}</button>
            <button type="button" className="btn" style={{ background: '#64748b' }} onClick={() => setOpen(false)}>Cancel</button>
          </div>
          <small className="muted">This creates a new version. Both of you will need to re-confirm — no silence-as-consent.</small>
        </form>
      )}
    </section>
  );
}

const input: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 15,
  border: '1px solid var(--nwa-color-border)',
  borderRadius: 8,
  background: '#fff',
  fontFamily: 'var(--font-sans)',
};
