'use client';

/**
 * Tiny localStorage wrapper for the prototype. W4 replaces with server-side
 * session + DB. Right now the API store is in-memory and is lost on restart,
 * so we persist tokens client-side so users can find plans they created.
 */

const KEYS = {
  createdInvites: 'nwa.createdInvites.v1',
  claimedParticipation: 'nwa.claimedParticipation.v1',
} as const;

export interface CreatedInvite {
  token: string;
  jobId: string;
  title: string;
  createdAt: string;
  /** Share URL we give the other person */
  shareUrl: string;
}

export interface ClaimedInvite {
  token: string;
  jobId: string;
  participantId: string;
  displayName: string;
  claimedAt: string;
}

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function rememberCreatedInvite(inv: CreatedInvite & { creatorParticipantId?: string }) {
  const list = safeGet<CreatedInvite[]>(KEYS.createdInvites, []);
  const filtered = list.filter((x) => x.token !== inv.token);
  filtered.unshift(inv);
  safeSet(KEYS.createdInvites, filtered.slice(0, 50));
}

export function getCreatedInvite(token: string): (CreatedInvite & { creatorParticipantId?: string }) | undefined {
  return safeGet<CreatedInvite[]>(KEYS.createdInvites, []).find((c) => c.token === token);
}

export function getCreatedInvites(): CreatedInvite[] {
  return safeGet<CreatedInvite[]>(KEYS.createdInvites, []);
}

export function rememberClaimedInvite(inv: ClaimedInvite) {
  const list = safeGet<ClaimedInvite[]>(KEYS.claimedParticipation, []);
  const filtered = list.filter((x) => x.token !== inv.token);
  filtered.unshift(inv);
  safeSet(KEYS.claimedParticipation, filtered.slice(0, 50));
}

export function getClaimedParticipation(token: string): ClaimedInvite | undefined {
  return safeGet<ClaimedInvite[]>(KEYS.claimedParticipation, []).find((c) => c.token === token);
}

export function getClaimedInvites(): ClaimedInvite[] {
  return safeGet<ClaimedInvite[]>(KEYS.claimedParticipation, []);
}

export function removeCreatedInvite(token: string) {
  const list = safeGet<CreatedInvite[]>(KEYS.createdInvites, []).filter((x) => x.token !== token);
  safeSet(KEYS.createdInvites, list);
}
