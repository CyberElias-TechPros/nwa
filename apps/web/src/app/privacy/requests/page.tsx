'use client';

import { useEffect, useState } from 'react';
import { api, ApiQueuedError } from '@/lib/api';

type Req = { id: string; kind: 'export' | 'delete'; status: 'pending' | 'ready' | 'completed' | 'rejected'; createdAt: string; payload?: unknown };

export default function PrivacyPage() {
  const [requests, setRequests] = useState<Req[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    try {
      const data = await api.listPrivacyRequests();
      setRequests(data.requests as Req[]);
    } catch {
      // offline / error — leave list as-is
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function request(kind: 'export' | 'delete') {
    setBusy(kind);
    setMsg(null);
    try {
      await api.requestPrivacy(kind);
      setMsg(kind === 'export'
        ? 'Export prepared — it\'s listed below.'
        : 'Deletion processed.');
      await refresh();
    } catch (e) {
      if (e instanceof ApiQueuedError) {
        setMsg('Saved on this device — will send when you\'re back online.');
      } else {
        setMsg('Something went wrong. Try again.');
      }
    } finally {
      setBusy(null);
    }
  }

  async function download(id: string) {
    window.location.href = `/api/proxy/v1/privacy/requests/${id}`;
  }

  return (
    <main>
      <p className="eyebrow">Your data</p>
      <h1 className="display-title" style={{ marginBottom: 'var(--space-3)' }}>
        Your data, your call
      </h1>
      <p className="lead" style={{ marginBottom: 'var(--space-6)' }}>
        NDPR (Nigeria Data Protection Regulation) gives you rights over data we hold about you. There&apos;s no need to email anyone — use the buttons below.
      </p>

      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Download everything</h3>
        <p className="muted" style={{ marginBottom: 'var(--space-4)' }}>
          Get a JSON file of every plan you started or joined on this device.
        </p>
        <button className="btn btn-primary" disabled={busy === 'export'} onClick={() => request('export')}>
          {busy === 'export' ? 'Preparing…' : 'Download my data'}
        </button>
      </div>

      <div className="card danger">
        <h3 style={{ marginBottom: 6 }}>Delete everything</h3>
        <p className="muted" style={{ marginBottom: 'var(--space-4)' }}>
          Remove your name from all plans tied to this device. This cannot be undone. Active plans will show &quot;Deleted user&quot; where your name was.
        </p>
        <button className="btn" style={{ background: 'var(--nwa-color-danger, #b91c1c)', color: '#fff' }} disabled={busy === 'delete'} onClick={() => request('delete')}>
          {busy === 'delete' ? 'Deleting…' : 'Delete my data'}
        </button>
      </div>

      {msg ? <p role="status" style={{ marginTop: 'var(--space-4)' }}>{msg}</p> : null}

      {requests.length > 0 ? (
        <>
          <h2 style={{ marginTop: 'var(--space-7)', marginBottom: 'var(--space-3)' }}>Your requests</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {requests.map((r) => (
              <li key={r.id} className="card flat">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <strong>{r.kind === 'export' ? 'Export' : 'Delete'}</strong>
                    {' · '}
                    <span className="badge">{r.status}</span>
                    <div className="muted">{new Date(r.createdAt).toLocaleString()}</div>
                  </div>
                  {r.kind === 'export' && r.status === 'ready' ? (
                    <button className="btn btn-primary sm" onClick={() => download(r.id)}>Download file</button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </main>
  );
}
