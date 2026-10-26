'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { rememberCreatedInvite } from '@/lib/storage';

function ShareContent() {
  const params = useParams<{ token: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const token = params?.token;
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = `${origin}/j/${token}`;
  const title = search.get('title') ?? 'A shared plan';
  const jobId = search.get('jobId') ?? '';
  const creatorId = search.get('creatorId') ?? '';

  useEffect(() => {
    if (!token) { router.replace('/'); return; }
    if (jobId) {
      rememberCreatedInvite({ token, jobId, title, createdAt: new Date().toISOString(), shareUrl: url, creatorParticipantId: creatorId });
    }
  }, [token, jobId, title, url, creatorId, router]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const el = document.getElementById('invite-url') as HTMLInputElement | null;
      el?.select();
    }
  }

  function shareOnWhatsApp() {
    const text = encodeURIComponent(
      `I started a shared plan for the work we talked about on NaWeAgree — "${title}". Tap to see what I wrote and say if anything needs to change: ${url}`,
    );
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  }

  return (
    <main>
      <h1>Plan created</h1>
      <p className="muted">Send this link to the person you're working with. They don't need the app yet — it opens as a web page they can read in one tap.</p>

      <div className="card">
        <p style={{ marginTop: 0, marginBottom: 4, fontSize: 14, color: 'var(--nwa-color-text-muted)' }}>Plan</p>
        <p style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 600 }}>{title}</p>
        <p style={{ marginTop: 0, marginBottom: 8, fontSize: 14, color: 'var(--nwa-color-text-muted)' }}>Share link</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input id="invite-url" readOnly value={url} style={{ flex: 1, padding: '12px 14px', fontSize: 15, border: '1px solid var(--nwa-color-border)', borderRadius: 10, background: '#fff' }} />
          <button className="btn" onClick={copy} style={{ padding: '12px 18px' }}>{copied ? 'Copied!' : 'Copy'}</button>
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={shareOnWhatsApp}>Send on WhatsApp</button>
          <a className="btn" style={{ background: '#475569', textDecoration: 'none', display: 'inline-block' }} href={`/j/${token}`}>Preview what they'll see</a>
          <Link className="btn" style={{ background: '#64748b', textDecoration: 'none', display: 'inline-block' }} href="/plans">Go to my plans</Link>
        </div>
      </div>

      <div className="card" style={{ background: '#fff8e1', border: '1px solid #f59e0b' }}>
        <strong>What happens next.</strong>
        <ul style={{ paddingLeft: 20, margin: '8px 0 0' }}>
          <li>They open the link and see the plan.</li>
          <li>They can confirm, ask a question, or tap "something needs to change".</li>
          <li>You'll see their response when you open this link again or visit "My plans". No more "I thought you said…".</li>
        </ul>
      </div>
    </main>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={<main><p className="muted">Loading…</p></main>}>
      <ShareContent />
    </Suspense>
  );
}
