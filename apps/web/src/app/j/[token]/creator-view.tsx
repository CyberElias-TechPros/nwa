'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type ApiClientError, type InvitePreview } from '@/lib/api';
import { VersionHistory } from './version-history';
import { ProposeVersion } from './propose-version';

interface Props {
  token: string;
  initial: InvitePreview;
  creatorId: string;
}

/**
 * Creator's view of the invite page. Replaces the recipient "enter your
 * name → respond" flow with a sender-side dashboard.
 */
export function CreatorView({ token, initial, creatorId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(id);
  }, [router]);

  const responded = initial.currentVersion.acknowledgements.map((a) => {
    const p = initial.job.participants.find((x) => x.id === a.participantId);
    return { name: p?.displayName ?? 'Someone', action: a.action, comment: a.comment };
  });
  const active = initial.job.participants.filter((p) => p.state === 'active');
  const pending = active.filter((p) => !initial.currentVersion.acknowledgements.some((a) => a.participantId === p.id && a.action === 'reviewed'));

  async function markAgreed() {
    setBusy(true); setError(null);
    try {
      await api.ackInvite(token, creatorId, 'reviewed');
      router.refresh();
    } catch (err) {
      setError(((err as ApiClientError).payload?.error?.message) ?? 'Try again.');
    } finally { setBusy(false); }
  }

  return (
    <div>
      <section className="card" style={{ background: '#f0f9ff', border: '1px solid #bfdbfe' }}>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>You started this plan</p>
        <h2 style={{ margin: '4px 0 8px' }}>{statusHeadline(initial.job.status, responded.length, active.length)}</h2>
        <CreatorStatusBar initial={initial} />
      </section>

      {error && <div role="alert" style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</div>}

      {initial.changes.length > 0 && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Messages</h3>
          <ul style={{ paddingLeft: 0, margin: 0, listStyle: 'none' }}>
            {initial.changes.map((c) => (
              <li key={c.id} style={{ padding: '8px 0', borderTop: '1px solid var(--nwa-color-border)' }}>
                <div style={{ fontSize: 13, color: 'var(--nwa-color-text-muted)' }}>
                  <strong style={{ color: c.kind === 'question' ? '#b45309' : '#b91c1c' }}>
                    {c.kind === 'question' ? 'Question' : 'Wants to change'}
                  </strong> from {c.authorName} · {new Date(c.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
                <div style={{ marginTop: 4 }}>{c.comment}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Responses on this version</h3>
        {responded.length === 0 && <p className="muted" style={{ margin: 0 }}>No one has responded yet. Share the link above to get started.</p>}
        <ul style={{ paddingLeft: 20, margin: '8px 0 0' }}>
          {responded.map((r, i) => (
            <li key={i}><strong>{r.name}</strong> — {verbFor(r.action)}{r.comment ? <blockquote style={{ margin: '4px 0 0', paddingLeft: 12, borderLeft: '3px solid #bfdbfe', color: 'var(--nwa-color-text-muted)' }}>{r.comment}</blockquote> : null}</li>
          ))}
        </ul>
        {pending.length > 0 && (
          <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>
            Waiting on: {pending.map((p) => p.displayName).join(', ')}.
          </p>
        )}
      </section>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: 'var(--nwa-space-3) 0' }}>
        {!initial.currentVersion.acknowledgements.some((a) => a.participantId === creatorId && a.action === 'reviewed') && (
          <button className="btn" onClick={markAgreed} disabled={busy}>I agree with this version</button>
        )}
        <button className="btn" style={{ background: '#475569' }} onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/j/${token}`); alert('Link copied.'); }}>Copy share link</button>
        <button
          className="btn"
          style={{ background: '#b91c1c' }}
          disabled={busy}
          onClick={async () => {
            if (!confirm('Reset the invite link? The old link will stop working and anyone who already tapped it will stay on the plan. You\'ll get a fresh link to share.')) return;
            setBusy(true); setError(null);
            try {
              const res = await api.rotateInvite(initial.job.id, creatorId);
              const newUrl = `${window.location.origin}/j/${res.invite.token}`;
              window.history.replaceState({}, '', `/j/${res.invite.token}`);
              await navigator.clipboard?.writeText(newUrl);
              alert(`New link ready (copied to clipboard). Old link is now disabled.`);
              router.refresh();
            } catch (err) {
              setError(((err as ApiClientError).payload?.error?.message) ?? 'Could not reset link — try again.');
            } finally {
              setBusy(false);
            }
          }}
        >
          Reset invite link
        </button>
      </div>

      <VersionHistory versions={initial.versions} participants={initial.job.participants} />
      <ProposeVersion token={token} initial={initial} participantId={creatorId} />

      <p className="footer">
        This page auto-refreshes every 15 seconds. Silence isn't agreement — the plan only moves forward when everyone has tapped a button.
      </p>
    </div>
  );
}

function CreatorStatusBar({ initial }: { initial: InvitePreview }) {
  const acks = initial.currentVersion.acknowledgements;
  const active = initial.job.participants.filter((p) => p.state === 'active');
  const done = acks.filter((a) => a.action === 'reviewed').length;
  if (initial.job.status === 'mutually_acknowledged') return <p style={{ margin: 0 }}>Everyone has agreed to this version. If anything changes, propose an updated version above.</p>;
  if (done === 0) return <p style={{ margin: 0 }}>No one has responded yet. Send the link and wait.</p>;
  return <p style={{ margin: 0 }}>{done}/{active.length} people have agreed to this version.</p>;
}

function statusHeadline(s: string, respondedCount: number, totalActive: number) {
  if (s === 'mutually_acknowledged') return 'You both agreed';
  if (s === 'clarification_needed') return 'Someone asked a question';
  if (respondedCount > 0) return `${respondedCount}/${totalActive} responded`;
  return 'Waiting for a response';
}

function verbFor(a: string) {
  switch (a) {
    case 'reviewed': return 'agreed with this version.';
    case 'question': return 'asked a question.';
    case 'disagree': return 'sees it differently.';
    case 'need_time': return 'needs more time.';
    case 'withdrawn': return 'withdrew their response.';
    default: return 'responded.';
  }
}
