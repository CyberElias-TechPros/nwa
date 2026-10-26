/**
 * Postgres (Neon) implementation of JobRepository.
 *
 * All mutating operations run inside a single transaction that:
 *   1. reads the relevant state,
 *   2. writes new rows,
 *   3. recomputes derived counters and job status,
 *   4. appends an audit event to job_events (gap G20),
 *   5. returns the freshly-hydrated aggregate.
 *
 * Immutability for versions/acks/change_requests/job_events is enforced
 * by triggers defined in migrations/0001_init.sql — the app layer doesn't
 * issue UPDATEs/DELETEs on those tables except superseding versions.status.
 */
import { Kysely, PostgresDialect, sql, type Transaction } from 'kysely';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { publicId, inviteToken } from '../platform/ids.js';
import { JobStatus } from '@nwa/domain';
import type {
  AckAction,
  Acknowledgement,
  BriefField,
  JobAggregate,
  JobId,
  JobVersion,
  Participant,
  ParticipantId,
  VersionId,
} from '@nwa/domain';
import type {
  AckRow,
  ChangeRequestRow,
  Database,
  InviteRow,
  JobRow as DbJobRow,
  NewAck,
  NewChangeRequest,
  NewInvite,
  NewJob,
  NewParticipant,
  NewVersion,
  NewVersionField,
  ParticipantRow,
  VersionFieldRow,
  VersionRow,
} from './schema.js';
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPool = any;

const FOURTEEN_DAYS_MS = 14 * 86_400_000;

function nowIso() {
  return new Date().toISOString();
}

function toIso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (typeof d === 'string') return d;
  return d.toISOString();
}

function fromTimestamp(val: Date | string): string {
  if (typeof val === 'string') return val;
  return val.toISOString();
}

