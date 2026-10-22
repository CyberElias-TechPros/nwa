-- NaWeAgree initial schema.
-- T-W2-01: replaces the in-memory store.
--
-- Design notes:
--   * All public IDs are text (opaque prefixed IDs like `job_xxx`).
--   * Timestamps are TIMESTAMPTZ (server writes ISO-8601 from app layer too,
--     defaulting to now() when omitted).
--   * acks / change_requests / job_events are append-only: triggers forbid
--     UPDATE and non-cascade DELETE on those tables (see bottom of file).
--   * versions can be UPDATE'd only on the `status` column (supersede flow);
--     content columns (content_digest, fields relation, reason, author)
--     are immutable after insert, enforced by a column-level trigger.
--   * `acks` is keyed by (version_id, participant_id) — new versions do NOT
--     inherit acks, enforcing the README invariant "consent is per-version".
--   * `invites.token` is a 22-byte base64url CSPRNG value (≈132 bits).

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category_key TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL,
  current_version_id TEXT,
  job_seq INTEGER NOT NULL DEFAULT 1,
  currency_code TEXT,
  open_change_count INTEGER NOT NULL DEFAULT 0,
  open_question_count INTEGER NOT NULL DEFAULT 0,
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  creator_participant_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  honorific TEXT,
  role TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'invited',
  email TEXT,
  email_verified_at TIMESTAMPTZ,
  device_key TEXT,
  joined_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS participants_job_id_idx ON participants(job_id);
CREATE INDEX IF NOT EXISTS participants_device_key_idx ON participants(device_key);
CREATE INDEX IF NOT EXISTS participants_email_idx ON participants(email);

CREATE TABLE IF NOT EXISTS versions (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  parent_version_id TEXT REFERENCES versions(id) ON DELETE SET NULL,
  author_participant_id TEXT REFERENCES participants(id) ON DELETE SET NULL,
  schema_version TEXT NOT NULL DEFAULT '1.0',
  template_version TEXT NOT NULL DEFAULT 'plain-1',
  content_digest TEXT NOT NULL,
  prev_digest TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, number)
);

CREATE INDEX IF NOT EXISTS versions_job_id_idx ON versions(job_id);

