'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiClientError, ApiQueuedError, type InvitePreview } from '@/lib/api';
import { getClaimedParticipation, rememberClaimedInvite } from '@/lib/storage';
import { VersionHistory } from './version-history';
import { ProposeVersion } from './propose-version';

function errMessage(e: unknown, fallback = 'Try again.'): string {
  if (e instanceof ApiQueuedError) return 'Saved on this device — will send when you\'re back online.';
  if (e instanceof ApiClientError) return e.payload?.error?.message ?? fallback;
  return fallback;
}

export function InviteClient({ token, initial }: { token: string; initial: InvitePreview }) {
  const router = useRouter();
  const stored = getClaimedParticipation(token);
  // The server tells us myParticipantId when this device is already bound to
  // a participant on the job (returning visitor / cookie recognised). We use
  // that to skip the "enter your name" form.
  const serverKnownId = initial.myParticipantId;
  // If myParticipantId comes back and matches a participant, we have their name.
  const serverKnownParticipant = serverKnownId ? initial.job.participants.find((p) => p.id === serverKnownId) : null;
  const [name, setName] = useState(
    serverKnownParticipant?.displayName
    ?? initial.invite.participantName
    ?? stored?.displayName
    ?? '',
  );
  const [claimedId, setClaimedId] = useState<string | null>(serverKnownId ?? stored?.participantId ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showChange, setShowChange] = useState<null | 'question' | 'change'>(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (serverKnownId && !stored) {
      // Persist the server-recognised participant locally so "My plans" works
      // offline / after refresh.
      rememberClaimedInvite({
        token,
        jobId: initial.job.id,
        participantId: serverKnownId,
        displayName: serverKnownParticipant?.displayName ?? name,
        claimedAt: new Date().toISOString(),
      });
    } else if (initial.invite.claimed && initial.invite.participantName && !stored && !serverKnownId) {
      setName(initial.invite.participantName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKnownId]);

  // Auto-refresh every 15s so when the other person responds or publishes a
  // new version this page updates without a manual reload. W9 replaces polling
  // with SSE / web-push.
  useEffect(() => {
    const id = setInterval(() => {
      if (!busy) router.refresh();
    }, 15_000);
    return () => clearInterval(id);
  }, [busy, router]);

  const alreadyMutual = initial.job.status === 'mutually_acknowledged';
  const myAck = claimedId ? initial.currentVersion.acknowledgements.find((a) => a.participantId === claimedId) : null;

  async function claim(e: React.FormEvent) {
    e.preventDefault();
    setBusy('claim');
    setError(null);
    try {
      const res = await api.claimInvite(token, name);
      setClaimedId(res.participantId);
      rememberClaimedInvite({
        token,
        jobId: initial.job.id,
        participantId: res.participantId,
        displayName: name,
        claimedAt: new Date().toISOString(),
      });
      router.refresh();
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function sendAck(action: 'reviewed' | 'question' | 'disagree' | 'need_time') {
    if (!claimedId) return;
    setBusy(action);
    setError(null);
    try {
      if ((action === 'question' || action === 'disagree') && !showChange) {
        setShowChange(action === 'disagree' ? 'change' : 'question');
        setBusy(null);
        return;
      }
      await api.ackInvite(token, claimedId, action, comment || undefined);
      router.refresh();
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function sendComment() {
    if (!claimedId || !showChange) return;
    setBusy('comment');
    setError(null);
    try {
      await api.addChange(token, claimedId, showChange, comment);
      // After recording a question/change, mark a 'question' or 'disagree' ack too.
      await api.ackInvite(token, claimedId, showChange === 'question' ? 'question' : 'disagree', comment);
      setShowChange(null);
      setComment('');
      router.refresh();
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(null);
    }
  }

  if (!claimedId) {
    return (
      <form onSubmit={claim} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0 }}>Your name — this is what the sender sees when you respond:</p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Chinedu"
          minLength={1}
          maxLength={60}
          required
          style={inputStyle}
        />
        {error && <div role="alert" style={{ color: '#b91c1c' }}>{error}</div>}
        <button className="btn" disabled={busy === 'claim' || name.trim().length === 0}>
          {busy === 'claim' ? 'Opening plan…' : 'Open plan'}
        </button>
        <small className="muted">We remember you on this device via a cookie — no passwords or accounts needed. If you open this link on another device, ask the sender for a fresh link.</small>
      </form>
    );
  }

  return (
    <div>
      {error && <div role="alert" className="card" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' }}>{error}</div>}

      {initial.job.status === 'stalled' && (
        <div className="card warning" role="status">
          <strong>No reply for a week.</strong> Try sharing the link again, or nudge them through your usual chat app. If the other person isn't responding, you can also withdraw the plan.
        </div>
      )}
      {(initial.job.status === 'invited' || initial.job.status === 'ready_for_review' || initial.job.status === 'partially_acknowledged') && (
        <p className="muted" style={{ fontSize: 13 }}>Reminders go out automatically 48 hours after the last update. If a week passes without a reply, the plan is marked <em>stalled</em>.</p>
      )}

      {showChange && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{showChange === 'question' ? 'Ask a question' : 'What needs to change?'}</h3>
          <textarea
            autoFocus
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={showChange === 'question' ? 'e.g. Did you mean the ankara with the gold pattern or the blue one?' : 'e.g. I thought we agreed on three yards, not two. Can we adjust?'}
            rows={4}
            style={{ ...inputStyle, resize: 'vertical', width: '100%' }}
            maxLength={2000}
          />
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button className="btn" disabled={busy === 'comment' || comment.trim().length < 2} onClick={sendComment}>
              {busy === 'comment' ? 'Sending…' : 'Send to sender'}
            </button>
            <button className="btn" style={{ background: '#64748b' }} onClick={() => { setShowChange(null); setComment(''); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {alreadyMutual && (
        <>
          <div className="card success">
            <strong style={{ display: 'block', marginBottom: 6 }}>✓ You both reviewed this version.</strong>
            <p className="muted" style={{ margin: 0 }}>
              Save a signed receipt for your records. It's a tamper-evident record of exactly what you agreed and when — not a legal contract, but a shared memory.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <button className="btn teal" onClick={() => api.downloadReceiptJson(initial.job.id, `naweagree-${initial.job.id}-v${initial.currentVersion.number}.json`)}>
                Download signed receipt (JSON)
              </button>
              <button className="btn ghost" onClick={() => api.downloadReceiptTxt(initial.job.id)}>
                Text version
              </button>
            </div>
          </div>
        </>
      )}

      {!alreadyMutual && !showChange && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn"
            disabled={Boolean(busy) || Boolean(myAck && myAck.action === 'reviewed')}
            onClick={() => sendAck('reviewed')}
            title="Tap only if you have read and agree with everything written."
          >
            {myAck?.action === 'reviewed' ? '✓ You agreed' : 'Yes, that\'s what we talked about'}
          </button>
          <button className="btn" style={{ background: '#b45309' }} disabled={Boolean(busy)} onClick={() => sendAck('question')}>
            I have a question
          </button>
          <button className="btn" style={{ background: '#b91c1c' }} disabled={Boolean(busy)} onClick={() => sendAck('disagree')}>
            Something needs to change
          </button>
          <button className="btn" style={{ background: '#475569' }} disabled={Boolean(busy)} onClick={() => sendAck('need_time')}>
            I need more time
          </button>
        </div>
      )}

      <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
        Tapping a button sends your response now. The other person sees it when they open this link. No auto-confirmation, no silence-as-consent.
      </p>

      <div style={{ marginTop: 20 }}>
        <VersionHistory versions={initial.versions && initial.versions.length > 0 ? initial.versions : (initial.currentVersion ? [initial.currentVersion] : [])} participants={initial.job.participants} />
        <ProposeVersion token={token} initial={initial} participantId={claimedId} />
      </div>
    </div>
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
