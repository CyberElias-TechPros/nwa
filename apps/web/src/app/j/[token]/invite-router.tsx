'use client';

import { useEffect, useState } from 'react';
import { InviteClient } from './invite-client';
import { CreatorView } from './creator-view';
import { getCreatedInvite, rememberCreatedInvite } from '@/lib/storage';
import type { InvitePreview } from '@/lib/api';

/**
 * Client-side router that picks CreatorView vs recipient view. The server
 * authoritatively decides whether this device is the creator (via the device
 * key cookie bound at createJob time) and returns creatorParticipantId when
 * so. We fall back to a localStorage check for plans created before the
 * server-side binding existed.
 */
export function InviteRouter({ token, initial }: { token: string; initial: InvitePreview }) {
  // On first render we trust the server-rendered initial preview (no flash of
  // wrong content): if the server told us we're the creator, go straight there.
  const serverCreator = initial.creatorParticipantId;
  const [mode, setMode] = useState<'creator' | 'recipient'>(serverCreator ? 'creator' : 'recipient');
  const [creatorId, setCreatorId] = useState<string | null>(serverCreator);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // If the server didn't recognise this device as the creator (e.g. pre-DB
    // plan from localStorage, or the memory store was reset), check localStorage
    // as a backstop.
    if (!serverCreator) {
      const created = getCreatedInvite(token);
      if (created?.creatorParticipantId) {
        setCreatorId(created.creatorParticipantId);
        setMode('creator');
      }
    } else {
      // Make sure localStorage remembers this plan too, so "My plans" works
      // across cold starts even before the server returns /mine.
      rememberCreatedInvite({
        token,
        jobId: initial.job.id,
        title: initial.job.title,
        createdAt: new Date().toISOString(),
        shareUrl: `/j/${token}/share`,
        creatorParticipantId: serverCreator,
      });
    }
    // Strip any lingering ?creatorId= / ?title= / etc. search params out of
    // the URL so the invite token isn't accidentally leaked via referrers.
    const url = new URL(window.location.href);
    if (url.search) {
      url.search = '';
      window.history.replaceState({}, '', url.toString());
    }
    setHydrated(true);
  }, [token, serverCreator, initial.job.id, initial.job.title]);

  if (!hydrated && mode === 'recipient') {
    // Show the recipient shell immediately; we'll swap to CreatorView after
    // mount only if localStorage says so (for pre-DB plans). Server-recognised
    // creators already render in creator mode on first paint.
    return <RecipientView token={token} initial={initial} />;
  }

  if (mode === 'creator' && creatorId) {
    return (
      <main>
        <CreatorHeader preview={initial} />
        <CreatorView token={token} initial={initial} creatorId={creatorId} />
      </main>
    );
  }

  return <RecipientView token={token} initial={initial} />;
}

