/**
 * Core domain types shared between clients and server.
 * The server is authoritative; these types are for API contracts and
 * client modelling. Do NOT put business-rule execution here — rules
 * live server-side (docs/01 §3).
 */

export const JobStatus = {
  draft: 'draft',
  invited: 'invited',
  clarification_needed: 'clarification_needed',
  ready_for_review: 'ready_for_review',
  partially_acknowledged: 'partially_acknowledged',
  mutually_acknowledged: 'mutually_acknowledged',
  in_progress: 'in_progress',
  completion_review: 'completion_review',
  completed: 'completed',
  paused: 'paused',
  cancelled: 'cancelled',
  stalled: 'stalled',
  archived: 'archived',
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const FieldStatus = {
  unknown: 'unknown',
  draft: 'draft',
  needs_clarification: 'needs_clarification',
  conflicting: 'conflicting',
  not_applicable: 'not_applicable',
  proposed: 'proposed',
  confirmed_in_version: 'confirmed_in_version',
} as const;
export type FieldStatus = (typeof FieldStatus)[keyof typeof FieldStatus];

export const AckAction = {
  reviewed: 'reviewed',
  question: 'question',
  disagree: 'disagree',
  need_time: 'need_time',
  withdrawn: 'withdrawn',
} as const;
export type AckAction = (typeof AckAction)[keyof typeof AckAction];

export const ParticipantRole = {
  customer: 'customer',
  provider: 'provider',
  helper: 'helper',
  creator: 'creator',
} as const;
export type ParticipantRole = (typeof ParticipantRole)[keyof typeof ParticipantRole];

/** Opaque branded IDs — prevents accidental mixing. */
declare const _brand: unique symbol;
export type Id<T extends string> = string & { [_brand]: T };
export type JobId = Id<'job'>;
export type VersionId = Id<'version'>;
export type ParticipantId = Id<'participant'>;
export type ChangeRequestId = Id<'change'>;
export type QuestionId = Id<'question'>;
export type AttachmentId = Id<'attachment'>;
export type UserId = Id<'user'>;

export interface BriefField {
  key: string;
  label: string;
  valueRaw: string | null;
  valueDisplay?: string | null;
  unitOrCurrency?: string | null;
  amountMinor?: number | null;
  status: FieldStatus;
  certainty?: 'exact' | 'estimate' | 'range' | 'unknown';
  condition?: string | null;
  visibility: 'private' | 'shared';
  material: boolean;
  authorParticipantId?: ParticipantId;
  source?: { inputId: string; excerpt?: string };
  updatedAt?: string;
}

export interface Acknowledgement {
  id: string;
  versionId: VersionId;
  participantId: ParticipantId;
  action: AckAction;
  comment?: string | null;
  createdAt: string;
}

export interface JobVersion {
  id: VersionId;
  jobId: JobId;
  number: number;
  parentVersionId?: VersionId | null;
  authorParticipantId?: ParticipantId | null;
  schemaVersion: string;
  templateVersion: string;
  fields: BriefField[];
  contentDigest: string;
  prevDigest?: string | null;
  reason?: string | null;
  status: 'draft' | 'published' | 'superseded';
  acknowledgements: Acknowledgement[];
  createdAt: string;
}

export interface Participant {
  id: ParticipantId;
  displayName: string;
  role: ParticipantRole;
  honorific?: string;
  state: 'invited' | 'active' | 'declined' | 'left' | 'revoked';
  joinedAt?: string | null;
  /**
   * Device that claimed this participant (set by server on claim/create).
   * Omitted from public JSON views — only used server-side for auth checks.
   */
  deviceKey?: string | null;
}

export interface JobAggregate {
  id: JobId;
  title: string;
  categoryKey: string;
  status: JobStatus;
  currentVersionId?: VersionId | null;
  jobSeq: number;
  currencyCode?: string | null;
  participants: Participant[];
  currentVersion?: JobVersion | null;
  openChangeCount: number;
  openQuestionCount: number;
  capabilities: Record<string, boolean>;
  updatedAt: string;
}