-- Versions circular FK is added after versions table exists.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_current_version_id_fkey') THEN
    ALTER TABLE jobs
      ADD CONSTRAINT jobs_current_version_id_fkey
      FOREIGN KEY (current_version_id) REFERENCES versions(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_creator_participant_id_fkey') THEN
    ALTER TABLE jobs
      ADD CONSTRAINT jobs_creator_participant_id_fkey
      FOREIGN KEY (creator_participant_id) REFERENCES participants(id) ON DELETE RESTRICT;
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS version_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id TEXT NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  value_raw TEXT,
  value_display TEXT,
  unit_or_currency TEXT,
  amount_minor BIGINT,
  status TEXT NOT NULL DEFAULT 'proposed',
  certainty TEXT,
  condition TEXT,
  visibility TEXT NOT NULL DEFAULT 'shared',
  material BOOLEAN NOT NULL DEFAULT FALSE,
  author_participant_id TEXT REFERENCES participants(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS version_fields_version_id_idx ON version_fields(version_id);

CREATE TABLE IF NOT EXISTS acks (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(version_id, participant_id)
);

CREATE INDEX IF NOT EXISTS acks_version_id_idx ON acks(version_id);
CREATE INDEX IF NOT EXISTS acks_participant_id_idx ON acks(participant_id);

CREATE TABLE IF NOT EXISTS invites (
  token TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  to_participant_id TEXT REFERENCES participants(id) ON DELETE SET NULL,
  to_role TEXT NOT NULL DEFAULT 'provider',
  to_display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS invites_job_id_idx ON invites(job_id);

CREATE TABLE IF NOT EXISTS change_requests (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  version_id TEXT NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
  author_participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  comment TEXT NOT NULL,
  proposed_fields JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS change_requests_job_id_idx ON change_requests(job_id);

CREATE TABLE IF NOT EXISTS job_events (
  id BIGSERIAL PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_participant_id TEXT REFERENCES participants(id) ON DELETE SET NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_events_job_id_idx ON job_events(job_id, created_at);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  request_hash TEXT NOT NULL,
  response_status SMALLINT NOT NULL,
  response_body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idempotency_keys_expires_at_idx ON idempotency_keys(expires_at);

CREATE TABLE IF NOT EXISTS devices (
  device_key TEXT PRIMARY KEY,
  email TEXT,
  email_verified_at TIMESTAMPTZ,
  push_endpoint TEXT,
  push_p256dh TEXT,
  push_auth TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only enforcement (gap G20).
--
-- acks / change_requests / job_events:
--   * DELETE is allowed only when fired from an FK cascade (job deletion
--     under NDPR/GDPR can still hard-delete) OR when the application sets
--     LOCAL SET nwa.allow_self_override = true (used to replace a
--     participant's own prior ack on the same version inside a transaction
--     — this is a re-statement, not tampering: the new ack is inserted in
--     the same txn and the full event history remains in job_events).
--   * UPDATE is forbidden entirely.
--
-- versions:
--   * DELETE same rule as above (cascade + self-override flag only).
--   * UPDATE allowed ONLY on the `status` column (draft → published →
--     superseded is a lifecycle transition, not a content mutation).
--
-- version_fields: immutable content, cascade-only delete.
CREATE OR REPLACE FUNCTION nwa_allow_override() RETURNS boolean AS $$
BEGIN
  RETURN current_setting('nwa.allow_self_override', true) = 'true';
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION nwa_block_append_only() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF pg_trigger_depth() <= 1 AND NOT nwa_allow_override() THEN
      RAISE EXCEPTION 'nwa: append-only table — cannot delete rows from %', TG_TABLE_NAME;
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'nwa: append-only table — cannot update rows in %', TG_TABLE_NAME;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION nwa_block_version_update() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF pg_trigger_depth() <= 1 AND NOT nwa_allow_override() THEN
      RAISE EXCEPTION 'nwa: versions cannot be deleted directly';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    -- Only allow changing status (e.g. published -> superseded).
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.job_id IS DISTINCT FROM OLD.job_id
      OR NEW.number IS DISTINCT FROM OLD.number
      OR NEW.parent_version_id IS DISTINCT FROM OLD.parent_version_id
      OR NEW.author_participant_id IS DISTINCT FROM OLD.author_participant_id
      OR NEW.schema_version IS DISTINCT FROM OLD.schema_version
      OR NEW.template_version IS DISTINCT FROM OLD.template_version
      OR NEW.content_digest IS DISTINCT FROM OLD.content_digest
      OR NEW.prev_digest IS DISTINCT FROM OLD.prev_digest
      OR NEW.reason IS DISTINCT FROM OLD.reason
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'nwa: versions are content-immutable — only status can change';
    END IF;
    RETURN NEW;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION nwa_block_vf_update() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF pg_trigger_depth() <= 1 AND NOT nwa_allow_override() THEN
      RAISE EXCEPTION 'nwa: version_fields cannot be deleted directly';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'nwa: version_fields are immutable once written';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'nwa_versions_immutable') THEN
    CREATE TRIGGER nwa_versions_immutable BEFORE UPDATE OR DELETE ON versions
      FOR EACH ROW EXECUTE FUNCTION nwa_block_version_update();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'nwa_version_fields_immutable') THEN
    CREATE TRIGGER nwa_version_fields_immutable BEFORE UPDATE OR DELETE ON version_fields
      FOR EACH ROW EXECUTE FUNCTION nwa_block_vf_update();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'nwa_acks_append_only') THEN
    CREATE TRIGGER nwa_acks_append_only BEFORE UPDATE OR DELETE ON acks
      FOR EACH ROW EXECUTE FUNCTION nwa_block_append_only();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'nwa_change_requests_append_only') THEN
    CREATE TRIGGER nwa_change_requests_append_only BEFORE UPDATE OR DELETE ON change_requests
      FOR EACH ROW EXECUTE FUNCTION nwa_block_append_only();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'nwa_job_events_append_only') THEN
    CREATE TRIGGER nwa_job_events_append_only BEFORE UPDATE OR DELETE ON job_events
      FOR EACH ROW EXECUTE FUNCTION nwa_block_append_only();
  END IF;
END$$;
