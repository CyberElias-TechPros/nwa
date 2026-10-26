/**
 * In-memory repository adapter.
 *
 * Wraps the existing synchronous in-memory store in promises so it satisfies
 * the JobRepository interface. A future pgRepository will implement the same
 * interface against Postgres; routes don't care which they get.
 *
 * Device-key binding, authorisation checks, and invite rotation live here
 * directly (rather than threading through the legacy store.ts which is
 * frozen at the pre-DB interface shape).
 */
import { publicId, inviteToken } from '../platform/ids.js';
import {
  JobStatus,
  type JobId,
  type ParticipantId,
  type JobAggregate,
  type JobVersion,
  type Acknowledgement,
  type Participant,
} from '@nwa/domain';
import {
  acknowledge as memAcknowledge,
  addChangeRequest as memAddChange,
  claimInvite as memClaimInvite,
  createJob as memCreate,
  getJob as memGet,
  listAllJobRows,
  listChangeRequests as memListChanges,
  listJobsForCreator as memListForCreator,
  listVersions as memListVersions,
  publishNewVersion as memPublishVersion,
  resolveInvite as memResolve,
  __resetStore,
} from '../modules/jobs/store.js';
import type {
  AddChangeInput,
  AcknowledgeInput,
  AuthzInput,
  ChangeRequest,
  ClaimInviteInput,
  CreateJobInput,
  Invite,
  JobRepository,
  JobRow,
  NewVersionInput,
} from './repository.js';

