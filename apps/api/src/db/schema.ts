/**
 * Kysely type definitions for the Postgres schema.
 *
 * These types drive compile-time query safety. The actual tables are created
 * by `migrations/0001_init.sql` (run via `pnpm --filter @nwa/api migrate`).
 * When DATABASE_URL is unset (local dev / tests without a DB), we fall back
 * to the in-memory store so the app still boots.
 */
import type { ColumnType, Generated, GeneratedAlways, Insertable, Selectable, Updateable } from 'kysely';

export type JobStatus =
  | 'draft'
  | 'invited'
  | 'clarification_needed'
  | 'ready_for_review'
  | 'partially_acknowledged'
  | 'mutually_acknowledged'
  | 'in_progress'
  | 'completion_review'
  | 'completed'
  | 'paused'
  | 'cancelled'
  | 'stalled'
  | 'archived';

export type FieldStatus =
  | 'unknown'
  | 'draft'
  | 'needs_clarification'
  | 'conflicting'
  | 'not_applicable'
  | 'proposed'
  | 'confirmed_in_version';

export type VersionStatus = 'draft' | 'published' | 'superseded';

export type ParticipantRole = 'customer' | 'provider' | 'helper' | 'creator';
export type ParticipantState = 'invited' | 'active' | 'declined' | 'left' | 'revoked';

export type AckAction = 'reviewed' | 'question' | 'disagree' | 'need_time' | 'withdrawn';

export type ChangeKind = 'question' | 'change';

export interface JobTable {
  id: string; // PK (job_<random>)
  title: string;
  category_key: string;
  status: JobStatus;
  current_version_id: string | null;
  job_seq: number;
  currency_code: string | null;
  open_change_count: number;
  open_question_count: number;
  capabilities: ColumnType<Record<string, boolean>, Record<string, boolean> | undefined, Record<string, boolean> | undefined>;
  created_at: ColumnType<string, string | undefined, never>;
  updated_at: string;
  expires_at: string | null;
  // Which participant is the creator, denormalised for quick lookups.
  creator_participant_id: string;
}

export interface ParticipantTable {
  id: string; // PK (p_<random>)
  job_id: string;
  display_name: string;
  honorific: string | null;
  role: ParticipantRole;
  state: ParticipantState;
  email: string | null;
  email_verified_at: string | null;
  device_key: string | null;
  joined_at: string | null;
  last_seen_at: string | null;
  created_at: ColumnType<string, string | undefined, never>;
}

export interface VersionTable {
  id: string; // PK (ver_<random>)
  job_id: string;
  number: number;
  parent_version_id: string | null;
  author_participant_id: string | null;
  schema_version: string;
  template_version: string;
  content_digest: string;
  prev_digest: string | null;
  reason: string | null;
  status: VersionStatus;
  created_at: ColumnType<string, string | undefined, never>;
}

export interface VersionFieldTable {
  id: GeneratedAlways<string>;
  version_id: string;
  field_key: string;
  label: string;
  value_raw: string | null;
  value_display: string | null;
  unit_or_currency: string | null;
  amount_minor: number | null;
  status: FieldStatus;
  certainty: 'exact' | 'estimate' | 'range' | 'unknown' | null;
  condition: string | null;
  visibility: 'private' | 'shared';
  material: boolean;
  author_participant_id: string | null;
  updated_at: string | null;
}

export interface AckTable {
  id: string; // PK (ack_<random>)
  version_id: string;
  participant_id: string;
  action: AckAction;
  comment: string | null;
  created_at: ColumnType<string, string | undefined, never>;
}

export interface InviteTable {
  token: string; // PK (22-byte base64url)
  job_id: string;
  to_participant_id: string | null;
  to_role: ParticipantRole;
  to_display_name: string | null;
  created_at: ColumnType<string, string | undefined, never>;
  expires_at: string;
  revoked_at: string | null;
}

export interface ChangeRequestTable {
  id: string; // PK (chg_<random>)
  job_id: string;
  version_id: string;
  author_participant_id: string;
  kind: ChangeKind;
  comment: string;
  proposed_fields: ColumnType<{ key: string; value: string }[] | null, string | null, string | null>; // stored as JSONB
  created_at: ColumnType<string, string | undefined, never>;
}

/** Append-only audit log (gap G20). */
export interface JobEventTable {
  id: Generated<string>;
  job_id: string;
  event_type: string;
  actor_participant_id: string | null;
  payload: ColumnType<Record<string, unknown> | null, string | null, string | null>; // JSONB
  created_at: ColumnType<string, string | undefined, never>;
}

export interface IdempotencyKeyTable {
  key: string; // PK
  request_hash: string;
  response_status: number;
  response_body: string | null;
  created_at: ColumnType<string, string | undefined, never>;
  expires_at: string;
}

export interface DeviceTable {
  device_key: string; // PK (16-byte hex)
  email: string | null;
  email_verified_at: string | null;
  push_endpoint: string | null;
  push_p256dh: string | null;
  push_auth: string | null;
  created_at: ColumnType<string, string | undefined, never>;
  last_seen_at: string;
}

export interface Database {
  jobs: JobTable;
  participants: ParticipantTable;
  versions: VersionTable;
  version_fields: VersionFieldTable;
  acks: AckTable;
  invites: InviteTable;
  change_requests: ChangeRequestTable;
  job_events: JobEventTable;
  idempotency_keys: IdempotencyKeyTable;
  devices: DeviceTable;
}

export type JobRow = Selectable<JobTable>;
export type NewJob = Insertable<JobTable>;
export type JobUpdate = Updateable<JobTable>;

export type ParticipantRow = Selectable<ParticipantTable>;
export type NewParticipant = Insertable<ParticipantTable>;

export type VersionRow = Selectable<VersionTable>;
export type NewVersion = Insertable<VersionTable>;

export type VersionFieldRow = Selectable<VersionFieldTable>;
export type NewVersionField = Insertable<VersionFieldTable>;

export type AckRow = Selectable<AckTable>;
export type NewAck = Insertable<AckTable>;

export type InviteRow = Selectable<InviteTable>;
export type NewInvite = Insertable<InviteTable>;

export type ChangeRequestRow = Selectable<ChangeRequestTable>;
export type NewChangeRequest = Insertable<ChangeRequestTable>;
