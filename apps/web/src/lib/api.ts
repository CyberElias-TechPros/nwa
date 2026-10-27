/**
 * Thin typed client for the NaWeAgree API.
 *
 * In the browser we talk to the same-origin BFF proxy (/api/proxy/...) so
 * cookies flow, there are no CORS preflights, and the preview host works
 * without extra config. Non-GET requests route through the outbox queue
 * when the browser is offline (see lib/outbox.ts) — they are replayed
 * automatically on reconnect and stamped with an Idempotency-Key header.
 *
 * Server-side calls (Next server components, tests) resolve directly
 * against the API (no outbox, no BFF).
 */

import { smartFetch } from './use-outbox';

function pickBase(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8787';
  }
  return '/api/proxy';
}

const API_BASE = pickBase();
const isBrowser = typeof window !== 'undefined';

export interface ApiError {
  code: string;
  message: string;
  requestId: string;
  retryable: boolean;
  fields?: { path: string; code: string; message?: string }[];
}

export class ApiClientError extends Error {
  constructor(public readonly status: number, public readonly payload: { error: ApiError }) {
    super(payload.error.message);
    this.name = 'ApiClientError';
  }
}

export class ApiQueuedError extends Error {
  constructor() { super('Queued to send when you\'re back online.'); this.name = 'ApiQueuedError'; }
}

async function request<T>(path: string, init: RequestInit & { offlineQueueable?: boolean } = {}): Promise<T> {
  const { offlineQueueable = true, headers: rawHeaders, body, ...rest } = init;
  const method = (rest.method ?? 'GET').toUpperCase();
  const headers: Record<string, string> = { 'content-type': 'application/json', ...(rawHeaders as Record<string, string> | undefined ?? {}) };

  const fetchImpl = isBrowser ? smartFetch : fetch;
  const res = await fetchImpl(`${API_BASE}${path}`, {
    ...rest,
    method,
    credentials: 'include',
    headers,
    body: body as BodyInit | undefined,
    cache: 'no-store',
    offlineQueueable,
  });
  // 202 from the outbox proxy (currently we don't use it — offline path
  // throws above — but kept so future server-side 202 Accepted works).
  if (res.status === 202) {
    const j = await res.json().catch(() => ({})) as { queued?: boolean };
    if (j.queued) throw new ApiQueuedError();
    return j as T;
  }
  const bodyJson = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (bodyJson as { error?: ApiError }).error
      ? (bodyJson as { error: ApiError })
      : { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.', requestId: 'unknown', retryable: false } };
    throw new ApiClientError(res.status, err);
  }
  return bodyJson as T;
}

export interface CreatedJob {
  job: { id: string; title: string; status: string; updatedAt: string };
  invite: { token: string; url: string; expiresAt: string; role: string };
}

export interface Ack {
  id: string;
  participantId: string;
  action: 'reviewed' | 'question' | 'disagree' | 'need_time' | 'withdrawn';
  comment: string | null;
  createdAt: string;
}

export interface VersionView {
  id: string;
  number: number;
  status: 'draft' | 'published' | 'superseded';
  reason: string | null;
  authorParticipantId: string | null;
  parentVersionId: string | null;
  fields: { key: string; label: string; valueRaw: string | null; valueDisplay: string | null }[];
  acknowledgements: Ack[];
  createdAt: string;
}

export interface ChangeEntry {
  id: string;
  kind: 'question' | 'change';
  comment: string;
  authorName: string;
  createdAt: string;
}

export interface InvitePreview {
  invite: { token: string; role: string; expiresAt: string; claimed: boolean; participantName: string | null };
  job: {
    id: string;
    title: string;
    categoryKey: string;
    status: string;
    updatedAt: string;
    openChangeCount: number;
    openQuestionCount: number;
    participants: { id: string; displayName: string; role: string; state: string }[];
  };
  currentVersion: VersionView;
  versions: VersionView[];
  changes: ChangeEntry[];
  /** Participant bound to this device on this job (null if unclaimed from this device). */
  myParticipantId: string | null;
  /** The creator's participant id on this job (only sent when this device IS the creator). */
  creatorParticipantId: string | null;
}