function RecipientView({ token, initial }: { token: string; initial: InvitePreview }) {
  return (
    <main>
      <p className="muted" style={{ marginTop: 0 }}>
        <span className="badge" style={{ background: '#0f766e' }}>Shared plan</span>{' '}
        From {initial.job.participants.find((p) => p.role === 'creator')?.displayName ?? 'someone'}
      </p>
      <h1 style={{ marginBottom: 8 }}>{initial.job.title}</h1>
      <StatusLine status={initial.job.status} />

      <section className="card">
        <h3 style={{ marginTop: 0 }}>What we discussed</h3>
        {initial.currentVersion.fields.length === 0 ? (
          <p className="muted">The sender hasn't filled in details yet.</p>
        ) : (
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {initial.currentVersion.fields.map((f) => (
              <li key={f.key} style={{ marginBottom: 6 }}>
                <strong>{f.label}:</strong> {f.valueDisplay ?? f.valueRaw ?? '—'}
              </li>
            ))}
          </ul>
        )}
        <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
          Version {initial.currentVersion.number} · {new Date(initial.currentVersion.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      </section>

      {initial.versions.length > 1 && (
        <section className="card" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <strong>Plan updated.</strong>{' '}
          <span className="muted">
            There {initial.versions.length === 2 ? 'is' : 'are'} {initial.versions.length - 1} prior {initial.versions.length - 1 === 1 ? 'version' : 'versions'}.
            Everyone needs to re-confirm the latest version.
          </span>
        </section>
      )}

      {initial.changes.length > 0 && (
        <section className="card" style={{ background: '#f8fafc' }}>
          <h3 style={{ marginTop: 0 }}>Messages on this plan</h3>
          <ul style={{ paddingLeft: 0, margin: 0, listStyle: 'none' }}>
            {initial.changes.map((c) => (
              <li key={c.id} style={{ padding: '8px 0', borderTop: '1px solid var(--nwa-color-border)' }}>
                <div style={{ fontSize: 13, color: 'var(--nwa-color-text-muted)' }}>
                  <strong style={{ color: c.kind === 'question' ? '#b45309' : '#b91c1c' }}>
                    {c.kind === 'question' ? 'Question' : 'Wants to change'}
                  </strong>{' '}
                  from {c.authorName} · {new Date(c.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
                <div style={{ marginTop: 4 }}>{c.comment}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AckList acknowledgements={initial.currentVersion.acknowledgements} participants={initial.job.participants} />

      <div className="honesty">
        Take a moment. If something here isn't what you expected, tap "Something needs to change" — the sender will see your note. <strong>Silence isn't agreement.</strong>
      </div>

      <InviteClient token={token} initial={initial} />

      <p className="footer">
        Link expires {new Date(initial.invite.expiresAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}.
        Taking more time is always fine — nothing happens until you tap something.
      </p>
    </main>
  );
}

function CreatorHeader({ preview }: { preview: InvitePreview }) {
  const sender = preview.job.participants.find((p: { role: string }) => p.role === 'creator');
  return (
    <>
      <p className="muted" style={{ marginTop: 0 }}>
        <span className="badge" style={{ background: '#155eef' }}>You started this</span>
        {' '}sent from {sender?.displayName ?? 'you'}
      </p>
      <h1 style={{ marginBottom: 8 }}>{preview.job.title}</h1>
      <StatusLine status={preview.job.status} />
    </>
  );
}

function StatusLine({ status }: { status: string }) {
  const label = statusLabel(status);
  return (
    <p className="muted" style={{ marginTop: 0 }}>
      <span className="badge" style={statusBadgeStyle(status)}>{label}</span>
    </p>
  );
}

function statusLabel(s: string) {
  switch (s) {
    case 'invited': return 'Waiting for the other person';
    case 'ready_for_review': return 'Ready for review';
    case 'clarification_needed': return 'Question asked';
    case 'partially_acknowledged': return 'One person has responded';
    case 'mutually_acknowledged': return 'You both saw this version';
    default: return s;
  }
}

function statusBadgeStyle(s: string): React.CSSProperties {
  if (s === 'mutually_acknowledged') return { background: '#0f766e' };
  if (s === 'clarification_needed') return { background: '#b45309' };
  if (s === 'partially_acknowledged') return { background: '#1d4ed8' };
  return { background: '#475569' };
}

function AckList({
  acknowledgements,
  participants,
}: {
  acknowledgements: { id: string; participantId: string; action: string; comment: string | null; createdAt: string }[];
  participants: { id: string; displayName: string }[];
}) {
  if (acknowledgements.length === 0) return null;
  return (
    <section className="card" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
      <h3 style={{ marginTop: 0 }}>Responses</h3>
      <ul style={{ paddingLeft: 20, margin: 0 }}>
        {acknowledgements.map((a) => {
          const who = participants.find((p) => p.id === a.participantId)?.displayName ?? 'Someone';
          const verb =
            a.action === 'reviewed' ? 'has seen and agrees with this version'
            : a.action === 'question' ? 'asked a question'
            : a.action === 'disagree' ? 'sees it differently'
            : a.action === 'need_time' ? 'needs more time'
            : 'withdrew';
          return (
            <li key={a.id} style={{ marginBottom: 6 }}>
              <strong>{who}</strong> {verb}.
              {a.comment ? <blockquote style={{ margin: '4px 0 0', paddingLeft: 12, borderLeft: '3px solid #bae6fd', color: 'var(--nwa-color-text-muted)' }}>{a.comment}</blockquote> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
