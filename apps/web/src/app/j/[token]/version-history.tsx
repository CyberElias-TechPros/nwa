'use client';

import { useState, useMemo } from 'react';
import type { VersionView, InvitePreview, Ack } from '@/lib/api';

/**
 * Collapsible version history panel.
 *
 * T-W3 (gap G10): each version card now surfaces the author name, the
 * change reason, a tiny status chip (current / superseded), and a simple
 * field-level diff against the previous version so readers can see exactly
 * what changed and why without having to compare two paragraphs in their
 * head. Older versions are immutable; we show them as read-only history.
 */
export function VersionHistory({ versions, participants }: { versions: VersionView[]; participants: InvitePreview['job']['participants'] }) {
  const [open, setOpen] = useState(false);
  // Hooks must be called unconditionally. Compute maps even if the panel
  // will be hidden; it's cheap and keeps hook order stable.
  const sorted = useMemo(() => [...versions].sort((a, b) => b.number - a.number), [versions]);
  const byId = useMemo(() => new Map(sorted.map((v) => [v.id, v])), [sorted]);
  const nameOf = (pid: string | null) => participants.find((p) => p.id === pid)?.displayName ?? 'Someone';
  if (versions.length === 0) return null;

  return (
    <section className="card" style={{ background: '#f8fafc' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          all: 'unset', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center',
        }}
        aria-expanded={open}
      >
        <h3 style={{ margin: 0 }}>Version history</h3>
        <span style={{ color: 'var(--nwa-color-text-muted)' }}>{open ? '▴' : '▾'}</span>
      </button>
      {!open && (
        <p className="muted" style={{ margin: '8px 0 0', fontSize: 13 }}>
          {sorted.length} version{sorted.length === 1 ? '' : 's'} so far. Everyone must re-confirm when a new version is posted.
        </p>
      )}
      {open && (
        <ol style={{ listStyle: 'none', padding: 0, margin: '12px 0 0' }}>
          {sorted.map((v, i) => {
            const prev = v.parentVersionId ? byId.get(v.parentVersionId) : undefined;
            const isCurrent = i === 0;
            return (
              <li
                key={v.id}
                style={{
                  borderLeft: `3px solid ${isCurrent ? '#0f766e' : '#cbd5e1'}`,
                  padding: '4px 0 16px 12px',
                  marginLeft: 4,
                }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <strong>Version {v.number}</strong>
                  {isCurrent ? (
                    <span className="badge" style={{ background: '#0f766e', fontSize: 11 }}>Current</span>
                  ) : v.status === 'superseded' ? (
                    <span className="badge" style={{ background: '#94a3b8', fontSize: 11 }}>Superseded</span>
                  ) : null}
                  <span style={{ fontSize: 13, color: 'var(--nwa-color-text-muted)' }}>
                    by {nameOf(v.authorParticipantId)} · {new Date(v.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                {v.reason ? (
                  <p style={{ margin: '4px 0 6px', fontStyle: 'italic', color: '#475569' }}>“{v.reason}”</p>
                ) : null}
                {prev ? (
                  <FieldDiff prev={prev} next={v} />
                ) : (
                  <ul style={{ paddingLeft: 18, margin: '6px 0 0' }}>
                    {v.fields.length === 0 ? (
                      <li className="muted" style={{ fontSize: 13 }}>No details filled in yet.</li>
                    ) : (
                      v.fields.map((f) => (
                        <li key={f.key}><strong>{f.label}:</strong> {f.valueDisplay ?? f.valueRaw ?? '—'}</li>
                      ))
                    )}
                  </ul>
                )}
                {v.acknowledgements.length > 0 && (
                  <div style={{ fontSize: 13, color: '#0f766e', marginTop: 6 }}>
                    {v.acknowledgements.length} {v.acknowledgements.length === 1 ? 'response' : 'responses'} on this version:{' '}
                    {v.acknowledgements.map((a) => `${nameOf(a.participantId)} ${verbFor(a.action)}`).join(' · ')}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function verbFor(a: Ack['action']) {
  switch (a) {
    case 'reviewed': return 'agreed';
    case 'question': return 'asked a question';
    case 'disagree': return 'disagreed';
    case 'need_time': return 'needs more time';
    case 'withdrawn': return 'withdrew';
    default: return 'responded';
  }
}

interface FieldDiffProps {
  prev: VersionView;
  next: VersionView;
}

/**
 * Very lightweight field-level diff. We match by field key and show:
 *   - added fields
 *   - removed fields
 *   - changed fields (old → new).
 * No word-diff inside a field value for now — keeps the output readable
 * without turning the card into a patch view.
 */
function FieldDiff({ prev, next }: FieldDiffProps) {
  const prevMap = new Map(prev.fields.map((f) => [f.key, f]));
  const nextMap = new Map(next.fields.map((f) => [f.key, f]));
  const added = next.fields.filter((f) => !prevMap.has(f.key));
  const removed = prev.fields.filter((f) => !nextMap.has(f.key));
  const changed = next.fields
    .map((f) => {
      const p = prevMap.get(f.key);
      if (!p) return null;
      const pVal = p.valueDisplay ?? p.valueRaw ?? '';
      const nVal = f.valueDisplay ?? f.valueRaw ?? '';
      if (pVal === nVal) return null;
      return { field: f, prev: pVal, next: nVal };
    })
    .filter(Boolean) as { field: VersionView['fields'][number]; prev: string; next: string }[];
  const unchanged = next.fields.filter((f) => {
    const p = prevMap.get(f.key);
    if (!p) return false;
    return (p.valueDisplay ?? p.valueRaw ?? '') === (f.valueDisplay ?? f.valueRaw ?? '');
  });

  if (added.length === 0 && removed.length === 0 && changed.length === 0) {
    return <p className="muted" style={{ fontSize: 13, margin: '6px 0 0' }}>No details changed.</p>;
  }

  return (
    <ul style={{ paddingLeft: 18, margin: '6px 0 0', fontSize: 14 }}>
      {added.map((f) => (
        <li key={`add:${f.key}`} style={{ color: '#166534' }}>
          <strong>+ {f.label}:</strong> {f.valueDisplay ?? f.valueRaw ?? '—'}
        </li>
      ))}
      {removed.map((f) => (
        <li key={`del:${f.key}`} style={{ color: '#991b1b', textDecoration: 'line-through' }}>
          <strong>- {f.label}:</strong> {f.valueDisplay ?? f.valueRaw ?? '—'}
        </li>
      ))}
      {changed.map(({ field, prev: pv, next: nv }) => (
        <li key={`chg:${field.key}`}>
          <strong>~ {field.label}:</strong>{' '}
          <span style={{ textDecoration: 'line-through', color: '#991b1b' }}>{pv || '—'}</span>
          {' → '}
          <span style={{ color: '#166534' }}>{nv || '—'}</span>
        </li>
      ))}
      {unchanged.length > 0 && (
        <li className="muted" style={{ fontSize: 13, listStyle: 'none', marginLeft: -18, marginTop: 4 }}>
          {unchanged.length} field{unchanged.length === 1 ? '' : 's'} stayed the same.
        </li>
      )}
    </ul>
  );
}