export const api = {
  createJob(input: { title: string; categoryKey?: string; creatorName?: string; initialNotes?: string }): Promise<CreatedJob & { creatorParticipantId: string }> {
    return request<CreatedJob & { creatorParticipantId: string }>('/v1/jobs', { method: 'POST', body: JSON.stringify(input) });
  },
  listMine(): Promise<{ jobs: InvitePreview['job'][] }> {
    return request('/v1/jobs/mine');
  },
  getInvite(token: string): Promise<InvitePreview> {
    return request<InvitePreview>(`/v1/invites/${token}`);
  },
  claimInvite(token: string, displayName: string): Promise<{ participantId: string; status: string }> {
    return request(`/v1/invites/${token}/claim`, { method: 'POST', body: JSON.stringify({ displayName }) });
  },
  ackInvite(token: string, participantId: string, action: Ack['action'], comment?: string): Promise<{ status: string; job: InvitePreview['job']; currentVersion: VersionView }> {
    return request(`/v1/invites/${token}/ack`, { method: 'POST', body: JSON.stringify({ participantId, action, comment }) });
  },
  addChange(token: string, participantId: string, kind: 'question' | 'change', comment: string): Promise<{ status: string }> {
    return request(`/v1/invites/${token}/changes`, { method: 'POST', body: JSON.stringify({ participantId, kind, comment }) });
  },
  publishVersion(jobId: string, participantId: string, fields: { key: string; label: string; value: string }[], reason: string, expectedVersion?: number): Promise<{ job: InvitePreview['job']; version: VersionView; versions: VersionView[] }> {
    return request(`/v1/jobs/${jobId}/versions`, {
      method: 'POST',
      headers: { 'x-participant-id': participantId },
      body: JSON.stringify({ reason, fields, expectedVersion }),
    });
  },
  rotateInvite(jobId: string, participantId: string): Promise<{ oldToken: string; invite: { token: string; url: string; expiresAt: string } }> {
    return request(`/v1/jobs/${jobId}/rotate-invite`, {
      method: 'POST',
      headers: { 'x-participant-id': participantId },
    });
  },
  getVersions(jobId: string): Promise<{ versions: VersionView[] }> {
    return request(`/v1/jobs/${jobId}/versions`);
  },
  /** Download the signed JSON receipt (mutual ack only). Returns the parsed envelope. */
  async getReceipt(jobId: string): Promise<unknown> {
    const res = await fetch(`${API_BASE}/v1/jobs/${jobId}/receipt`, { credentials: 'include' });
    if (!res.ok) throw new ApiClientError(res.status, { error: { code: 'RECEIPT_UNAVAILABLE', message: 'Receipt not available yet.', requestId: '', retryable: false } });
    return res.json();
  },
  /** Trigger a plaintext receipt download in the browser. */
  downloadReceiptTxt(jobId: string) {
    window.location.href = `${API_BASE}/v1/jobs/${jobId}/receipt.txt`;
  },
  /** Download the signed JSON as a file via a temporary anchor. */
  async downloadReceiptJson(jobId: string, filename?: string) {
    const data = await this.getReceipt(jobId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename ?? `naweagree-${jobId}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
  verifyReceipt(envelope: unknown): Promise<{ ok: boolean; reason?: string; payload?: Record<string, unknown> }> {
    return request('/v1/receipts/verify', { method: 'POST', body: JSON.stringify(envelope) });
  },
  reportAbuse(input: { reason: string; description: string; jobId?: string; token?: string; contact?: string }): Promise<{ id: string; status: string }> {
    return request('/v1/abuse/report', { method: 'POST', body: JSON.stringify(input) });
  },
  requestPrivacy(kind: 'export' | 'delete'): Promise<{ request: { id: string; status: string; kind: string } }> {
    return request('/v1/privacy/requests', { method: 'POST', body: JSON.stringify({ kind }) });
  },
  listPrivacyRequests(): Promise<{ requests: { id: string; kind: string; status: string; createdAt: string }[] }> {
    return request('/v1/privacy/requests');
  },
};
