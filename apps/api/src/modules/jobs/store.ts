/**
 * In-memory job store for W0–W2 prototyping.
 *
 * Swapped for Postgres/Kysely in W2 (T-W2-01). Keep interface stable so route
 * handlers don't change. State is per-Worker-isolate and lost on deploy.
 */
import { publicId, inviteToken } from '../../platform/ids.js';
import type {
  JobId,
  VersionId,
  ParticipantId,
  JobAggregate,
  JobVersion,
  Participant,
  AckAction,
  Acknowledgement,
  ChangeRequestId,
} from '@nwa/domain';

export interface CreateJobInput {
  title: string;
  categoryKey: string;
  creatorName: string;
  initialNotes?: string;
}

export interface Invite {
  token: string;
  jobId: JobId;
  toParticipantId?: ParticipantId;
  toRole: 'customer' | 'provider';
  toDisplayName?: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
}

export interface ChangeRequest {
  id: ChangeRequestId;
  jobId: JobId;
  versionId: VersionId;
  authorParticipantId: ParticipantId;
  kind: 'question' | 'change';
  comment: string;
  proposedFields?: { key: string; value: string }[];
  createdAt: string;
}

interface JobRow {
  job: JobAggregate;
  versions: JobVersion[];
  invites: Invite[];
  changes: ChangeRequest[];
}

const state = new Map<JobId, JobRow>();
const inviteIndex = new Map<string, JobId>();

function nowIso() {
  return new Date().toISOString();
}

function makeInitialVersion(jobId: JobId, authorId: ParticipantId, notes?: string): JobVersion {
  const id = publicId('ver', 14) as VersionId;
  return {
    id,
    jobId,
    number: 1,
    authorParticipantId: authorId,
    schemaVersion: '1.0',
    templateVersion: 'plain-1',
    fields: notes
      ? [
          {
            key: 'notes',
            label: 'What we talked about',
            valueRaw: notes,
            valueDisplay: notes,
            status: 'proposed',
            certainty: 'exact',
            visibility: 'shared',
            material: false,
            updatedAt: nowIso(),
          },
        ]
      : [],
    contentDigest: `v1:${notes ?? ''}`,
    status: 'published',
    acknowledgements: [],
    createdAt: nowIso(),
  };
}

export function createJob(input: CreateJobInput): { job: JobAggregate; invite: Invite; creatorId: ParticipantId } {
  const jobId = publicId('job', 14) as JobId;
  const creatorId = publicId('p', 12) as ParticipantId;
  const creator: Participant = {
    id: creatorId,
    displayName: input.creatorName || 'You',
    role: 'creator',
    state: 'active',
    joinedAt: nowIso(),
  };
  const version = makeInitialVersion(jobId, creatorId, input.initialNotes);
  const invite: Invite = {
    token: inviteToken(),
    jobId,
    toRole: 'provider',
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
  };
  const job: JobAggregate = {
    id: jobId,
    title: input.title,
    categoryKey: input.categoryKey,
    status: 'invited',
    currentVersionId: version.id,
    jobSeq: 1,
    currencyCode: null,
    participants: [creator],
    currentVersion: version,
    openChangeCount: 0,
    openQuestionCount: 0,
    capabilities: {},
    updatedAt: nowIso(),
  };
  state.set(jobId, { job, versions: [version], invites: [invite], changes: [] });
  inviteIndex.set(invite.token, jobId);
  return { job, invite, creatorId };
}

export function getJob(id: JobId): JobRow | null {
  return state.get(id) ?? null;
}

/** Test/dev helper: every job row currently in the in-memory store. */
export function listAllJobRows(): JobRow[] {
  return [...state.values()];
}

export function resolveInvite(token: string): { row: JobRow; invite: Invite } | { error: 'expired' | 'revoked' | 'missing' } {
  const jobId = inviteIndex.get(token);
  if (!jobId) return { error: 'missing' };
  const row = state.get(jobId);
  if (!row) return { error: 'missing' };
  const invite = row.invites.find((i) => i.token === token);
  if (!invite) return { error: 'missing' };
  if (invite.revokedAt) return { error: 'revoked' };
  if (new Date(invite.expiresAt).getTime() < Date.now()) return { error: 'expired' };
  return { row, invite };
}

