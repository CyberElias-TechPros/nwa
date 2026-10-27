'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, type InvitePreview } from '@/lib/api';
import { getCreatedInvites, getClaimedInvites, type CreatedInvite, type ClaimedInvite } from '@/lib/storage';
// Types are used implicitly via the list return types below.
export type { CreatedInvite, ClaimedInvite };

type ServerJob = InvitePreview['job'];
type Row =
  | { kind: 'created'; job: ServerJob; token: string }
  | { kind: 'claimed'; job: ServerJob; token: string; displayName: string; participantId: string };

/**
 * "My plans" dashboard — shows plans this device is bound to via the server
 * (GET /v1/jobs/mine) plus any tokens saved locally that the server didn't
 * return (e.g. plans created before DB persistence existed, or plans where
 * the server is still in memory-only mode and a restart dropped state).
 */
export default function PlansPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const mine = await api.listMine();
        const localCreated = getCreatedInvites();
        const localClaimed = getClaimedInvites();
        const byId = new Map<string, { job: ServerJob; token: string }>();
        // Server-known jobs — we don't get the token back from /mine alone, so
        // we still cross-reference local invites to find the shareable link.
        for (const job of mine.jobs) byId.set(job.id, { job, token: '' });
        // Fold in local invites to fill in tokens and role info.
        const seen = new Set<string>();
        const out: Row[] = [];
        for (const c of localCreated) {
          const hit = byId.get(c.jobId);
          if (hit) {
            out.push({ kind: 'created', job: hit.job, token: c.token });
            seen.add(c.jobId);
            hit.token = c.token;
          } else {
            // Job not in server (pre-DB plan from localStorage) — we can still
            // link through via the invite token; preview will hydrate below.
            out.push({ kind: 'created', job: { id: c.jobId, title: c.title, status: 'unknown', categoryKey: '', updatedAt: c.createdAt, openChangeCount: 0, openQuestionCount: 0, participants: [] }, token: c.token });
          }
        }
        for (const cl of localClaimed) {
          if (seen.has(cl.jobId)) continue;
          const hit = byId.get(cl.jobId);
          out.push({
            kind: 'claimed',
            job: hit?.job ?? { id: cl.jobId, title: 'Plan', status: 'unknown', categoryKey: '', updatedAt: cl.claimedAt, openChangeCount: 0, openQuestionCount: 0, participants: [] },
            token: cl.token,
            displayName: cl.displayName,
            participantId: cl.participantId,
          });
        }
        // Any server-known jobs we have no local token for — still list them
        // (creator can navigate via job id; we can't deep-link without a token
        // so we surface them as plain entries pointing to /plans for now).
        for (const [jobId, entry] of byId) {
          if (seen.has(jobId)) continue;
          out.push({ kind: 'created', job: entry.job, token: '' });
        }
        if (!cancelled) setRows(out);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <main>
        <h1>Your plans</h1>
        <div role="alert" className="card danger">
          <p style={{ margin: 0 }}>Could not load plans: {error}</p>
        </div>
      </main>
    );
  }
  if (!rows) return <main><p className="muted">Loading…</p></main>;

  if (rows.length === 0) {
    return (
      <main>
        <p className="eyebrow">Dashboard</p>
        <h1 className="display-title" style={{ marginBottom: 'var(--space-3)' }}>Your plans</h1>
        <p className="lead" style={{ marginBottom: 'var(--space-5)' }}>You haven't started or opened any plans yet.</p>
        <p>
          <Link href="/new" className="btn btn-primary">Start your first plan</Link>
        </p>
      </main>
    );
  }

  return (
    <main>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ marginBottom: 4 }}>Your plans</h1>
        <Link href="/new" className="btn btn-primary sm">+ New plan</Link>
      </div>
      <p className="muted" style={{ marginTop: 0, marginBottom: 'var(--space-5)' }}>Plans tied to this device — both plans you started and plans you've opened.</p>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 'var(--space-3)' }}>
        {rows.map((r) => (
          <li key={`${r.kind}-${r.job.id}`}>
            <PlanRow row={r} />
          </li>
        ))}
      </ul>
    </main>
  );
}

function PlanRow({ row }: { row: Row }) {
  const title = row.job.title || 'Untitled plan';
  const roleLabel = row.kind === 'created' ? 'You started this' : `You opened as ${row.displayName}`;
  const { label: statusLabel, tone } = statusMeta(row.job.status);
  const href = row.token ? `/j/${row.token}` : '/plans';
  return (
    <Link href={href as any} className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem' }}>{title}</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={`badge ${tone}`}>{statusLabel}</span>
            <span className="muted" style={{ fontSize: 13 }}>{roleLabel}</span>
          </div>
        </div>
        <span aria-hidden style={{ color: 'var(--nwa-color-text-muted)', fontSize: 20 }}>→</span>
      </div>
    </Link>
  );
}

function statusMeta(s: string): { label: string; tone: string } {
  switch (s) {
    case 'mutually_acknowledged': return { label: 'Agreed ✓', tone: 'success' };
    case 'in_progress': return { label: 'In progress', tone: 'success' };
    case 'clarification_needed': return { label: 'Question open', tone: 'warning' };
    case 'partially_acknowledged': return { label: 'One person replied', tone: '' };
    case 'ready_for_review': return { label: 'Waiting on them', tone: '' };
    case 'invited': return { label: 'Invite sent', tone: '' };
    case 'stalled': return { label: 'Stalled', tone: 'danger' };
    case 'unknown': return { label: 'Saved on this device', tone: '' };
    default: return { label: s.replace(/_/g, ' '), tone: '' };
  }
}