export function createMemoryRepository(): JobRepository {
  // Device bindings: participantId -> deviceKey. Participants are bound on
  // create/claim. Server-side checks verify the bound key on actions.
  const bindings = new Map<ParticipantId, string>();
  // Revoked tokens we keep around to give a distinct error.
  const revokedTokens = new Set<string>();

  function bind(pid: ParticipantId, dk: string | undefined) {
    if (dk) bindings.set(pid, dk);
  }

  function nowIso() { return new Date().toISOString(); }

  // Stamp adapter-level deviceKey bindings onto the aggregate's participants
  // so server-side lookups (e.g. "which participant is this device?") work.
  // We mutate the participant objects directly; the adapter is the sole owner
  // of these in-memory aggregates so that's safe.
  function stampBindings(participants: Participant[]) {
    for (const p of participants) {
      const dk = bindings.get(p.id);
      if (dk) (p as Participant & { deviceKey?: string | null }).deviceKey = dk;
    }
  }

  return {
    async createJob(input: CreateJobInput) {
      const out = memCreate(input);
      bind(out.creatorId, input.deviceKey);
      // Stamp deviceKey on the creator participant so authorise() / myParticipantId
      // detection works against the in-memory aggregate (which is otherwise unaware
      // of device bindings, because those live in the adapter-level bindings map).
      const creatorPart = out.job.participants.find((p) => p.id === out.creatorId);
      if (creatorPart && input.deviceKey) (creatorPart as Participant & { deviceKey?: string | null }).deviceKey = input.deviceKey;
      return out;
    },

    async getJob(id: JobId): Promise<JobRow | null> {
      const r = memGet(id);
      if (r) stampBindings(r.job.participants);
      return r;
    },

    async resolveInvite(token: string) {
      if (revokedTokens.has(token)) return { error: 'revoked' as const };
      const r = memResolve(token);
      if ('error' in r) return r;
      stampBindings(r.row.job.participants);
      return r;
    },

    async listJobsForDevice(deviceKey: string): Promise<JobAggregate[]> {
      // Walk every in-memory job and check whether the requesting device is bound
      // to any of its participants. Linear scan is fine — memory adapter is for
      // tests/dev only and the dataset is tiny.
      const out: JobAggregate[] = [];
      for (const row of listAllJobRows()) {
        stampBindings(row.job.participants);
        const bound = row.job.participants.some((p) => (p as Participant & { deviceKey?: string | null }).deviceKey === deviceKey);
        if (bound) out.push(row.job);
      }
      return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async listJobsForCreator(creatorId: ParticipantId): Promise<JobAggregate[]> {
      return memListForCreator(creatorId);
    },

    async authorise(input: AuthzInput): Promise<Participant | null> {
      const bound = bindings.get(input.participantId);
      if (bound && bound !== input.deviceKey) return null;
      const row = memGet(input.jobId);
      if (!row) return null;
      const p = row.job.participants.find((pp) => pp.id === input.participantId);
      return p ?? null;
    },

    async acknowledge(input: AcknowledgeInput): Promise<{ job: JobAggregate; ack: Acknowledgement }> {
      return memAcknowledge(input);
    },

    async addChangeRequest(input: AddChangeInput): Promise<ChangeRequest> {
      return memAddChange(input) as ChangeRequest;
    },

    async claimInvite(token: string, { displayName, deviceKey }: ClaimInviteInput) {
      const res = memResolve(token);
      if ('error' in res) return res;
      const { row, invite } = res;

      // If this invite is already claimed, enforce device binding.
      if (invite.toParticipantId) {
        const existing = row.job.participants.find((p) => p.id === invite.toParticipantId);
        if (existing) {
          const boundDk = bindings.get(existing.id);
          if (boundDk && deviceKey && boundDk === deviceKey) {
            return { row, invite, participant: existing };
          }
          return { error: 'already_claimed' as const };
        }
      }

      // Same device already on this job (e.g. opening a refreshed invite link) →
      // bind the invite to that existing participant instead of creating a dupe.
      if (deviceKey) {
        for (const [pid, dk] of bindings.entries()) {
          if (dk !== deviceKey) continue;
          const sameDevice = row.job.participants.find((p) => p.id === pid);
          if (sameDevice) {
            invite.toParticipantId = sameDevice.id;
            invite.toDisplayName = sameDevice.displayName;
            row.job.status = 'ready_for_review';
            row.job.updatedAt = nowIso();
            return { row, invite, participant: sameDevice };
          }
        }
      }

      const out = memClaimInvite(token, displayName);
      if ('error' in out) return out;
      bind(out.participant.id, deviceKey);
      if (deviceKey) (out.participant as Participant & { deviceKey?: string | null }).deviceKey = deviceKey;
      return out;
    },

    async listChangeRequests(jobId: JobId): Promise<ChangeRequest[]> {
      return memListChanges(jobId) as ChangeRequest[];
    },

    async publishNewVersion(input: NewVersionInput): Promise<{ job: JobAggregate; version: JobVersion }> {
      return memPublishVersion(input);
    },

    async listVersions(jobId: JobId): Promise<JobVersion[]> {
      return memListVersions(jobId);
    },

    async rotateInvite(jobId: JobId, actorParticipantId: ParticipantId) {
      const row = memGet(jobId);
      if (!row) return { error: 'not_found' as const };
      const actor = row.job.participants.find((p) => p.id === actorParticipantId);
      if (!actor || actor.role !== 'creator') return { error: 'unauthorized' as const };
      // Capture the current active invite token before revoking.
      const currentActive = [...row.invites].reverse().find((i) => !i.revokedAt);
      const oldToken = currentActive?.token ?? '';
      for (const inv of row.invites) {
        if (!inv.revokedAt) {
          inv.revokedAt = nowIso();
          revokedTokens.add(inv.token);
        }
      }
      const newInvite: Invite = {
        token: inviteToken(),
        jobId,
        toRole: 'provider',
        toDisplayName: undefined,
        toParticipantId: undefined,
        createdAt: nowIso(),
        expiresAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
        revokedAt: undefined,
      };
      row.invites.push(newInvite);
      row.job.updatedAt = nowIso();
      return { oldToken, newInvite };
    },

    async listStaleJobs(olderThanMs: number, limit: number) {
      const threshold = Date.now() - olderThanMs;
      const awaiting = new Set<string>([
        JobStatus.invited,
        JobStatus.ready_for_review,
        JobStatus.clarification_needed,
        JobStatus.partially_acknowledged,
      ]);
      const out: NonNullable<ReturnType<typeof memGet>>[] = [];
      for (const row of listAllJobRows()) {
        if (out.length >= limit) break;
        if (!awaiting.has(row.job.status)) continue;
        if (new Date(row.job.updatedAt).getTime() >= threshold) continue;
        stampBindings(row.job.participants);
        out.push(row);
      }
      return out;
    },

    async markStalled(jobId: JobId) {
      const row = memGet(jobId);
      if (!row) return null;
      row.job.status = JobStatus.stalled;
      row.job.updatedAt = nowIso();
      stampBindings(row.job.participants);
      return row.job;
    },

    async __reset(): Promise<void> {
      bindings.clear();
      revokedTokens.clear();
      __resetStore();
    },
  };
}

/** Re-exports for convenience of tests and the future Postgres impl. */
export type { Invite, JobRow };
// Expose id helper so tests and the pg adapter can share IDs.
export { publicId };
