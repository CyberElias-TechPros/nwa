import Link from 'next/link';
import { InviteRouter } from './invite-router';
import { api, type ApiClientError } from '@/lib/api';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  try {
    const preview = await api.getInvite(token);
    return <InviteRouter token={token} initial={preview} />;
  } catch (err) {
    const e = err as ApiClientError;
    const code = e?.payload?.error?.code ?? 'UNKNOWN';
    const title =
      code === 'INVITATION_EXPIRED' ? 'This invite has expired'
      : code === 'INVITATION_REVOKED' ? 'This invite was cancelled'
      : "We couldn't open that invite";
    const msg = e?.payload?.error?.message ?? 'Ask the person who sent it for a fresh link.';
    return (
      <main>
        <h1>{title}</h1>
        <p>{msg}</p>
        <p className="muted">If the link looks cut off, ask them to send it again or to copy the full link.</p>
        <p><Link href="/">Go home</Link></p>
      </main>
    );
  }
}
