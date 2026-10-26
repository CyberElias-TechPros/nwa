/**
 * Thin typed client for the NaWeAgree API.
 * W4: this goes through the Next.js BFF proxy (same-origin) and attaches the
 * session cookie. For W0 we call the worker directly.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8787';

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (body as { error?: ApiError }).error
      ? (body as { error: ApiError })
      : { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.', requestId: 'unknown', retryable: false } };
    throw new ApiClientError(res.status, err);
  }
  return body as T;
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
};