export function listJobsForCreator(creatorId: ParticipantId): JobAggregate[] {
  const out: JobAggregate[] = [];
  for (const row of state.values()) {
    if (row.job.participants.some((p) => p.id === creatorId)) out.push(row.job);
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * Record an acknowledgement on the current version.
 * Returns the updated aggregate.
 */
export function acknowledge(input: {
  jobId: JobId;
  participantId: ParticipantId;
  action: AckAction;
  comment?: string;
}): { job: JobAggregate; ack: Acknowledgement } {
  const row = state.get(input.jobId);
  if (!row) throw new Error('job not found');
  const current = row.versions.find((v) => v.id === row.job.currentVersionId);
  if (!current) throw new Error('no current version');
  // Replace any prior ack on this version by this participant (idempotent).
  current.acknowledgements = current.acknowledgements.filter((a) => a.participantId !== input.participantId);
  const ack: Acknowledgement = {
    id: publicId('ack', 12),
    versionId: current.id,
    participantId: input.participantId,
    action: input.action,
    comment: input.comment ?? null,
    createdAt: nowIso(),
  };
  current.acknowledgements.push(ack);
  // Recompute job status.
  const ackedParticipants = new Set(current.acknowledgements.filter((a) => a.action === 'reviewed').map((a) => a.participantId));
  const activeParticipants = row.job.participants.filter((p) => p.state === 'active');
  if (ackedParticipants.size === activeParticipants.length && activeParticipants.length >= 2) {
    row.job.status = 'mutually_acknowledged';
  } else if (ackedParticipants.size > 0) {
    row.job.status = 'partially_acknowledged';
  }
  row.job.updatedAt = nowIso();
  return { job: row.job, ack };
}

export function addChangeRequest(input: {
  jobId: JobId;
  versionId: VersionId;
  authorParticipantId: ParticipantId;
  kind: 'question' | 'change';
  comment: string;
}): ChangeRequest {
  const row = state.get(input.jobId);
  if (!row) throw new Error('job not found');
  const cr: ChangeRequest = {
    id: publicId('chg', 12) as ChangeRequestId,
    jobId: input.jobId,
    versionId: input.versionId,
    authorParticipantId: input.authorParticipantId,
    kind: input.kind,
    comment: input.comment,
    createdAt: nowIso(),
  };
  row.changes.push(cr);
  row.job.openChangeCount = row.changes.filter((c) => c.kind === 'change').length;
  row.job.openQuestionCount = row.changes.filter((c) => c.kind === 'question').length;
  row.job.updatedAt = nowIso();
  if (input.kind === 'question') row.job.status = 'clarification_needed';
  else row.job.status = 'partially_acknowledged';
  return cr;
}

/** Claim an invite as a participant (W4: verify phone OTP; now just sets name). */
export function claimInvite(token: string, displayName: string): { row: JobRow; invite: Invite; participant: Participant } | { error: 'expired' | 'revoked' | 'missing' } {
  const res = resolveInvite(token);
  if ('error' in res) return res;
  const { row, invite } = res;
  // If the invite already has a participant, return them (idempotent claim).
  if (invite.toParticipantId) {
    const existing = row.job.participants.find((p) => p.id === invite.toParticipantId);
    if (existing) return { row, invite, participant: existing };
  }
  const participant: Participant = {
    id: publicId('p', 12) as ParticipantId,
    displayName: displayName || 'The other person',
    role: invite.toRole,
    state: 'active',
    joinedAt: nowIso(),
  };
  invite.toParticipantId = participant.id;
  invite.toDisplayName = participant.displayName;
  row.job.participants.push(participant);
  row.job.status = 'ready_for_review';
  row.job.updatedAt = nowIso();
  return { row, invite, participant };
}

export function listChangeRequests(jobId: JobId): ChangeRequest[] {
  const row = state.get(jobId);
  if (!row) return [];
  return [...row.changes].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Publish a new version on the job, superseding the current version.
 * Per ADR-106: the old version stays immutable, its acks do NOT carry
 * forward, and the job returns to 'ready_for_review' so both sides must
 * re-acknowledge. "Silence isn't consent" — no auto-ack for v2.
 */
export interface NewVersionInput {
  jobId: JobId;
  authorParticipantId: ParticipantId;
  reason?: string;
  fields: { key: string; label: string; value: string }[];
}

export function publishNewVersion(input: NewVersionInput): { job: JobAggregate; version: JobVersion } {
  const row = state.get(input.jobId);
  if (!row) throw new Error('job not found');
  const prev = row.versions.find((v) => v.id === row.job.currentVersionId);
  if (!prev) throw new Error('no current version');

  // Supersede previous version.
  prev.status = 'superseded';
  // Reset open question/change counts (they were addressed by this new version).
  row.job.openChangeCount = 0;
  row.job.openQuestionCount = 0;

  const number = prev.number + 1;
  const id = publicId('ver', 14) as VersionId;
  const fields = input.fields.map((f, idx) => ({
    key: f.key || `field_${idx}`,
    label: f.label,
    valueRaw: f.value,
    valueDisplay: f.value,
    status: 'proposed' as const,
    certainty: 'exact' as const,
    visibility: 'shared' as const,
    material: false,
    authorParticipantId: input.authorParticipantId,
    updatedAt: nowIso(),
  }));
  const digest = `v${number}:` + input.fields.map((f) => `${f.key}=${f.value}`).join('|');
  const version: JobVersion = {
    id,
    jobId: input.jobId,
    number,
    parentVersionId: prev.id,
    authorParticipantId: input.authorParticipantId,
    schemaVersion: '1.0',
    templateVersion: 'plain-1',
    fields,
    contentDigest: digest,
    prevDigest: prev.contentDigest,
    reason: input.reason ?? null,
    status: 'published',
    acknowledgements: [],
    createdAt: nowIso(),
  };
  row.versions.push(version);
  row.job.currentVersionId = id;
  row.job.currentVersion = version;
  row.job.status = 'ready_for_review';
  row.job.updatedAt = nowIso();
  row.job.jobSeq = number;
  return { job: row.job, version };
}

/** Version history, newest first. */
export function listVersions(jobId: JobId): JobVersion[] {
  const row = state.get(jobId);
  if (!row) return [];
  return [...row.versions].sort((a, b) => b.number - a.number);
}

/** Test helper. */
export function __resetStore() {
  state.clear();
  inviteIndex.clear();
}
