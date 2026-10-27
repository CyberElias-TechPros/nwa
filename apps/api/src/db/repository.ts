/**
 * Repository (port) — the domain-facing interface to plan storage.
 *
 * Routes depend on this interface, not on a concrete storage backend. Two
 * implementations exist:
 *   - memoryRepository  — the existing in-memory store (default; survives only
 *     until the worker exits). Used for local dev, unit tests, and until the
 *     DATABASE_URL secret is wired up.
 *   - pgRepository      — Postgres via Kysely (T-W2-01). Loaded lazily only
 *     when DATABASE_URL is present.
 *
 * All methods are async so the Postgres impl can do real I/O without any
 * call-site changes.
 */
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
  BriefField,
} from '@nwa/domain';

export interface CreateJobInput {
  title: string;
  categoryKey: string;
  creatorName: string;
  initialNotes?: string;
  /** Device the creator is on — binds the creator participant to it. */
  deviceKey?: string;
}

export interface ClaimInviteInput {
  displayName: string;
  deviceKey: string;
}

export interface AuthzInput {
  jobId: JobId;
  participantId: ParticipantId;
  deviceKey: string;
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

export interface JobRow {
  job: JobAggregate;
  versions: JobVersion[];
  invites: Invite[];
  changes: ChangeRequest[];
}

export interface AcknowledgeInput {
  jobId: JobId;
  participantId: ParticipantId;
  action: AckAction;
  comment?: string;
}

export interface AddChangeInput {
  jobId: JobId;
  versionId: VersionId;
  authorParticipantId: ParticipantId;
  kind: 'question' | 'change';
  comment: string;
}

export interface NewVersionInput {
  jobId: JobId;
  authorParticipantId: ParticipantId;
  reason?: string;
  fields: { key: string; label: string; value: string }[];
}

export interface JobRepository {
  /** Backend tag for health/readiness reports ('memory' | 'postgres'). */
  readonly backend: 'memory' | 'postgres';
  createJob(input: CreateJobInput): Promise<{ job: JobAggregate; invite: Invite; creatorId: ParticipantId }>;
  getJob(id: JobId): Promise<JobRow | null>;
  resolveInvite(token: string): Promise<{ row: JobRow; invite: Invite } | { error: 'expired' | 'revoked' | 'missing' }>;
  listJobsForDevice(deviceKey: string): Promise<JobAggregate[]>;
  listJobsForCreator(creatorId: ParticipantId): Promise<JobAggregate[]>;
  /** Authorise that the given participant is bound to the given deviceKey
   *  for the given job. Returns the participant if authorised, else null. */
  authorise(input: AuthzInput): Promise<Participant | null>;
  acknowledge(input: AcknowledgeInput): Promise<{ job: JobAggregate; ack: Acknowledgement }>;
  addChangeRequest(input: AddChangeInput): Promise<ChangeRequest>;
  claimInvite(token: string, input: ClaimInviteInput): Promise<{ row: JobRow; invite: Invite; participant: Participant } | { error: 'expired' | 'revoked' | 'missing' | 'already_claimed' }>;
  listChangeRequests(jobId: JobId): Promise<ChangeRequest[]>;
  publishNewVersion(input: NewVersionInput): Promise<{ job: JobAggregate; version: JobVersion }>;
  listVersions(jobId: JobId): Promise<JobVersion[]>;
  /** Revoke the invite for this token and issue a fresh one (gap G3 reset-link). */
  rotateInvite(jobId: JobId, actorParticipantId: ParticipantId): Promise<{ oldToken: string; newInvite: Invite } | { error: 'not_found' | 'unauthorized' }>;
  /**
   * W4 reminders: return jobs whose current version was published more than
   * `olderThanMs` milliseconds ago and which are still in an "awaiting
   * response" state (invited, ready_for_review, clarification_needed,
   * partially_acknowledged). The caller uses this to enqueue nudges and to
   * mark jobs `stalled` when they have been idle beyond the stalled threshold.
   */
  listStaleJobs(olderThanMs: number, limit: number): Promise<JobRow[]>;
  /** Transition a job into the `stalled` status and emit an audit event. */
  markStalled(jobId: JobId): Promise<JobAggregate | null>;
  /** Record an abuse report. Returns the new report id. */
  recordAbuseReport(input: AbuseReportInput): Promise<string>;
  /** List all abuse reports (admin). */
  listAbuseReports(): Promise<AbuseReport[]>;
  /** GDPR/NDPR: create an export or deletion request for this device. */
  createPrivacyRequest(input: PrivacyRequestInput): Promise<PrivacyRequest>;
  /** GDPR/NDPR: return all requests for this device. */
  listPrivacyRequests(deviceKey: string): Promise<PrivacyRequest[]>;
  /** Admin: list all privacy requests. */
  listAllPrivacyRequests(): Promise<PrivacyRequest[]>;
  /** Process the export (collect all data tied to deviceKey) and mark ready. */
  processPrivacyExport(id: string): Promise<PrivacyRequest | null>;
  /** Process the deletion (anonymise all data tied to deviceKey). */
  processPrivacyDelete(id: string): Promise<PrivacyRequest | null>;
  /** Test helper; in Postgres impl it TRUNCATEs within a test transaction. */
  __reset(): Promise<void>;
}

export interface AbuseReportInput {
  reason: 'harassment' | 'scam' | 'impersonation' | 'under_age' | 'violence' | 'other';
  jobId?: string;
  token?: string;
  description: string;
  contact?: string;
  reporterDeviceKey: string | null;
}

export interface AbuseReport {
  id: string;
  reason: AbuseReportInput['reason'];
  jobId?: string;
  token?: string;
  description: string;
  contact?: string;
  reporterDeviceKey: string | null;
  createdAt: string;
  status: 'new' | 'reviewing' | 'resolved' | 'dismissed';
}

export interface PrivacyRequestInput {
  kind: 'export' | 'delete';
  deviceKey: string;
}

export interface PrivacyRequest {
  id: string;
  kind: 'export' | 'delete';
  deviceKey: string;
  createdAt: string;
  status: 'pending' | 'ready' | 'completed' | 'rejected';
  payload?: unknown;
}

/** Adapter: convert stored fields (e.g. BriefField[]) into a JobVersion. */
export function buildVersion(
  v: Omit<JobVersion, 'fields' | 'acknowledgements'>,
  fields: BriefField[],
  acks: Acknowledgement[],
): JobVersion {
  return { ...v, fields, acknowledgements: acks };
}