export function createPgRepository(databaseUrl: string): JobRepository & { db: Kysely<Database>; pool: Pool } {
  if (typeof (globalThis as { WebSocket?: unknown }).WebSocket !== 'undefined') {
    neonConfig.webSocketConstructor = (globalThis as { WebSocket: unknown }).WebSocket as never;
  }
  const pool = new Pool({ connectionString: databaseUrl });
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool: pool as unknown as AnyPool }),
  });

  // ------------------- Mappers -------------------
  // NOTE: connectivity is probed lazily by the factory (see factory.ts) so we
  // don't throw from the constructor — the factory will fall back to memory
  // if a SELECT 1 probe fails.

  function mapParticipant(r: ParticipantRow): Participant {
    return {
      id: r.id as ParticipantId,
      displayName: r.display_name,
      honorific: r.honorific ?? undefined,
      role: r.role as Participant['role'],
      state: r.state as Participant['state'],
      joinedAt: toIso(r.joined_at),
      deviceKey: r.device_key ?? null,
    };
  }

  function mapBriefField(r: VersionFieldRow, author: string | null): BriefField {
    return {
      key: r.field_key,
      label: r.label,
      valueRaw: r.value_raw,
      valueDisplay: r.value_display,
      unitOrCurrency: r.unit_or_currency,
      amountMinor: r.amount_minor,
      status: r.status as BriefField['status'],
      certainty: (r.certainty as BriefField['certainty']) ?? undefined,
      condition: r.condition,
      visibility: r.visibility as BriefField['visibility'],
      material: r.material,
      authorParticipantId: (author as ParticipantId) ?? undefined,
      updatedAt: toIso(r.updated_at) ?? undefined,
    };
  }

  function mapAck(r: AckRow): Acknowledgement {
    return {
      id: r.id,
      versionId: r.version_id as VersionId,
      participantId: r.participant_id as ParticipantId,
      action: r.action as AckAction,
      comment: r.comment,
      createdAt: fromTimestamp(r.created_at),
    };
  }

  function mapVersion(r: VersionRow, fields: BriefField[], acks: Acknowledgement[]): JobVersion {
    return {
      id: r.id as VersionId,
      jobId: r.job_id as JobId,
      number: r.number,
      parentVersionId: (r.parent_version_id as VersionId) ?? null,
      authorParticipantId: (r.author_participant_id as ParticipantId) ?? null,
      schemaVersion: r.schema_version,
      templateVersion: r.template_version,
      fields,
      contentDigest: r.content_digest,
      prevDigest: r.prev_digest ?? null,
      reason: r.reason ?? null,
      status: r.status as JobVersion['status'],
      acknowledgements: acks,
      createdAt: fromTimestamp(r.created_at),
    };
  }

  function mapInvite(r: InviteRow): Invite {
    return {
      token: r.token,
      jobId: r.job_id as JobId,
      toParticipantId: r.to_participant_id ? (r.to_participant_id as ParticipantId) : undefined,
      toRole: r.to_role as Invite['toRole'],
      toDisplayName: r.to_display_name ?? undefined,
      createdAt: fromTimestamp(r.created_at),
      expiresAt: fromTimestamp(r.expires_at),
      revokedAt: r.revoked_at ? fromTimestamp(r.revoked_at) : undefined,
    };
  }

  function mapChangeRequest(r: ChangeRequestRow): ChangeRequest {
    let proposed: { key: string; value: string }[] | undefined;
    if (r.proposed_fields) {
      // Kysely returns JSONB as a JS value when using PostgresDialect + jsonb parse.
      const raw = r.proposed_fields as unknown;
      if (Array.isArray(raw)) proposed = raw as { key: string; value: string }[];
      else if (typeof raw === 'string') {
        try { proposed = JSON.parse(raw); } catch { /* ignore */ }
      }
    }
    return {
      id: r.id as ChangeRequest['id'],
      jobId: r.job_id as JobId,
      versionId: r.version_id as VersionId,
      authorParticipantId: r.author_participant_id as ParticipantId,
      kind: r.kind as ChangeRequest['kind'],
      comment: r.comment,
      proposedFields: proposed,
      createdAt: fromTimestamp(r.created_at),
    };
  }

  type AnyExecutor = Kysely<Database> | Transaction<Database>;

  async function hydrateVersion(exec: AnyExecutor, v: VersionRow): Promise<JobVersion> {
    const fields = await exec
      .selectFrom('version_fields')
      .selectAll()
      .where('version_id', '=', v.id)
      .orderBy('id', 'asc')
      .execute();
    const acks = await exec
      .selectFrom('acks')
      .selectAll()
      .where('version_id', '=', v.id)
      .orderBy('created_at', 'asc')
      .execute();
    return mapVersion(
      v,
      fields.map((f) => mapBriefField(f, f.author_participant_id)),
      acks.map(mapAck),
    );
  }

  async function hydrateJob(exec: AnyExecutor, jobRow: DbJobRow): Promise<JobRow> {
    const participants = await exec
      .selectFrom('participants')
      .selectAll()
      .where('job_id', '=', jobRow.id)
      .orderBy('created_at', 'asc')
      .execute();
    const invites = await exec
      .selectFrom('invites')
      .selectAll()
      .where('job_id', '=', jobRow.id)
      .orderBy('created_at', 'asc')
      .execute();
    const currentVersionRow = jobRow.current_version_id
      ? await exec.selectFrom('versions').selectAll().where('id', '=', jobRow.current_version_id).executeTakeFirst()
      : undefined;
    const versionsRows = await exec
      .selectFrom('versions')
      .selectAll()
      .where('job_id', '=', jobRow.id)
      .orderBy('number', 'asc')
      .execute();
    const changesRows = await exec
      .selectFrom('change_requests')
      .selectAll()
      .where('job_id', '=', jobRow.id)
      .orderBy('created_at', 'asc')
      .execute();

    const currentVersion = currentVersionRow ? await hydrateVersion(exec, currentVersionRow) : undefined;
    const versions = [] as JobVersion[];
    for (const v of versionsRows) versions.push(await hydrateVersion(exec, v));

    const mappedParticipants = participants.map(mapParticipant);

    const jobAgg: JobAggregate = {
      id: jobRow.id as JobId,
      title: jobRow.title,
      categoryKey: jobRow.category_key,
      status: jobRow.status as JobStatus,
      currentVersionId: jobRow.current_version_id ? (jobRow.current_version_id as VersionId) : null,
      jobSeq: jobRow.job_seq,
      currencyCode: jobRow.currency_code,
      participants: mappedParticipants,
      currentVersion: currentVersion ?? null,
      openChangeCount: jobRow.open_change_count,
      openQuestionCount: jobRow.open_question_count,
      capabilities: (jobRow.capabilities as Record<string, boolean>) ?? {},
      updatedAt: fromTimestamp(jobRow.updated_at),
    };

    return {
      job: jobAgg,
      versions,
      invites: invites.map(mapInvite),
      changes: changesRows.map(mapChangeRequest),
    };
  }

  async function emitEvent(
    exec: AnyExecutor,
    jobId: JobId,
    eventType: string,
    actor: ParticipantId | null,
    payload: Record<string, unknown>,
  ) {
    await exec.insertInto('job_events').values({
      job_id: jobId,
      event_type: eventType,
      actor_participant_id: actor,
      payload: JSON.stringify(payload) as never,
    }).execute();
  }

  // ------------------- API methods -------------------

  const repo: JobRepository & { db: Kysely<Database>; pool: Pool } = {
    db,
    pool,

    async createJob(input: CreateJobInput) {
      const jobId = publicId('job', 14) as JobId;
      const creatorId = publicId('p', 12) as ParticipantId;
      const verId = publicId('ver', 14) as VersionId;
      const token = inviteToken();
      const createdAt = nowIso();
      const expiresAt = new Date(Date.now() + FOURTEEN_DAYS_MS).toISOString();
      const notes = input.initialNotes?.trim();
      const digest = `v1:${notes ?? ''}`;

      const newJob: NewJob = {
        id: jobId,
        title: input.title,
        category_key: input.categoryKey,
        status: 'invited',
        current_version_id: verId,
        job_seq: 1,
        currency_code: null,
        open_change_count: 0,
        open_question_count: 0,
        capabilities: {},
        created_at: createdAt,
        updated_at: createdAt,
        expires_at: null,
        creator_participant_id: creatorId,
      };
      const newParticipant: NewParticipant = {
        id: creatorId,
        job_id: jobId,
        display_name: input.creatorName || 'You',
        honorific: null,
        role: 'creator',
        state: 'active',
        email: null,
        email_verified_at: null,
        device_key: input.deviceKey ?? null,
        joined_at: createdAt,
        last_seen_at: createdAt,
        created_at: createdAt,
      };
      const newVersion: NewVersion = {
        id: verId,
        job_id: jobId,
        number: 1,
        parent_version_id: null,
        author_participant_id: creatorId,
        schema_version: '1.0',
        template_version: 'plain-1',
        content_digest: digest,
        prev_digest: null,
        reason: null,
        status: 'published',
        created_at: createdAt,
      };
      const newInvite: NewInvite = {
        token,
        job_id: jobId,
        to_participant_id: null,
        to_role: 'provider',
        to_display_name: null,
        created_at: createdAt,
        expires_at: expiresAt,
        revoked_at: null,
      };

      const fields: NewVersionField[] = notes
        ? [{
            version_id: verId,
            field_key: 'notes',
            label: 'What we talked about',
            value_raw: notes,
            value_display: notes,
            unit_or_currency: null,
            amount_minor: null,
            status: 'proposed',
            certainty: 'exact',
            condition: null,
            visibility: 'shared',
            material: false,
            author_participant_id: creatorId,
            updated_at: createdAt,
          }]
        : [];

      return db.transaction().execute(async (trx) => {
        await trx.insertInto('jobs').values(newJob).execute();
        await trx.insertInto('participants').values(newParticipant).execute();
        await trx.insertInto('versions').values(newVersion).execute();
        if (fields.length) await trx.insertInto('version_fields').values(fields).execute();
        await trx.insertInto('invites').values(newInvite).execute();
        await emitEvent(trx, jobId, 'job.created', creatorId, { title: input.title });

        const row = await hydrateJob(trx, (await trx.selectFrom('jobs').selectAll().where('id', '=', jobId).executeTakeFirst())!);
        return { job: row.job, invite: row.invites[0]!, creatorId };
      });
    },

    async getJob(id: JobId) {
      const jobRow = await db.selectFrom('jobs').selectAll().where('id', '=', id).executeTakeFirst();
      if (!jobRow) return null;
      return hydrateJob(db, jobRow);
    },

    async resolveInvite(token: string) {
      const inviteRow = await db.selectFrom('invites').selectAll().where('token', '=', token).executeTakeFirst();
      if (!inviteRow) return { error: 'missing' as const };
      if (inviteRow.revoked_at) return { error: 'revoked' as const };
      if (new Date(inviteRow.expires_at).getTime() < Date.now()) return { error: 'expired' as const };
      const jobRow = await db.selectFrom('jobs').selectAll().where('id', '=', inviteRow.job_id).executeTakeFirst();
      if (!jobRow) return { error: 'missing' as const };
      const row = await hydrateJob(db, jobRow);
      return { row, invite: row.invites.find((i) => i.token === token) ?? mapInvite(inviteRow) };
    },

    async listJobsForCreator(creatorId: ParticipantId) {
      const jobIds = await db
        .selectFrom('jobs')
        .innerJoin('participants', 'participants.job_id', 'jobs.id')
        .select('jobs.id')
        .where('participants.id', '=', creatorId)
        .orderBy('jobs.updated_at', 'desc')
        .execute();
      const out: JobAggregate[] = [];
      for (const { id } of jobIds) {
        const jr = await db.selectFrom('jobs').selectAll().where('id', '=', id).executeTakeFirst();
        if (!jr) continue;
        const hydrated = await hydrateJob(db, jr);
        out.push(hydrated.job);
      }
      return out;
    },

    async acknowledge(input: AcknowledgeInput) {
      return db.transaction().execute(async (trx) => {
        const jobRow = await trx.selectFrom('jobs').selectAll().where('id', '=', input.jobId).executeTakeFirst();
        if (!jobRow) throw new Error('job not found');
        if (!jobRow.current_version_id) throw new Error('no current version');

        // Replace prior ack on this version by this participant (idempotent).
        // The acks table's DELETE trigger blocks arbitrary deletes, but allows
        // them when LOCAL nwa.allow_self_override=true. We set that for the
        // duration of this single statement so a participant can restate their
        // position on the same version; the replacement ack is inserted right
        // after, and job_events records the restatement.
        const existing = await trx
          .selectFrom('acks')
          .selectAll()
          .where('version_id', '=', jobRow.current_version_id)
          .where('participant_id', '=', input.participantId)
          .executeTakeFirst();
        if (existing) {
          await sql`SET LOCAL nwa.allow_self_override = true`.execute(trx);
          await trx.deleteFrom('acks').where('id', '=', existing.id).execute();
        }
        const ack: NewAck = {
          id: publicId('ack', 12),
          version_id: jobRow.current_version_id,
          participant_id: input.participantId,
          action: input.action,
          comment: input.comment ?? null,
          created_at: nowIso(),
        };
        await trx.insertInto('acks').values(ack).execute();

        // Compute new status.
        const acks = await trx.selectFrom('acks').selectAll().where('version_id', '=', jobRow.current_version_id).execute();
        const active = await trx.selectFrom('participants').selectAll().where('job_id', '=', input.jobId).where('state', '=', 'active').execute();
        const acked = new Set(acks.filter((a) => a.action === 'reviewed').map((a) => a.participant_id));
        const hasQuestion = acks.some((a) => a.action === 'question');
        let newStatus: JobStatus;
        if (acked.size === active.length && active.length >= 2) newStatus = 'mutually_acknowledged';
        else if (hasQuestion) newStatus = 'clarification_needed';
        else if (acked.size > 0) newStatus = 'partially_acknowledged';
        else newStatus = jobRow.status as JobStatus;

        const updatedAt = nowIso();
        await trx.updateTable('jobs')
          .set({ status: newStatus, updated_at: updatedAt })
          .where('id', '=', input.jobId)
          .execute();

        await emitEvent(trx, input.jobId, 'job.ack', input.participantId, {
          versionId: jobRow.current_version_id,
          action: input.action,
          comment: input.comment ?? null,
        });

        const refreshed = (await trx.selectFrom('jobs').selectAll().where('id', '=', input.jobId).executeTakeFirst())!;
        const row = await hydrateJob(trx, refreshed);
        const ackRow = (await trx.selectFrom('acks').selectAll().where('id', '=', ack.id).executeTakeFirst())!;
        return { job: row.job, ack: mapAck(ackRow) };
      });
    },

    async addChangeRequest(input: AddChangeInput) {
      return db.transaction().execute(async (trx) => {
        const jobRow = await trx.selectFrom('jobs').selectAll().where('id', '=', input.jobId).executeTakeFirst();
        if (!jobRow) throw new Error('job not found');

        const cr: NewChangeRequest = {
          id: publicId('chg', 12),
          job_id: input.jobId,
          version_id: input.versionId,
          author_participant_id: input.authorParticipantId,
          kind: input.kind,
          comment: input.comment,
          proposed_fields: null,
          created_at: nowIso(),
        };
        await trx.insertInto('change_requests').values(cr).execute();

        // Update counts + status.
        const changes = await trx.selectFrom('change_requests').selectAll().where('job_id', '=', input.jobId).execute();
        const openChangeCount = changes.filter((c) => c.kind === 'change').length;
        const openQuestionCount = changes.filter((c) => c.kind === 'question').length;
        const status: JobStatus = input.kind === 'question' ? 'clarification_needed' : 'partially_acknowledged';
        await trx.updateTable('jobs')
          .set({ open_change_count: openChangeCount, open_question_count: openQuestionCount, status, updated_at: nowIso() })
          .where('id', '=', input.jobId)
          .execute();

        await emitEvent(trx, input.jobId, 'job.change_requested', input.authorParticipantId, {
          versionId: input.versionId,
          kind: input.kind,
        });

        const row = (await trx.selectFrom('change_requests').selectAll().where('id', '=', cr.id).executeTakeFirst())!;
        return mapChangeRequest(row);
      });
    },

    async claimInvite(token: string, input: ClaimInviteInput) {
      const displayName = input.displayName;
      const deviceKey = input.deviceKey;
      return db.transaction().execute(async (trx) => {
        const inviteRow = await trx.selectFrom('invites').selectAll().where('token', '=', token).executeTakeFirst();
        if (!inviteRow) return { error: 'missing' as const };
        if (inviteRow.revoked_at) return { error: 'revoked' as const };
        if (new Date(inviteRow.expires_at).getTime() < Date.now()) return { error: 'expired' as const };
        const jobId = inviteRow.job_id as JobId;

        // Already claimed by another device?
        if (inviteRow.to_participant_id) {
          const existing = await trx.selectFrom('participants').selectAll().where('id', '=', inviteRow.to_participant_id).executeTakeFirst();
          if (existing) {
            // Same device that originally claimed this invite → re-enter.
            if (deviceKey && existing.device_key === deviceKey) {
              const jobRow = (await trx.selectFrom('jobs').selectAll().where('id', '=', jobId).executeTakeFirst())!;
              const row = await hydrateJob(trx, jobRow);
              return { row, invite: mapInvite(inviteRow), participant: mapParticipant(existing) };
            }
            return { error: 'already_claimed' as const };
          }
        }

        // Same device already on this job as a recipient → reuse participant (returning user).
        if (deviceKey) {
          const sameDeviceParticipant = await trx
            .selectFrom('participants')
            .selectAll()
            .where('job_id', '=', jobId)
            .where('device_key', '=', deviceKey)
            .executeTakeFirst();
          if (sameDeviceParticipant) {
            // If invite wasn't yet bound, bind it to this existing participant.
            if (!inviteRow.to_participant_id) {
              await trx.updateTable('invites')
                .set({ to_participant_id: sameDeviceParticipant.id, to_display_name: sameDeviceParticipant.display_name })
                .where('token', '=', token)
                .execute();
            }
            await trx.updateTable('jobs')
              .set({ status: 'ready_for_review', updated_at: nowIso() })
              .where('id', '=', jobId)
              .execute();
            const jobRow = (await trx.selectFrom('jobs').selectAll().where('id', '=', jobId).executeTakeFirst())!;
            const row = await hydrateJob(trx, jobRow);
            return { row, invite: { ...mapInvite(inviteRow), toParticipantId: sameDeviceParticipant.id as ParticipantId, toDisplayName: sameDeviceParticipant.display_name }, participant: mapParticipant(sameDeviceParticipant) };
          }
        }

        // Fresh claim: create new participant bound to this device.
        const pId = publicId('p', 12) as ParticipantId;
        const now = nowIso();
        const participant: NewParticipant = {
          id: pId,
          job_id: jobId,
          display_name: displayName || 'The other person',
          honorific: null,
          role: inviteRow.to_role,
          state: 'active',
          email: null,
          email_verified_at: null,
          device_key: deviceKey ?? null,
          joined_at: now,
          last_seen_at: now,
          created_at: now,
        };
        await trx.insertInto('participants').values(participant).execute();
        await trx.updateTable('invites')
          .set({ to_participant_id: pId, to_display_name: participant.display_name })
          .where('token', '=', token)
          .execute();
        await trx.updateTable('jobs')
          .set({ status: 'ready_for_review', updated_at: now })
          .where('id', '=', jobId)
          .execute();

        await emitEvent(trx, jobId, 'job.invite_claimed', pId, { token });

        const jobRow = (await trx.selectFrom('jobs').selectAll().where('id', '=', jobId).executeTakeFirst())!;
        const pRow = (await trx.selectFrom('participants').selectAll().where('id', '=', pId).executeTakeFirst())!;
        const row = await hydrateJob(trx, jobRow);
        const updatedInvite = { ...mapInvite(inviteRow), toParticipantId: pId, toDisplayName: participant.display_name };
        return { row, invite: updatedInvite, participant: mapParticipant(pRow) };
      });
    },

    async listChangeRequests(jobId: JobId) {
      const rows = await db.selectFrom('change_requests').selectAll().where('job_id', '=', jobId).orderBy('created_at', 'asc').execute();
      return rows.map(mapChangeRequest);
    },

    async publishNewVersion(input: NewVersionInput) {
      return db.transaction().execute(async (trx) => {
        const jobRow = await trx.selectFrom('jobs').selectAll().where('id', '=', input.jobId).executeTakeFirst();
        if (!jobRow) throw new Error('job not found');
        if (!jobRow.current_version_id) throw new Error('no current version');
        const prev = await trx.selectFrom('versions').selectAll().where('id', '=', jobRow.current_version_id).executeTakeFirst();
        if (!prev) throw new Error('no current version');

        const number = prev.number + 1;
        const id = publicId('ver', 14) as VersionId;
        const now = nowIso();
        const digest = `v${number}:` + input.fields.map((f) => `${f.key}=${f.value}`).join('|');
        const version: NewVersion = {
          id,
          job_id: input.jobId,
          number,
          parent_version_id: prev.id,
          author_participant_id: input.authorParticipantId,
          schema_version: '1.0',
          template_version: 'plain-1',
          content_digest: digest,
          prev_digest: prev.content_digest,
          reason: input.reason ?? null,
          status: 'published',
          created_at: now,
        };
        await trx.insertInto('versions').values(version).execute();
        const fields: NewVersionField[] = input.fields.map((f, idx) => ({
          version_id: id,
          field_key: f.key || `field_${idx}`,
          label: f.label,
          value_raw: f.value,
          value_display: f.value,
          unit_or_currency: null,
          amount_minor: null,
          status: 'proposed',
          certainty: 'exact',
          condition: null,
          visibility: 'shared',
          material: false,
          author_participant_id: input.authorParticipantId,
          updated_at: now,
        }));
        await trx.insertInto('version_fields').values(fields).execute();

        // Supersede previous version (the versions trigger only allows status
        // changes, which is exactly what we're doing here).
        await trx.updateTable('versions').set({ status: 'superseded' }).where('id', '=', prev.id).execute();

        await trx.updateTable('jobs')
          .set({
            current_version_id: id,
            job_seq: number,
            status: 'ready_for_review',
            open_change_count: 0,
            open_question_count: 0,
            updated_at: now,
          })
          .where('id', '=', input.jobId)
          .execute();

        await emitEvent(trx, input.jobId, 'job.version_published', input.authorParticipantId, {
          fromVersion: prev.number,
          toVersion: number,
          reason: input.reason ?? null,
        });

        const refreshed = (await trx.selectFrom('jobs').selectAll().where('id', '=', input.jobId).executeTakeFirst())!;
        const row = await hydrateJob(trx, refreshed);
        const newVer = row.versions.find((v) => v.id === id)!;
        return { job: row.job, version: newVer };
      });
    },

    async listVersions(jobId: JobId) {
      const rows = await db.selectFrom('versions').selectAll().where('job_id', '=', jobId).orderBy('number', 'desc').execute();
      const out: JobVersion[] = [];
      for (const v of rows) out.push(await hydrateVersion(db, v));
      return out;
    },

    // --- Tiered-auth methods -------------------------------------------------

    async listJobsForDevice(deviceKey: string): Promise<JobAggregate[]> {
      const jobIds = await db
        .selectFrom('jobs')
        .innerJoin('participants', 'participants.job_id', 'jobs.id')
        .select('jobs.id')
        .where('participants.device_key', '=', deviceKey)
        .where('participants.state', '!=', 'revoked')
        .orderBy('jobs.updated_at', 'desc')
        .execute();
      const out: JobAggregate[] = [];
      for (const { id } of jobIds) {
        const jr = await db.selectFrom('jobs').selectAll().where('id', '=', id).executeTakeFirst();
        if (!jr) continue;
        out.push((await hydrateJob(db, jr)).job);
      }
      return out;
    },

    async authorise(input: AuthzInput): Promise<Participant | null> {
      const p = await db
        .selectFrom('participants')
        .selectAll()
        .where('id', '=', input.participantId)
        .where('job_id', '=', input.jobId)
        .where('state', '!=', 'revoked')
        .executeTakeFirst();
      if (!p) return null;
      // Device binding match (server-issued deviceKey always non-empty).
      if (p.device_key && input.deviceKey && p.device_key === input.deviceKey) return mapParticipant(p);
      return null;
    },

    async rotateInvite(jobId: JobId, actorId: ParticipantId) {
      return db.transaction().execute(async (trx) => {
        const job = await trx.selectFrom('jobs').selectAll().where('id', '=', jobId).executeTakeFirst();
        if (!job) return { error: 'not_found' as const };
        if (job.creator_participant_id !== actorId) return { error: 'unauthorized' as const };

        const now = nowIso();
        // Capture the active invite token before revoking (for the response/audit).
        const current = await trx
          .selectFrom('invites')
          .selectAll()
          .where('job_id', '=', jobId)
          .where('revoked_at', 'is', null)
          .orderBy('created_at', 'desc')
          .executeTakeFirst();
        const oldToken = current?.token ?? '';

        await trx.updateTable('invites')
          .set({ revoked_at: now })
          .where('job_id', '=', jobId)
          .where('revoked_at', 'is', null)
          .execute();

        const token = inviteToken();
        const expiresAt = new Date(Date.now() + FOURTEEN_DAYS_MS).toISOString();
        const row: NewInvite = {
          token,
          job_id: jobId,
          to_participant_id: null,
          to_role: 'provider',
          to_display_name: null,
          created_at: now,
          expires_at: expiresAt,
          revoked_at: null,
        };
        await trx.insertInto('invites').values(row).execute();
        await emitEvent(trx, jobId, 'job.invite_rotated', actorId, { oldToken, newToken: token });
        return { oldToken, newInvite: mapInvite({ ...row } as InviteRow) };
      });
    },

    async listStaleJobs(olderThanMs: number, limit: number) {
      const threshold = new Date(Date.now() - olderThanMs).toISOString();
      const awaiting = [
        JobStatus.invited,
        JobStatus.ready_for_review,
        JobStatus.clarification_needed,
        JobStatus.partially_acknowledged,
      ] as const;
      // Cast to satisfy Kysely's strict type for the `status` column — the
      // readonly array is correctly narrowed above.
      const rows = await (db
        .selectFrom('jobs')
        .selectAll()
        .where('status', 'in', awaiting as unknown as ReadonlyArray<'invited' | 'ready_for_review' | 'clarification_needed' | 'partially_acknowledged'>)
        .where('updated_at', '<', threshold)
        .orderBy('updated_at', 'asc')
        .limit(limit)
        .execute());
      const out: JobRow[] = [];
      for (const r of rows) out.push(await hydrateJob(db, r));
      return out;
    },

    async markStalled(jobId: JobId) {
      return db.transaction().execute(async (trx) => {
        const existing = await trx.selectFrom('jobs').selectAll().where('id', '=', jobId).executeTakeFirst();
        if (!existing) return null;
        const now = nowIso();
        await trx.updateTable('jobs')
          .set({ status: JobStatus.stalled, updated_at: now })
          .where('id', '=', jobId)
          .execute();
        await emitEvent(trx, jobId, 'job.stalled', null, { previousStatus: existing.status });
        const refreshed = (await trx.selectFrom('jobs').selectAll().where('id', '=', jobId).executeTakeFirst())!;
        return (await hydrateJob(trx, refreshed)).job;
      });
    },

    async __reset() {
      // Order matters because of FKs. job_events references jobs; we just
      // rely on CASCADE by deleting from jobs first.
      await db.transaction().execute(async (trx) => {
        await trx.deleteFrom('job_events').execute();
        await trx.deleteFrom('change_requests').execute();
        await trx.deleteFrom('acks').execute();
        await trx.deleteFrom('version_fields').execute();
        await trx.deleteFrom('versions').execute();
        await trx.deleteFrom('invites').execute();
        await trx.deleteFrom('participants').execute();
        await trx.deleteFrom('jobs').execute();
        await trx.deleteFrom('idempotency_keys').execute();
      });
    },
  };

  return repo;
}
