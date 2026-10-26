# 01 — Master Application Plan

**Product:** NaWeAgree — shared, editable plans and change history for custom work.
**Document status:** Delivery baseline v1.0. Supersedes the technical sections of the README's Part 5/6/10 for implementation purposes; does **not** supersede product intent, invariants, or research questions.
**Audience:** engineering leadership, backend, web, Android, QA, DevOps, security, design.
**Date:** 21 October 2026.

---

## Contents

1. [Scope and MVP boundary](#1-scope-and-mvp-boundary)
2. [Platform strategy](#2-platform-strategy)
3. [System architecture](#3-system-architecture)
4. [Repository and workspace layout](#4-repository-and-workspace-layout)
5. [Domain model](#5-domain-model)
6. [Data model](#6-data-model)
7. [Versioning, integrity, and schema evolution](#7-versioning-integrity-and-schema-evolution)
8. [API contract](#8-api-contract)
9. [Sync and offline protocol](#9-sync-and-offline-protocol)
10. [Identity, sessions, and access](#10-identity-sessions-and-access)
11. [AI subsystem](#11-ai-subsystem)
12. [Media pipeline](#12-media-pipeline)
13. [Notifications](#13-notifications)
14. [Privacy, security, retention, and deletion](#14-privacy-security-retention-and-deletion)
15. [Reliability, SLOs, and operations](#15-reliability-slos-and-operations)
16. [Environments, CI/CD, and release](#16-environments-cicd-and-release)
17. [Analytics and experimentation](#17-analytics-and-experimentation)
18. [Accessibility, language, and low-end devices](#18-accessibility-language-and-low-end-devices)
19. [Support and admin console](#19-support-and-admin-console)
20. [Cost model](#20-cost-model)
21. [Team, sequencing, and calendar](#21-team-sequencing-and-calendar)
22. [Risk register](#22-risk-register)
23. [Launch gates and definition of done](#23-launch-gates-and-definition-of-done)
24. [Decision log](#24-decision-log)

---

## 1. Scope and MVP boundary

### 1.1 Product in one paragraph

A customer and a service provider open a private **job room**, turn scattered details (text, voice notes, photos) into a structured **brief**, mark what is still unclear, publish an **immutable version**, and **acknowledge** that exact version as themselves. When something changes, they propose a change, see a before/after diff, and either accept it (creating a new version) or reject it (leaving the last mutually acknowledged version intact). Every action is attributed and readable later.

### 1.2 MVP must-have (P0)

| Area | Capability | Requirement source |
|---|---|---|
| Jobs | Create, title, category/template, status lifecycle, archive | FR-JOB-001…003 |
| Participants | Invite via expiring/revocable link, join, leave, revoke, roles | FR-JOB-004/005 |
| Brief | Structured fields with `unknown / draft / needs_clarification / conflicting / not_applicable / proposed / confirmed_in_version` | FR-BRF-001/002/005/006 |
| Versions | Immutable snapshot, sequential numbering, predecessor link, digest | FR-VER-001/003/005 |
| Acknowledgement | Self-only, version-bound, withdrawable as a new event | FR-VER-002/004/006 |
| Changes | Propose, diff, accept/reject/question/need-time, no timeout acceptance | FR-CHG-001…004 |
| Questions | Open question thread tied to a field or version | FR-CHG-005 |
| Closeout | Separate delivery/acceptance statements per participant; pause/cancel/archive | FR-STS-001…004 |
| Privacy | AI opt-out, export, deletion request, session management, abuse report | FR-PRV-001…005 |
| Notifications | In-app feed, email, push; SMS fallback for invite/first acknowledgement | (gap G-11) |
| Sharing | Read-only signed plan card (image/PDF) safe to send in WhatsApp | (gap G-10) |
| Ops | Admin read-only console with audited access, audit log, feature flags | (gap G-06) |

### 1.3 Explicitly deferred (P1/P2)

Payments, deposits, escrow, marketplace discovery, public profiles/ratings, provider verification badges, contract/legal document generation, dispute adjudication, multi-party (>2) jobs beyond a helper role, organisation/team accounts, WhatsApp bot, full offline collaboration, OCR of handwritten notes, in-app chat (structured questions only in MVP), recurring jobs, invoicing, accounting integrations, multi-currency conversion, USSD/SMS-only workflow.

### 1.4 Success definition for the first pilot

Pilot succeeds if, in a 6–8 week window across 2 categories and 30–50 real jobs:

- ≥ 60% of invited counterparties complete verification and open the job;
- ≥ 40% of jobs reach a **mutually acknowledged** version;
- ≥ 25% of jobs record at least one change request (proves the change loop is real, not decorative);
- median time from job creation to first shared version < 15 minutes on mobile;
- zero S1 security/privacy incidents; zero cases where a user was shown confirmed state that the server did not hold;
- support contacts < 0.3 per job.

Explicit stop criteria are in §23.5.

---

## 2. Platform strategy

### 2.1 Why both clients, and in which order

| Factor | Web/PWA | Native Android | Decision |
|---|---|---|---|
| Time to first user | Days (URL, no install) | Play review + install friction | **Web first** |
| Invite conversion | Best — link opens in WhatsApp browser | Requires install or Play page | Web first |
| Low-end Android reliability | Service worker eviction, no reliable background sync, shared storage | WorkManager, Room, encrypted DB | Android for retention-critical use |
| Camera/voice quality | Basic `getUserMedia`; inconsistent on cheap devices | CameraX, proper compression, MediaRecorder, TTS | Android |
| Receiving content from WhatsApp | Web Share Target (Android Chrome only) | `ACTION_SEND` intent (all devices) | Both, Android better |
| Notifications | Web Push unreliable on many Android browsers/Chinese OEMs | FCM reliable | Android |
| SEO / landing | Native strength | N/A | Web |
| Cost to build | 1 codebase | +1 codebase, +10 weeks | Sequential |

**Recommendation (D-01, D-02):** ship a mobile-first PWA first (weeks 1–17), then a native Kotlin/Compose app (weeks 6–18). If a Play Store listing is required before native is ready, publish a **Trusted Web Activity** wrapper that is explicitly labelled as a thin wrapper and removed at native launch. Do not attempt React Native/Flutter: the product needs no shared UI code as much as it needs native background sync, media, and Play quality, and the team skill assumption is TypeScript + Kotlin.

### 2.2 Shared versus client-specific

```text
Shared (single source of truth)
  ├─ OpenAPI 3.1 contract + generated TS and Kotlin clients
  ├─ Conformance fixture pack (JSON) used by backend, web, Android tests
  ├─ Design tokens (JSON → CSS variables and Compose theme)
  ├─ Copy/i18n keys (ICU MessageFormat)
  └─ Domain documentation (states, transitions, permission matrix)

Client-specific (must not be shared as code)
  ├─ Persistence (IndexedDB vs Room) — different transactional semantics
  ├─ Sync scheduling (Service Worker vs WorkManager)
  ├─ Auth transport (cookie BFF vs token + PKCE)
  └─ Navigation and components
```

Rationale: sharing *contracts and fixtures* catches divergence; sharing *business rules as code* creates a false sense of safety because the server remains authoritative. Every rule is enforced server-side and re-verified by client tests.

### 2.3 Feature parity policy

| Capability | Web | Android | Notes |
|---|---|---|---|
| Create job, edit brief, versions, acknowledge, changes, questions, closeout | ✅ | ✅ | Full parity |
| Offline draft editing | ✅ (IndexedDB) | ✅ (Room) | |
| Offline acknowledgement | ⚠️ queued, requires confirmation | ✅ queued | Never shows confirmed before server ack |
| Receive shared text/image from WhatsApp | ✅ Android Chrome only | ✅ all | Share target / ACTION_SEND |
| Voice note → transcript | ⚠️ upgrade path | ✅ | Web records only if MIME supported |
| Push notifications | ⚠️ best-effort | ✅ FCM | SMS fallback for critical events |
| Read-aloud (TTS) | ✅ Web Speech (if available) | ✅ platform TTS | Accessibility |
| Admin console | ✅ | ❌ | Web-only by design |
| Plan card image/PDF generation | ✅ | ✅ (share sheet) | |

Rule: **no client-only state that changes meaning.** If Android can queue an action, web must be able to queue it too, and both must resolve conflicts identically against the same server rule.

---

## 3. System architecture

### 3.1 Container view

```mermaid
flowchart TB
  subgraph Clients
    W[Web PWA<br/>Next.js]
    A[Android<br/>Kotlin + Compose]
  end

  subgraph Edge
    CDN[CDN / static]
    BFF[Next.js BFF<br/>session cookie]
    API[Hono API on Workers<br/>authz, domain, rate limit]
  end

  subgraph Core
    PG[(PostgreSQL<br/>Neon)]
    R2[(R2 private bucket)]
    Q[Queue<br/>outbox / AI / media]
    RD[(Redis / KV<br/>rate limit, cache, locks)]
  end

  subgraph Workers
    WK1[Notification worker]
    WK2[AI extraction worker]
    WK3[Media scan + transcode]
    WK4[Export / deletion worker]
  end

  subgraph External
    OTP[SMS / WhatsApp provider]
    MAIL[Email provider]
    FCM[FCM / Web Push]
    LLM[LLM + STT vendor]
  end

  W --> CDN
  W --> BFF --> API
  A --> API
  API --> PG
  API --> R2
  API --> Q
  API --> RD
  Q --> WK1 & WK2 & WK3 & WK4
  WK1 --> OTP & MAIL & FCM
  WK2 --> LLM
  WK3 --> R2
  WK4 --> PG
```

### 3.2 Trust boundaries

| Zone | Assets | Entry control |
|---|---|---|
| Z0 Client device | Session cookie, tokens, cached job content | Device lock, web sign-out, Android biometric app lock (optional), encrypted cache where available |
| Z1 Edge | TLS, WAF/rate limit, session validation | Cloudflare; strict CSP; narrow CORS (Android origin: none — token only) |
| Z2 Application | Domain rules, authorization | Every request re-authorizes object access in the service layer |
| Z3 Data | Postgres, R2 | Private network, least-privilege DB roles, no public buckets, signed URLs ≤ 5 min |
| Z4 Vendors | Inputs, outputs, identifiers | Contractual DPA, minimisation, region pinning, no training use |
| Z5 Ops | Admin console, logs | SSO + hardware key, break-glass with time-bound grant and audit |

### 3.3 Architectural decisions (ADRs to record)

- **ADR-101** Modular monolith, not microservices. Modules: `identity`, `jobs`, `brief`, `versions`, `changes`, `media`, `notifications`, `privacy`, `admin`.
- **ADR-102** PostgreSQL is the transactional source of truth. R2 is opaque blob storage. No business state in R2 metadata.
- **ADR-103** Transactional outbox for all side effects (notifications, AI jobs, exports, deletions). No dual writes.
- **ADR-104** Server owns the state machine. Clients may predict, never decide.
- **ADR-105** Monotonic per-job `job_seq` as the sync cursor and conflict token.
- **ADR-106** Read models are projections; the authoritative record is `job_versions.content_json` plus append-only events.
- **ADR-107** All IDs are opaque ULIDs/UUIDv7 (sortable, non-enumerable). No sequential integers in public APIs.
- **ADR-108** Every mutation carries an `Idempotency-Key`; retries are safe by construction.
- **ADR-109** Every shared write is checked against the expected `base_version_id` and `job_seq`; stale writes return `VERSION_CONFLICT`.

---

## 4. Repository and workspace layout

This repository presently contains only the README. The plan assumes a **monorepo** in this repo once implementation starts, isolated from any other product (D-13).

```text
nwa/
├─ README.md                      # product source of truth
├─ docs/                          # this plan set
├─ apps/
│  ├─ web/                        # Next.js App Router (PWA) + BFF
│  ├─ android/                    # Gradle project (Compose)
│  └─ admin/                      # admin console (Next.js, separate deployment)
├─ services/
│  └─ api/                        # Hono on Workers, modular monolith
│     ├─ src/modules/{identity,jobs,brief,versions,changes,media,notifications,privacy,admin}
│     ├─ src/platform/{db,queue,storage,crypto,http,logger,flags}
│     ├─ src/workers/{notify,extract,media,export}
│     └─ migrations/              # SQL, expand/migrate/contract
├─ packages/
│  ├─ contracts/                  # OpenAPI 3.1 + generated clients + error codes
│  ├─ domain/                     # shared types only (no rule execution)
│  ├─ fixtures/                   # conformance + seed + eval packs
│  ├─ design-tokens/              # JSON → CSS vars + Compose theme
│  ├─ i18n/                       # ICU message catalogues (en-NG, pcm, yo, ha, ig)
│  └─ testkit/                    # fakes, clock, id generators, log assertions
├─ infra/
│  ├─ terraform/                  # envs: dev, staging, prod
│  └─ runbooks/
└─ .github/workflows/
```

Rules: no cross-app imports; only `packages/*` is shared; `apps/web` may not import from `services/api/src` (contract only); migrations are append-only and never edited after merge.

---

## 5. Domain model

### 5.1 Aggregates

| Aggregate | Root | Consistency boundary |
|---|---|---|
| Identity | `User` | Account state, credentials, devices, preferences |
| Job | `Job` | Participants, current version pointer, state, seq |
| Version | `JobVersion` | Immutable content snapshot; never updated after insert |
| Change | `ChangeRequest` | Proposals + per-participant responses, terminal resolution |
| Media | `Attachment` | Scan state, access, retention |
| Notification | `NotificationDelivery` | Per-channel delivery attempts |

### 5.2 Job states and transitions

States (from README Part 3 §4.1): `draft`, `invited`, `clarification_needed`, `ready_for_review`, `partially_acknowledged`, `mutually_acknowledged`, `in_progress`, `completion_review`, `completed`, `paused`, `cancelled`, `archived`.

Implementation rules that the README implies but does not specify:

1. States are **derived** where possible: `partially_acknowledged` and `mutually_acknowledged` are computed from the current version's acknowledgement set, then persisted as `status` for indexing. A single function `deriveStatus(job, currentVersion, acks, changes)` is the only writer.
2. `in_progress` is only reachable from `mutually_acknowledged` **or** from a job where the creator explicitly recorded "work started before confirmation" (a real-world case; must not imply consent). This is an explicit `work_started_without_ack` flag with a warning, not a status.
3. `paused` stores `paused_from_state` so resume can re-evaluate whether the current version is still acknowledged.
4. `completed` requires either both participants reporting completion **or** one reporting completion plus explicit closeout (never by timeout).
5. `archived` hides from default lists; it is not deletion.
6. **Illegal transition** returns `409 STATE_TRANSITION_INVALID` with `{ currentStatus, allowedActions[] }` and never mutates.

Transition table (server-enforced; client mirrors for UX):

| From | Action | To | Preconditions |
|---|---|---|---|
| draft | `job.publish` | ready_for_review | ≥1 shared field; material fields either filled or explicitly `not_decided`; version created |
| draft | `invitation.create` | invited | email/phone verified for inviter |
| invited | `job.publish` | ready_for_review | as above |
| ready_for_review | `ack.reviewed` (any required) | partially_acknowledged | actor is active participant; version is current |
| ready_for_review / partially_acknowledged | `ack.reviewed` (all) | mutually_acknowledged | all required participants acked this exact version |
| mutually_acknowledged | `job.start` | in_progress | actor is participant |
| any active | `change.create` (material) | ready_for_review | new successor draft created |
| in_progress | `closeout.report` | completion_review | actor is participant |
| completion_review | `closeout.confirm` | completed | both reported complete, or explicit close |
| any non-archived | `job.pause` | paused | actor is participant |
| paused | `job.resume` | recomputed | re-check acks |
| any non-archived | `job.cancel` | cancelled | actor is participant; reason optional |
| completed/cancelled | `job.archive` | archived | actor is participant |

### 5.3 Roles and capabilities

Roles are **job-scoped**. Capabilities are checked by name, not role string, so future roles do not require rewriting endpoints.

| Capability | creator | participant | invited | helper | support | admin |
|---|---|---|---|---|---|---|
| `job.read_shared` | ✅ | ✅ | ❌ (preview only) | ✅ | ❌ | ❌ |
| `job.read_private_draft` | own | own | ❌ | own | ❌ | ❌ |
| `job.edit_draft` | ✅ | policy | ❌ | ❌ | ❌ | ❌ |
| `version.create` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `ack.write` | self | self | ❌ | self | ❌ | ❌ |
| `invitation.create/revoke` | ✅ | policy | ❌ | ❌ | incident only | ❌ |
| `change.propose/respond` | ✅ | ✅ | ❌ | respond only | ❌ | ❌ |
| `closeout.report` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `job.export` | ✅ | ✅ | ❌ | ❌ | approved purpose | ❌ |
| `job.archive/cancel` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `admin.audit_read` | ❌ | ❌ | ❌ | ❌ | ❌ | break-glass |

Job policy (per job, set at creation, visible to both parties): `who_can_edit_draft` (`creator_only` default), `who_can_invite` (`creator_only` default), `require_ack_to_start` (true default).

### 5.4 Field model

A field value is never just a scalar. Stored per field in a version:

```jsonc
{
  "key": "price_total",
  "label": "Price",
  "value_raw": "around 80k depending on wood",   // preserved, never normalised away
  "value_display": "≈ ₦80,000",                  // optional, user-approved normalisation
  "value_type": "money",
  "unit": "NGN",
  "amount_minor": 8000000,                        // integer minor units, only if parsed and confirmed
  "status": "needs_clarification",
  "certainty": "estimate",                        // exact | estimate | range | unknown
  "condition": "if additional materials are needed",
  "visibility": "shared",
  "material": true,
  "source": { "input_id": "inp_01H…", "span": [12, 44] },
  "author_participant_id": "par_…",
  "updated_at": "2026-10-21T09:14:00Z"
}
```

Hard rules:

- `value_raw` is immutable once in a version; edits create a new version.
- `amount_minor` MUST NOT be derived unless the currency and numeric parse are unambiguous **and** a human confirmed it.
- `status: confirmed_in_version` is only set by the version publication/acknowledgement process, never by AI.
- Field keys come from a versioned template (`tpl_tailoring@1.2.0`) or the `custom.*` namespace.
- Unknown field keys are rejected at write time when the version declares a template; accepted under `custom.*` with a length cap.

---

## 6. Data model

PostgreSQL 15+. All timestamps `timestamptz` UTC. All PKs `text` (ULID). All tables carry `created_at`, `updated_at` where mutable.

### 6.1 Core tables

```sql
-- identity
users(id pk, display_name, locale, timezone, account_status,
      ai_opt_out bool default false, created_at, updated_at, deleted_at)
user_contacts(id pk, user_id fk, kind enum('phone','email'), value_hash,
      value_encrypted, verified_at, is_primary bool, created_at)
credentials(id pk, user_id fk, kind enum('passkey','otp_secret','magic_link'),
      public_key jsonb null, sign_count int, label, created_at, last_used_at)
sessions(id pk, user_id fk, client enum('web','android'), device_label,
      refresh_token_hash, access_jti, created_at, last_seen_at,
      expires_at, revoked_at, ip_hash, ua_hash)
otp_challenges(id pk, contact_hash, code_hash, purpose, attempts int,
      expires_at, consumed_at, created_at)

-- jobs
jobs(id pk, creator_user_id fk, category_key, template_key, template_version,
      title, status, current_version_id fk null, job_seq bigint default 1,
      currency_code null, policy_json jsonb, work_started_without_ack bool,
      created_at, updated_at, closed_at, archived_at, retention_state,
      deleted_at)
job_participants(id pk, job_id fk, user_id fk null, role enum,
      state enum('invited','active','declined','left','revoked','removed'),
      invitation_id null, joined_at, left_at, revoked_at, created_at,
      unique(job_id, user_id) where user_id not null)
invitations(id pk, job_id fk, inviter_user_id fk, intended_contact_hash null,
      token_hash, role, created_at, expires_at, revoked_at, used_at,
      max_uses int default 1, use_count int default 0, status)

-- versioning
job_versions(id pk, job_id fk, version_number int, parent_version_id null,
      author_participant_id fk, schema_version, template_version,
      content_json jsonb, content_digest text, prev_digest text null,
      reason text, status enum('draft','published','superseded'),
      created_at, unique(job_id, version_number))
acknowledgements(id pk, job_id fk, version_id fk, participant_id fk,
      action enum('reviewed','question','disagree','need_time','withdrawn'),
      withdrawal_of_id null, client_context jsonb, created_at,
      unique(version_id, participant_id) where action <> 'withdrawn')

-- changes
change_requests(id pk, job_id fk, base_version_id fk, proposed_version_id fk null,
      proposer_participant_id fk, reason text, affected_fields text[],
      materiality enum('material','minor'), status enum('open','accepted','rejected','withdrawn','superseded'),
      created_at, resolved_at)
change_responses(id pk, change_request_id fk, participant_id fk,
      response enum('accept','reject','question','need_time','withdraw'),
      comment text, created_at, unique(change_request_id, participant_id))

-- questions
questions(id pk, job_id fk, version_id null, field_key null, asked_by fk,
      body text, status enum('open','answered','deferred','withdrawn'),
      created_at, resolved_at)
question_responses(id pk, question_id fk, participant_id fk, body text, created_at)

-- media and inputs
input_artifacts(id pk, job_id fk, created_by fk, kind enum('text','transcript','audio','document'),
      storage_key null, consent_state, processing_state, expires_at, created_at)
attachments(id pk, job_id fk, version_id null, uploader_id fk, object_key,
      mime_verified, byte_size, checksum, scan_state enum('pending','clean','blocked'),
      metadata_stripped bool, created_at, deleted_at)
field_sources(id pk, version_id fk, field_key, input_id null, attachment_id null,
      span int4range null, excerpt_hash null)

-- operations
activity_events(id pk, job_id fk, seq bigint, type, actor_participant_id null,
      actor_user_id null, payload jsonb, created_at, unique(job_id, seq))
outbox(id pk, topic, payload jsonb, dedupe_key unique, available_at,
      attempts int, last_error, processed_at)
notification_deliveries(id pk, job_id, recipient_user_id, purpose, channel,
      template_key, idempotency_key unique, status, attempts, sent_at, error_code)
privacy_requests(id pk, user_id, type, scope_json, status, verified_at,
      due_at, completed_at, evidence_note)
support_cases(id pk, reporter_user_id, job_id null, category, severity, status,
      created_at, resolved_at)
audit_log(id pk, actor_user_id, actor_kind, action, resource_type, resource_id,
      reason, ip_hash, created_at)   -- append-only, separate role, no content
feature_flags(key pk, description, enabled, rollout_pct, allowlist jsonb, updated_at)
schema_migrations(version, applied_at)
```

### 6.2 Constraints and indexes that carry invariants

- `unique(job_id, version_number)` — monotonic, gap-free numbering enforced in a transaction with `SELECT … FOR UPDATE` on `jobs`.
- `unique(version_id, participant_id) WHERE action <> 'withdrawn'` — one live action per participant per version; withdrawals are additional rows.
- `check (jsonb_typeof(content_json) = 'object')` and application-level schema validation before insert.
- Trigger `prevent_version_update()` — raises on `UPDATE`/`DELETE` of `job_versions` except setting `status='superseded'`.
- `current_version_id` FK must belong to same `job_id` — enforced by composite FK `(job_id, current_version_id) → (job_id, id)`.
- `unique(job_id, seq)` on `activity_events`; sequence allocated under the same transaction as the job mutation.
- Indexes: `jobs(creator_user_id, updated_at desc)`, `job_participants(user_id, state)`, `activity_events(job_id, seq desc)`, `change_requests(job_id, status)`, `questions(job_id, status)`, `outbox(available_at) where processed_at is null`, `notification_deliveries(status, attempts)`.
- Partial index `jobs(status) where deleted_at is null and archived_at is null`.

### 6.3 Deletion model

| Object | Mechanism | Restore window |
|---|---|---|
| Job (user-initiated) | Soft delete → `deletion_pending` for 7 days → purge job, versions, acks, media, AI artifacts | 7 days |
| Attachment | Immediate tombstone, object delete within 24 h, CDN purge | 24 h (no restore) |
| Account | 14-day grace, then anonymise profile, revoke sessions, keep job records where the other participant has a legitimate record (see §14.4) | 14 days |
| AI input artifacts | `expires_at` default 30 days after draft resolution; configurable to 7 for audio | n/a |
| Security logs | 90 days hot, 1 year cold, no content | n/a |
| Backups | PITR 7 days; deleted rows expire naturally; documented, never promised as instant | 7 days |

**Participant-conflict rule (gap G-09):** when one participant deletes their account, the other participant's record must survive. Implementation: replace identity with `Deleted participant` label, keep acknowledgements (they are events, not profile data), remove contact data, keep the job readable. Never delete the shared history unilaterally; explain this in the deletion UI *before* confirmation, and offer export first.

---

## 7. Versioning, integrity, and schema evolution

### 7.1 Canonicalisation

`content_digest = sha256(canonical_json(content_json))` where canonical JSON:

- keys sorted lexicographically (UTF-8 code point order);
- no insignificant whitespace; `,`/`:` separators only;
- numbers normalised (no `+`, no leading zeros, no `-0`, exponent-free within safe range);
- Unicode NFC normalised; no HTML escaping;
- `null` retained only where semantically meaningful, otherwise omitted;
- field array sorted by `key`.

`prev_digest` links each version to its predecessor, forming a per-job hash chain. Exposed in the API and in the plan card as a short fingerprint (first 12 hex chars) plus a plain-language line: *"This plan's fingerprint is 7f3a9c02b1de. It matches the version stored by NaWeAgree."* **Never** call this a legal proof or a signature.

### 7.2 Schema and template versioning (gap G-04)

- Every version stores `schema_version` (payload shape) and `template_version` (field catalogue).
- Field labels/ordering are **snapshotted** into the version so old versions render exactly as acknowledged, even if the template changes later.
- Renderers are schema-aware: unknown field keys render in an "Other details" group with original label and value; they are never dropped.
- Template upgrades are explicit: a job continues on its pinned `template_version`; upgrading requires a new version with a `reason: "template_upgraded"` and both parties see the field diff.
- Migration policy: additive only within a major version; breaking payload changes bump `schema_version` and ship a reader for N-1 for at least 12 months.

### 7.3 Version lifecycle

```text
draft (private, editable, never acknowledged)
  └─ publish → published (immutable, current)
        ├─ all required acks → mutually acknowledged (state flag, not a new row)
        └─ material change → successor draft → publish → previous becomes superseded
```

Only the **current published** version can receive acknowledgements. Acknowledgement of a superseded version returns `409 VERSION_SUPERSEDED` with a link to the current one.

---

## 8. API contract

### 8.1 Principles

- `/v1` prefix; JSON only; OpenAPI 3.1 is the contract, and TS + Kotlin clients are generated in CI with a drift check.
- Auth at edge; **authorization per object in the module service** (never trust a filter alone).
- All mutations require `Idempotency-Key` (UUIDv4) and, for job-scoped writes, `If-Match: <job_seq>` or `base_version_id`.
- Errors use one envelope; no stack traces, vendor messages, or existence leaks.
- Cursors are opaque, signed, and stable; default page size 20, max 100.
- Rate limits per user + per IP + per job (§8.6).
- Response includes `requestId`, `jobSeq` (for job resources), and `etag`.

### 8.2 Error envelope

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "This plan changed since you opened it. Review the latest version.",
    "requestId": "req_01J…",
    "retryable": false,
    "fields": [{ "path": "price_total.amount_minor", "code": "INVALID_CURRENCY" }],
    "details": { "currentJobSeq": 42, "currentVersionId": "ver_…" }
  }
}
```

Codes: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND_OR_NOT_VISIBLE`, `INVITATION_EXPIRED`, `INVITATION_REVOKED`, `INVITATION_EXHAUSTED`, `VALIDATION_FAILED`, `VERSION_CONFLICT`, `VERSION_SUPERSEDED`, `STATE_TRANSITION_INVALID`, `IDEMPOTENCY_REPLAY`, `RATE_LIMITED`, `UPLOAD_REJECTED`, `MEDIA_PENDING_SCAN`, `AI_UNAVAILABLE`, `AI_DISABLED`, `SYNC_REQUIRED`, `PRIVACY_REQUEST_PENDING`, `FEATURE_DISABLED`, `INTERNAL_ERROR`.

Rules: `404` is preferred over `403` when revealing existence is itself a leak; `VERSION_CONFLICT` always carries server state so the client can re-render; `retryable` drives client backoff.

### 8.3 Endpoint catalogue (MVP)

**Identity**
| Method | Path | Notes |
|---|---|---|
| POST | `/v1/auth/otp/start` | body `{channel, value, purpose}`; always 202; no enumeration |
| POST | `/v1/auth/otp/verify` | returns web session cookie or Android token pair |
| POST | `/v1/auth/magic-link/start` / `/v1/auth/magic-link/verify` | email path |
| POST | `/v1/auth/passkey/register/options` / `/verify` | post-first-job upgrade |
| POST | `/v1/auth/passkey/login/options` / `/verify` | |
| POST | `/v1/auth/refresh` | Android; rotating refresh |
| POST | `/v1/auth/logout` | revokes current session |
| GET | `/v1/me` | profile + preferences + `aiOptOut` |
| PATCH | `/v1/me/preferences` | locale, timezone, notification prefs |
| GET/DELETE | `/v1/me/sessions` / `/v1/me/sessions/:id` | device management |

**Jobs and participants**
| Method | Path | Notes |
|---|---|---|
| POST | `/v1/jobs` | `{title, categoryKey, templateKey?, policy?}` → draft |
| GET | `/v1/jobs?cursor&status&role` | role-scoped list with `nextAction` summary |
| GET | `/v1/jobs/:id` | aggregate: job, currentVersion, participants, acks, openChanges, openQuestions, capabilities, jobSeq |
| PATCH | `/v1/jobs/:id` | metadata only (title, policy); material changes require a version |
| POST | `/v1/jobs/:id/invitations` | role, channel, expiry → returns link once |
| DELETE | `/v1/jobs/:id/invitations/:inviteId` | revoke |
| POST | `/v1/invitations/:token/preview` | redacted preview, no auth required |
| POST | `/v1/invitations/:token/redeem` | requires authenticated session; binds participant |
| POST | `/v1/jobs/:id/participants/:pid/leave` | |
| POST | `/v1/jobs/:id/pause` `/resume` `/cancel` `/archive` | each audited |

**Brief, versions, acknowledgement**
| Method | Path | Notes |
|---|---|---|
| GET | `/v1/jobs/:id/draft` | private draft, author-only |
| PUT | `/v1/jobs/:id/draft` | replace draft fields; autosave-friendly, `If-Match: draftRev` |
| POST | `/v1/jobs/:id/versions` | publish draft: `{baseVersionId?, reason}` → immutable version |
| GET | `/v1/jobs/:id/versions?cursor` | summaries |
| GET | `/v1/jobs/:id/versions/:vid` | full content + digest + acks |
| POST | `/v1/jobs/:id/versions/:vid/acknowledgements` | `{action, comment?}`; server derives actor |
| POST | `/v1/jobs/:id/acknowledgements/:aid/withdrawal` | new row |
| GET | `/v1/jobs/:id/acknowledgements?versionId` | current state |

**Changes, questions, closeout**
| Method | Path | Notes |
|---|---|---|
| POST | `/v1/jobs/:id/change-requests` | `{baseVersionId, changes[], reason, materiality}` |
| GET | `/v1/jobs/:id/change-requests/:cid` | includes computed diff |
| POST | `/v1/change-requests/:cid/responses` | `{response, comment?}` |
| POST | `/v1/change-requests/:cid/withdraw` | proposer only |
| POST | `/v1/jobs/:id/questions` | `{body, fieldKey?, versionId?}` |
| POST | `/v1/questions/:qid/responses` | |
| POST | `/v1/jobs/:id/closeout` | `{state: delivered|received|follow_up|not_completed, note?}` |
| GET | `/v1/jobs/:id/closeout` | separate per-participant statements |

**Activity, media, export, privacy**
| Method | Path | Notes |
|---|---|---|
| GET | `/v1/jobs/:id/activity?cursor&types` | curated user-facing events |
| POST | `/v1/jobs/:id/attachments/upload-intent` | `{mime, bytes, role}` → signed PUT + attachment id |
| POST | `/v1/attachments/:id/complete` | triggers scan; returns `scanState` |
| GET | `/v1/attachments/:id/url` | 5-min signed GET; authz re-checked |
| DELETE | `/v1/attachments/:id` | tombstone + async purge |
| POST | `/v1/jobs/:id/inputs` | manual text/transcript |
| POST | `/v1/jobs/:id/extraction-jobs` | async; returns 202 + id |
| GET | `/v1/extraction-jobs/:id` | status, draft fields, warnings, provenance |
| GET | `/v1/jobs/:id/export?format=pdf|json|png` | async for pdf/png; JSON is sync |
| POST | `/v1/privacy-requests` | export/correct/delete |
| GET | `/v1/privacy-requests/:id` | |
| POST | `/v1/support-reports` | restricted scope |
| GET | `/v1/health` `/v1/ready` | liveness/readiness, no data |

**Admin (separate host, separate auth)**
`GET /admin/v1/support-cases`, `GET /admin/v1/privacy-requests`, `POST /admin/v1/break-glass` (reason, ticket, TTL ≤ 60 min), `GET /admin/v1/audit`, `POST /admin/v1/flags`.

### 8.4 Concurrency and idempotency

- `POST` with the same `Idempotency-Key` returns the original response (status + body hash stored 24 h, keyed by user + route).
- Version publish and acknowledgement are transactional: allocate `version_number`/`seq` → insert → update `jobs.current_version_id` & `job_seq` → insert outbox → commit.
- Clients send `If-Match: jobSeq`. Mismatch → `409 VERSION_CONFLICT` with fresh aggregate. No field-level auto-merge for material fields.
- The only auto-merge allowed: non-material metadata (title typo, notes) and private drafts, which are per-user and conflict-free by construction.

### 8.5 Pagination, filtering, caching

- Cursor = base64 of `{seq|created_at, id}`, HMAC-signed with a rotating key; invalid/expired returns `VALIDATION_FAILED`.
- `Cache-Control: no-store` on all authenticated job data; ETag support for aggregate GET.
- Static assets are immutable-hashed and CDN-cached; HTML shell is `no-cache` revalidated.

### 8.6 Rate limits (initial)

| Action | Limit |
|---|---|
| OTP start per phone/email | 5/hour, 20/day |
| OTP verify attempts | 5 per challenge, then invalidate |
| Invitation create | 20/day per user, 10/hour per job |
| Invitation redeem attempts | 10/hour per IP + token |
| Version publish | 30/hour per job |
| AI extraction | 20/day per user, 100/day per job |
| Upload | 30/hour per user, 200 MB/day |
| Export | 3/day per job |
| General API | 600 req/min per user, 120 req/min per IP |

Implemented with a token bucket in Redis/KV; `429` includes `Retry-After` and never reveals another user's data.

### 8.7 Webhooks and background jobs

- Transactional outbox → queue; handlers idempotent by `dedupe_key`.
- Provider webhooks (SMS delivery, FCM errors, LLM completion) verified by signature + timestamp window + replay store.
- Retry: exponential backoff (1 m, 5 m, 30 m, 2 h, 6 h), max 5, then dead letter + alert.
- Queue payloads contain IDs only, never content.

---

## 9. Sync and offline protocol

This is the highest-risk area (gap G-02). The design goal: **a client may be stale, but it may never claim a state the server does not hold.**

### 9.1 Model

- The server is a single-writer per job per moment; `job_seq` increments on every committed job mutation.
- Clients keep a local mirror: `job`, `currentVersion`, `participants`, `acks`, `changes`, `questions`, `activity` (last N), `pendingCommands[]`, `lastJobSeq`.
- Reads: `GET /v1/jobs/:id?since=<jobSeq>` returns a **delta** (changed entities + new events) or `{ unchanged: true }`.

### 9.2 Local mutations as commands

Every offline-capable action is a command with a client-generated `commandId` (ULID), `type`, `payload`, `baseVersionId`, `createdAt`, `attempts`.

| Command | Optimistic UI? | Server rule on replay |
|---|---|---|
| `job.update_metadata` | yes (low risk) | last-write-wins by `updatedAt` for title only |
| `draft.field.set` | yes (private to author) | replaces draft; no conflict possible across users |
| `version.publish` | no — show "publishing" | requires `baseVersionId`; conflict → keep draft, offer rebase |
| `ack.write` | **never show confirmed** — show "waiting to send" | requires exact `versionId`; if superseded → `VERSION_SUPERSEDED`, discard and prompt re-review |
| `change.create` | yes, marked pending | conflict on `baseVersionId` → attach to latest and flag for re-review |
| `change.respond` | yes, marked pending | idempotent per participant; later response supersedes earlier |
| `question.create` | yes | append-only, safe |
| `closeout.report` | yes, marked pending | idempotent per participant |

### 9.3 Ordering and conflict rules

1. Commands are executed **in creation order per job**; a failure halts later commands for that job (prevents ack-before-publish inversions).
2. `ack.write` is dropped (not retried) if the referenced version is no longer current; the user gets a "plan changed — please review" card. This is the single most important safety rule.
3. `version.publish` conflicts preserve the user's draft fields in a local recovery copy and present a 2-way choice: *publish on top of latest* (with a diff of what changed) or *discard my edit*.
4. No silent server-wins for material fields. Non-material title conflicts resolve by `updatedAt` and are logged in activity.
5. Duplicate `commandId` → server returns original result, client removes from queue.

### 9.4 Lifecycle

```text
queued → sending → (ok) → done
                 └→ (network) → backoff → retry
                 └→ (409 conflict) → needs_user → resolved | discarded
                 └→ (401) → paused_auth → after re-login resume
                 └→ (4xx permanent) → failed → surface with fix action
```

- Backoff: 5 s, 15 s, 1 m, 5 m, 15 m, capped; jitter ±20%; reset on connectivity.
- Queue persistence: IndexedDB (web), Room (Android). Reload/app-restart safe.
- Queue cap: 100 commands / 10 MB; beyond that, block new offline edits with a clear message.
- Expiry: commands older than 7 days require reconfirmation before sending.
- UI states surfaced everywhere: `Saved on this device`, `Sending…`, `Saved`, `Needs your attention (1)`.
- Sign-out clears queue after explicit warning ("1 change has not been sent").

### 9.5 Notification sync

Foreground refresh on app resume + SSE/WebSocket optional. MVP: polling with `since` on resume and after push receipt. FCM data message triggers `sync` (never carries content).

---

## 10. Identity, sessions, and access

### 10.1 Registration and sign-in

- **Phone-first OTP** (`en-NG` numbers normalised to E.164). Code 6 digits, 10-minute TTL, attempt-capped, constant-time compare.
- **Email magic link** as alternate; link single-use, 15-minute TTL, bound to a browser nonce to prevent link scanners consuming it.
- **Passkey** upgrade offered after a user's first mutually acknowledged job; never required.
- Optional password is **not** offered in MVP (recovery burden, phishing risk).
- Account merge: same verified phone or email links to existing account; conflicts require OTP on both.

### 10.2 Guest invite (D-08)

1. Invitee opens `/invite/:token` → sees **redacted preview**: inviter display name, category, generic title ("A tailoring job"), expiry, and what will be shared. No prices, addresses, or attachments.
2. To continue, they verify phone/email (OTP) — this creates or links an account.
3. Redemption is a single transaction: validate token (unexpired, unrevoked, uses left) → bind participant → increment `use_count` → issue session → emit event.
4. Token is 256-bit random, stored hashed; shown once; expiring (7 days default); revocable; rate-limited.
5. Tokens never contain PII or job content; a leaked token grants nothing without OTP.

### 10.3 Sessions

| | Web | Android |
|---|---|---|
| Access | httpOnly `__Host-` cookie, `Secure`, `SameSite=Lax`, 30 min idle / 12 h absolute; sliding with rotation | JWT access 15 min |
| Refresh | server-side session record; rotation on privilege change | rotating refresh token 60 days, reuse detection revokes family |
| Storage | cookie only; no tokens in JS | EncryptedSharedPreferences / Keystore |
| Revocation | per-device list, "sign out everywhere" | same |
| Step-up | re-OTP for export, deletion, contact change | biometric/device credential + re-OTP |

### 10.4 Android app lock

Optional 4-digit app PIN or biometric gate over the whole app (BiometricPrompt with device-credential fallback), plus `FLAG_SECURE` on job screens toggle ("hide in app switcher"), default on for jobs marked sensitive.

### 10.5 Authorization enforcement

- Middleware resolves `userId` only from session/token, never body.
- Each module exposes `authorize(capability, resource)`; a missing check is a test failure (see contract tests).
- Every query filters by `job_id` **and** membership; a second service-layer check catches filter mistakes.
- Cross-job ID substitution tests are part of CI (see `05`).

---

## 11. AI subsystem

### 11.1 Role

AI is a **drafting assistant**, offered behind a flag, disabled by default until evaluation gates pass. Manual entry is always available and always sufficient.

### 11.2 Pipeline

```text
authorize input → consent screen (which vendor, what is sent, retention)
→ minimise excerpt → injection screening → schema-constrained extraction
→ validate (allowed keys, span grounding, no fabricated numbers)
→ store private draft + provenance → human review UI → version publish (human)
```

### 11.3 Contract

```jsonc
{
  "schemaVersion": "extract/1",
  "fields": [{
    "fieldKey": "delivery_date",
    "candidateValue": null,
    "originalPhrase": "sometime before month end",
    "status": "ambiguous",          // present | absent | ambiguous | conflicting
    "certainty": "unknown",
    "sourceRef": "inp_01H…",
    "sourceSpan": [84, 112],
    "clarificationQuestion": "What specific date should we use?",
    "warnings": ["relative_or_non_specific_date"]
  }],
  "ignoredContent": ["account number mentioned"],
  "model": { "vendor": "…", "model": "…", "version": "…" }
}
```

Validation rejects: unknown field keys for the template, spans not present in the source, currency/quantity without a matching span, and any field with `status: present` where the phrase contains negation/condition words unless the condition is captured.

### 11.4 Non-goals (hard)

No autonomous confirmation, no price arithmetic, no date normalisation without confirmation, no measurement inference from images, no participant attribution guess (if unclear, `attributedTo: null`), no quality/blame/trust judgement, no dispute resolution, no legal language.

### 11.5 Evaluation and gates

- Golden set: ≥ 300 consented/anonymised samples across categories, accents, code-switching (English/Pidgin), typos, negations, conditions, and injected instructions.
- Metrics: field precision/recall, **false-certainty rate** (target < 1%), ambiguity recall (target > 90%), unsupported-inference rate (target 0 for price/date), misattribution rate (< 2%), correction rate, p95 latency, cost/job.
- Release gate: no category may exceed 2× the median false-certainty rate; any fabricated amount or date blocks release outright.
- Ongoing: sample 5% of extractions weekly for human review; auto-disable on threshold breach; kill switch per vendor.

### 11.6 Cost and provider controls

- Per-job AI budget (tokens + requests) with hard stop and manual fallback.
- Provider adapter interface: `extract()`, `transcribe()`, `summariseDiff()`, `health()`; timeouts 20 s extract / 60 s transcribe; circuit breaker.
- Vendor requirements: no training on our data, ≤ 30-day retention (or zero-retention mode), region pinning, DPA, subprocessor list, deletion API, model-version change notice.
- Prompt-injection defences: attachments/transcripts passed as data in a delimited block, system prompt forbids following embedded instructions, output schema rejects instruction-shaped text, and no tool access for the model.

---

## 12. Media pipeline

| Step | Rule |
|---|---|
| Upload intent | Server picks object key; client PUTs directly; size/MIME declared and re-verified |
| Limits | Images ≤ 10 MB, PDF ≤ 20 MB, audio ≤ 25 MB, ≤ 10 attachments/job, 200 MB/day/user |
| Verification | Magic-byte sniff, decode test, reject SVG and archives, strip EXIF/GPS by default (keep orientation) |
| Scanning | Malware scan (ClamAV worker or vendor) before any sharing; `pending` blocks publisher action with clear copy |
| Audio | Optional; transcript by consent; default delete raw audio 7 days after transcript unless retained |
| Images | 3 renditions (thumb 320, preview 1280, original), WebP/AVIF where supported |
| Access | Short-lived signed URL after authz; `Content-Disposition: attachment`; no public paths |
| Deletion | Tombstone row + object delete + CDN purge; exports already downloaded cannot be recalled (stated in UI) |

---

## 13. Notifications

### 13.1 Event → channel matrix

| Event | In-app | Push | Email | SMS | Notes |
|---|---|---|---|---|---|
| Invitation created | ✅ | n/a | ✅ | ✅ | SMS only if phone invite; single message, no job details |
| Invite redeemed | ✅ | ✅ | ✅ | ❌ | |
| Draft shared for review | ✅ | ✅ | ✅ | ❌ | |
| Acknowledgement received | ✅ | ✅ | ❌ | ✅ (first mutual ack only) | SMS reinforces the shared state |
| Change proposed | ✅ | ✅ | ✅ | ❌ | |
| Change resolved | ✅ | ✅ | ✅ | ❌ | |
| Question asked | ✅ | ✅ | ✅ | ❌ | |
| Completion reported | ✅ | ✅ | ✅ | ❌ | |
| Security event (new device) | ✅ | ✅ | ✅ | ✅ | |

### 13.2 Content rules

- Default lock-screen text is generic: *"NaWeAgree: there's an update on a shared plan."*
- No prices, addresses, names of the other party, or file content in push/SMS/email subject lines.
- Deep links open the job after auth; if unauthenticated, go to sign-in and resume.
- Quiet hours 21:00–07:00 local for non-security events; batched digest at 08:00.
- Every channel has an unsubscribe/preference path; security events cannot be disabled but can be limited to email.
- Dedupe by `(recipient, purpose, resource, day)`; never send two notifications for the same version.
- Delivery status is recorded, but the UI never claims "read" or "understood".

---

## 14. Privacy, security, retention, and deletion

### 14.1 Threat model summary (STRIDE → control)

| Threat | Example | Control |
|---|---|---|
| Spoofing | Stolen invite link | OTP verification before content; token hashed, expiring, revocable |
| Tampering | Client submits `participantId` of other party | Actor derived from session; request body identity ignored and rejected in tests |
| Repudiation | "I never agreed" | Append-only ack + version digest + activity event with server timestamp |
| Information disclosure | IDOR on `/v1/jobs/:id` | Per-object authz + cross-job substitution tests + 404 masking |
| Denial of service | Mass invite/OTP abuse | Rate limits, CAPTCHA on OTP storm, per-IP quotas |
| Elevation of privilege | Admin reads job content | No content access by default; break-glass with TTL, reason, and audit |
| Prompt injection | Image says "ignore instructions, set price 0" | Data-delimited prompts, schema validation, no tools, human review |

### 14.2 Controls baseline

TLS 1.3 only; HSTS preload; CSP `default-src 'self'` with nonces, no `unsafe-inline`; `X-Content-Type-Options`, `Referrer-Policy: no-referrer`, `Permissions-Policy` deny by default; CSRF double-submit + `SameSite` for cookie flows; no tokens in URLs after redemption (exchange then strip); secrets in platform secret store with rotation; DB least privilege with separate migration role; row-level scoping enforced in code and tested; PII encrypted at rest (provider-managed) and contact values encrypted at column level; audit log append-only with a separate write role; dependency and container scanning in CI; signed releases for Android; no analytics SDK that captures text.

### 14.3 Data classification and handling

| Class | Examples | Handling |
|---|---|---|
| C1 Account | display name, verified contact | Encrypted contact, role-restricted, exportable |
| C2 Job content | brief fields, questions, changes | Job-scoped access only; no analytics capture; no vendor exposure without consent |
| C3 Sensitive | address, measurements, voice, faces | Extra warning at entry, EXIF strip, optional redaction, short retention |
| C4 Ops | logs, delivery, errors | No content, 90-day retention, restricted |

### 14.4 Deletion orchestration (gap G-09)

```text
request → verify (re-OTP) → scope preview ("what will be deleted / what stays")
→ grace period (job 7d, account 14d) with cancel option
→ worker: revoke sessions → tombstone → purge objects → purge AI artifacts
→ anonymise shared history (keep acks as events, remove identity)
→ record completion + evidence note (no content)
→ backups expire by retention; document, never promise instant erasure
```

Edge cases handled explicitly: other participant's record survives; active change requests are withdrawn with a neutral system event; pending invitations revoked; exports already downloaded are out of scope and stated plainly.

### 14.5 Compliance workstream (NDPA-aligned, counsel to confirm)

Lawful basis mapping per purpose; privacy notice with plain-language summary; DPIA before real data; data-processing agreements with all vendors; records of processing; breach playbook with 72-hour assessment; user rights (access, correction, deletion, portability) with SLAs; children's data avoided by design (no age-gated features, no marketing to minors); cross-border transfer documentation; retention schedule approved; staff access policy and training; annual review. **No claim of compliance until counsel signs off.**

---

## 15. Reliability, SLOs, and operations

### 15.1 Service level objectives

| ID | SLO | Target | Measurement |
|---|---|---|---|
| SLO-1 | API availability (5xx-free) | 99.9% monthly | Edge logs |
| SLO-2 | Read p95 latency (job aggregate) | < 400 ms | Server histogram |
| SLO-3 | Write p95 latency (ack/publish) | < 700 ms | Server histogram |
| SLO-4 | Sync delta correctness | 100% (no false confirmed state) | Invariant monitor + chaos tests |
| SLO-5 | Notification delivery within 60 s | 99% | Delivery records |
| SLO-6 | Export job completion within 5 min | 99% | Worker metrics |
| SLO-7 | Media scan completion within 2 min | 95% | Worker metrics |
| SLO-8 | Data durability | RPO ≤ 5 min, RTO ≤ 4 h | Restore drill quarterly |

Error budget policy: if SLO-1 or SLO-4 budget is exhausted, feature work pauses until reliability work restores it.

### 15.2 Observability

- **Logs:** structured JSON, `requestId`, `jobId` (hashed), `userId` (hashed), latency, status, error code. **No field values, no message bodies, no tokens.**
- **Metrics:** RED per route, queue depth/age, outbox lag, AI latency/error/cost, scan backlog, ack state distribution, conflict rate, offline queue replay rate.
- **Traces:** OpenTelemetry spans across API → queue → worker; sampling 10%, always-on for errors.
- **Alerts:** SLO burn rate (2% and 5% windows), outbox lag > 5 min, dead letters > 0, scan backlog > 100, AI error rate > 20%, auth failure spike > 3× baseline, restore drill overdue.
- **Product invariant monitor:** a synthetic job runs every 5 minutes against staging and production-canary: publish → ack → change → reject → verify old version still current. Alarm on any deviation.

### 15.3 Runbooks (minimum)

1. **Suspected data exposure** — revoke sessions, rotate keys, assess scope, notify per policy, preserve audit, user comms.
2. **Wrong AI extraction at scale** — flip provider flag off, disable extraction, preserve drafts, notify affected users, review samples.
3. **Invitation/account compromise** — revoke token family, force re-OTP, inspect activity, notify.
4. **Queue backlog / notification storm** — pause producers, drain with rate limit, dedupe check.
5. **Database failover / restore** — promote replica, verify `job_seq` continuity, replay outbox.
6. **Delete request conflict** — freeze purge, legal hold flag, respond per policy.
7. **Play Store / web deploy rollback** — previous artifact, feature flag kill, cache purge.

### 15.4 Backup and DR

PITR 7 days (Neon branches), nightly logical dump to separate account/region, 30-day retention; quarterly restore drill with a documented RTO measurement; object storage versioning 30 days; DR runbook names decision owner and communication templates.

---

## 16. Environments, CI/CD, and release

### 16.1 Environments

| Env | Purpose | Data | Access |
|---|---|---|---|
| `local` | Dev | Synthetic fixtures | Everyone |
| `preview` | Per-PR deploy | Synthetic, seeded | Team |
| `staging` | Integration, E2E, load, a11y | Synthetic only, never production copies | Team + QA |
| `prod` | Real users | Real, region-pinned | Break-glass only |

Config via environment variables validated at boot (zod schema); no `.env` committed; secrets rotated quarterly and on incident.

### 16.2 Pipeline

```text
PR:  lint → typecheck → unit → contract drift check → schema lint → build
     → integration (ephemeral Postgres) → E2E smoke (web) → a11y scan
     → dependency + secret + SAST scan → preview deploy
Merge to main: full E2E → migration dry-run (forward + rollback) → staging deploy
Release: canary 5% (flag-gated) → 25% → 100%, error-budget gate at each step
Android: unit + lint + screenshot tests → signed AAB → internal → closed → staged 5/20/50/100
```

Gates: coverage ≥ 80% on `services/api/src/modules/**` and domain reducers; **100% of invariant tests green** (authorization, immutability, ack binding, idempotency); no new high/critical vulnerability; bundle and API size budgets met; changelog entry.

### 16.3 Migration discipline

Expand → migrate → contract. Every migration reversible or forward-only with a stated rollback plan. No destructive change in the same release as the code that stops using the column. Test on a production-sized snapshot (anonymised) before staging sign-off.

### 16.4 Feature flags

`ai_extraction`, `web_share_target`, `plan_card_pdf`, `sms_fallback`, `passkeys`, `android_offline_ack`, `read_aloud`, plus per-vendor AI switches and per-job kill switches. Flags are owned, documented, and removed within 2 sprints of full rollout.

---

## 17. Analytics and experimentation

### 17.1 Principles

No job content, no free text, no attachment names, no contact values. Pseudonymous `installId`/`userId` hash; consent-aware; EU/NG hosting; 13-month retention max; exportable opt-out. Analytics failures must never break the app.

### 17.2 Event schema (MVP)

| Event | Key properties |
|---|---|
| `user_signed_up` | method, locale |
| `job_created` | category, template, source (web/android), entry (`blank`/`template`/`share`) |
| `invite_sent` | channel, role |
| `invite_opened` | outcome (`preview`, `verify`, `redeem`, `expired`, `revoked`) |
| `draft_field_set` | field_key, input_mode (`manual`, `ai_accepted`, `ai_edited`, `ai_rejected`), status |
| `ai_extraction_requested` / `_resolved` | fields_suggested, fields_accepted, latency_bucket, error_code |
| `version_published` | version_number, material_fields_open, edit_count |
| `version_acknowledged` | action, time_since_publish_bucket, client |
| `change_proposed` | materiality, field_keys |
| `change_responded` | response, latency_bucket |
| `closeout_reported` | state |
| `offline_queue_flushed` | commands, failures, conflict_count |
| `export_requested` | format |
| `sync_conflict` | command_type, resolution (`rebased`, `discarded`, `needs_user`) |
| `app_error` | code, screen, client_version (no message content) |

North star: **jobs reaching mutually acknowledged state per week**. Guardrails: false-confirmed incidents (must be 0), invite-to-open rate, change rejection rate, support contacts per job, AI correction rate, p95 load time, crash-free sessions.

### 17.3 Experiment backlog

| ID | Hypothesis | Design | Primary metric |
|---|---|---|---|
| X-1 | Share-target intake (paste WhatsApp text/images) lifts job creation | 50/50 by cohort | jobs created per new user |
| X-2 | "Ask a question" before acknowledgement reduces rejections | 50/50 | ack completion, change rate |
| X-3 | Plan card image increases invite conversion | 50/50 | invite_opened rate |
| X-4 | Plain-language "read it back" summary improves mutual ack | 50/50 | mutual ack rate |
| X-5 | SMS fallback for first acknowledgement improves completion | geo-split | ack completion, cost per job |

Rules: no experiment may weaken an invariant; no dark patterns; opt-out respected; experiment assignment logged; stop rules for harm signals.

---

## 18. Accessibility, language, and low-end devices

### 18.1 Accessibility (WCAG 2.2 AA target)

- Semantic landmarks, one `h1` per route, logical heading order; visible focus with ≥ 3:1 contrast; keyboard-complete flows; Escape closes modals and restores focus.
- Status never communicated by colour alone: badge text + icon + `aria-label`.
- Touch targets ≥ 44×44 dp/CSS px; spacing ≥ 8 px.
- Support 200% text zoom and 320 CSS px width without horizontal scroll; reflow, not truncation.
- Live regions for save/sync/acknowledgement results (`aria-live="polite"`, assertive only for errors).
- Forms: labels, `aria-describedby` for hints and errors, error summary link, preserve input on failure.
- Reduced motion; no autoplay; captions/transcripts for audio; TTS read-back optional.
- Manual testing each release: VoiceOver (iOS Safari), TalkBack (Android), NVDA (desktop), keyboard-only, 200% zoom, high contrast.

### 18.2 Language and literacy

- ICU MessageFormat; no concatenated strings; plural/gender-safe; locale-aware dates and numbers, but **stored values never reformatted silently**.
- Launch `en-NG` + `pcm` (Nigerian Pidgin), then `yo`, `ha`, `ig` after native-speaker QA and back-translation review.
- Short sentences, common words, no jargon: "not decided yet" not "pending resolution"; "what changed" not "delta".
- Optional read-aloud on every summary; pronunciation of amounts spelled out ("eighty thousand naira").
- Never auto-translate user content; offer "translate this for me" as an explicit labelled action with a warning.

### 18.3 Low-end device and low-data strategy

| Constraint | Response |
|---|---|
| 2G/3G, high latency | ≤ 180 KB initial JS on web; delta sync; text-first; images only on demand |
| Data cost | "Data saver" mode: no images by default, ≤ 100 KB per screen; download-on-tap |
| 1–2 GB RAM Android | Compose baseline profile, no heavy DI at startup, images downsampled, avoid WebView |
| Storage pressure | Cache cap 50 MB web / 100 MB Android, LRU eviction, never evict unsent queue |
| Power cuts | Autosave every field change with debounce; crash-safe queue; no data loss on kill |
| Shared device | Quick sign-out, biometric app lock, "clear this device" |
| Old Android | minSdk 26 (Android 8); test on 2 GB RAM device and Android 8 emulator |

Budgets (web, 4G, mid-tier Android): LCP < 2.5 s, INP < 200 ms, CLS < 0.1, TTI < 3.5 s, first load ≤ 180 KB gzipped JS. Android: cold start < 1.8 s p50 / 3 s p90 on reference device, APK ≤ 12 MB, AAB download ≤ 8 MB.

---

## 19. Support and admin console

### 19.1 Principles

Support cannot read job content, cannot edit history, and cannot acknowledge on behalf of anyone. Every access is logged with reason and ticket.

### 19.2 Admin capabilities

| Capability | Default | Mechanism |
|---|---|---|
| View support case metadata | ✅ | role `support_agent` |
| View account metadata (status, sessions, flags) | ✅ | redacted |
| Read job content | ❌ | **break-glass**: reason + ticket + TTL 60 min + notification to security owner + audit entry |
| Revoke session / force re-OTP | ✅ | audited |
| Resend invitation (new token) | ✅ | never reveals old token |
| Process privacy request | ✅ | workflow with evidence |
| Edit acknowledgement/version | ❌ | impossible by design (no endpoint) |
| Delete job | ❌ | only via privacy workflow with dual approval |

### 19.3 Support workflow

Intake (in-app report, email, WhatsApp link) → triage by category/severity → macro response → resolution → optional follow-up. SLA targets: security/privacy 4 h first response; access broken 8 h; content/dispute 24 h; feature request 72 h. Macros must not ask users to send passwords, OTPs, or full job content.

---

## 20. Cost model

Use formulas, not invented prices; plug vendor quotes at Phase 0.

### 20.1 Monthly run-rate (pilot: ≤ 500 jobs/month)

| Line | Driver | Formula |
|---|---|---|
| Compute (Workers/Next host) | requests | `requests × price/1M` + fixed plan |
| Postgres | storage + compute hours | plan tier + `GB-month × price` |
| Object storage | uploads, renditions | `GB × price` + egress |
| SMS | invites + first acks | `messages × per-message` (segment-aware, 160 chars) |
| Email | notifications | `emails × per-1k` |
| Push | FCM/Web Push | negligible |
| AI extraction | optional | `jobs × avg tokens × price` + `audio minutes × price` |
| Observability | spans/logs | `GB ingested × price` |
| Total | | sum, target < 5% of projected revenue at pilot pricing |

### 20.2 Unit economics to track

Cost per active job, cost per mutually acknowledged job, SMS cost per invite, AI cost per accepted field, support minutes per job, storage per job at 12 months. Kill criteria: any of these exceeding modeled price per job by 2×.

### 20.3 Cost controls

Per-job AI budget; image rendition limits; log sampling; 90-day log retention; SMS only for invite/first-ack; staging torn down nightly; storage lifecycle rules (raw audio 7 days, orphan uploads 24 h).

---

## 21. Team, sequencing, and calendar

### 21.1 Assumed team (state explicitly so estimates are interpretable)

| Role | FTE | Notes |
|---|---|---|
| Product lead / designer | 1 | research + UX + copy |
| Tech lead / backend | 1 | architecture, authz, sync |
| Backend engineer | 1 | modules, workers, integrations |
| Web engineer | 1.5 | Next.js, PWA, admin console |
| Android engineer | 1 | from week 6 |
| QA / release engineer | 0.5 | automation + device lab |
| DevOps / security | 0.5 | IaC, CI, reviews, drills |
| Content/localization | 0.2 | copy, Pidgin review |

Total ≈ 6.7 FTE. With a smaller team, extend the calendar, not the scope per sprint.

### 21.2 Timeline (W0 = 2 Nov 2026)

| Phase | Weeks | Deliverable | Exit criterion |
|---|---|---|---|
| P0 Decisions | W0–W1 | ADR log, threat model, OpenAPI v0, design tokens, fixture pack | All D-01…D-15 DECIDED; contracts reviewed |
| P1 Foundation | W2–W5 | Auth, jobs, participants, invitations, manual brief, draft autosave | Two users complete a real invite→draft flow; authz tests green |
| P2 Version loop | W6–W8 | Immutable versions, acks, state machine, activity, offline queue v1 | Cannot produce a false mutual ack in chaos tests |
| P3 Change flow | W8–W9 | Change requests, diff, responses, closeout, notifications | Rejected change preserves prior version |
| P4 Media + privacy | W9–W11 | Attachments, export, plan card, deletion workflow, AI flag off | Export and deletion verified end to end |
| P5 Hardening | W12–W14 | A11y, performance, load, security review, runbooks, admin console | All launch gates in §23 pass |
| P6 Android | W6–W18 | Native client, offline engine, FCM, Play closed testing | Parity table §2.3 met; device matrix green |
| P7 Pilot → launch | W15–W22 | 30–50 real jobs, iterate, then public launch | Pilot success criteria met or explicit pivot |

Dependencies: P2 requires P1 authz; P3 requires P2 immutability; Android requires frozen contracts and P2 complete; AI enablement requires P4 consent + evaluation gate and can otherwise slip without blocking launch.

---

## 22. Risk register

| ID | Risk | Likelihood | Impact | Mitigation | Owner | Trigger |
|---|---|---|---|---|---|---|
| R-01 | Second participant never joins (chicken-and-egg) | High | High | Guest preview, plan card, share target, SMS invite, provider-led onboarding | Product | invite_opened < 40% |
| R-02 | Users perceive it as paperwork | High | High | Pre-filled from their own words, 5-field first screen, "not decided" everywhere | Design | draft→publish < 50% |
| R-03 | False "confirmed" state from sync bugs | Medium | Critical | Server-authoritative, command design, invariant monitor, chaos tests | Tech lead | any SLO-4 breach |
| R-04 | Data breach of sensitive job content | Low | Critical | Minimisation, no admin content access, encryption, pen test, break-glass | Security | any access anomaly |
| R-05 | AI hallucinates price/date and erodes trust | Medium | High | Off by default, schema validation, source spans, false-certainty gate | AI owner | any fabricated amount |
| R-06 | Low-end Android performance | High | Medium | Budgets, baseline profiles, device lab, TWA fallback | Android | p90 start > 3 s |
| R-07 | SMS cost or deliverability | Medium | Medium | Email/push first, SMS only for 2 events, provider fallback | Ops | cost/job > model |
| R-08 | Legal claim overreach | Medium | High | Copy review, no enforceability language, counsel sign-off | Product/legal | any "contract" claim |
| R-09 | Scope creep into marketplace/payments | High | Medium | Explicit non-goals, MoSCoW gate, ADR for scope change | Product | new P0 requested |
| R-10 | Vendor lock-in (AI, SMS, DB) | Medium | Medium | Adapters, portable SQL, export, exit plan | Tech lead | contract renewal |
| R-11 | Support can't resolve disputes | High | Medium | Set expectations in UX, no adjudication, human referral | Support | ticket volume |
| R-12 | Key-person dependency | Medium | High | Docs, ADRs, pair rotation, on-call shadowing | Lead | single reviewer |
| R-13 | Play policy rejection (sensitive data/permissions) | Low | Medium | Data-safety accuracy, minimal permissions, privacy policy | Android | first submission |
| R-14 | Offline queue data loss | Medium | High | Durable stores, never evict queue, conflict recovery copy | Both clients | any reported loss |
| R-15 | Analytics leaking content | Low | High | Allowlist event schema, CI scan for free text, no SDK autocapture | Web | any PII in events |

---

## 23. Launch gates and definition of done

### 23.1 Gate 0 — Build start

Contracts reviewed; threat model signed; retention policy approved in principle; Phase 0 decisions recorded; test strategy agreed.

### 23.2 Gate 1 — Private pilot (synthetic + 5 friendly jobs)

- All P0 features present; no S1/S2 defects; invariant test suite green in CI.
- A11y: keyboard-only core flow, screen-reader smoke on 2 platforms.
- Performance budgets met on reference mid-tier device over throttled 3G.
- Backups + restore drill completed once; runbooks written.
- Privacy notice, terms, and support channel live; deletion + export verified.
- Android internal track available (even if not required for pilot).

### 23.3 Gate 2 — Public launch

- ≥ 30 pilot jobs with success criteria met or documented deviation.
- Security review complete; high findings closed; pen test booked or completed.
- SLOs observed for 2 consecutive weeks within target.
- Crash-free sessions ≥ 99.5% (Android), web error rate < 0.5%.
- Support SLA staffed; incident drill completed (data exposure + restore).
- Play listing complete: data safety form, screenshots, privacy policy, content rating.
- Rollback rehearsed for web and Android.

### 23.4 Definition of done (per story)

Code reviewed by a second engineer; tests at the right level; contract updated and clients regenerated; migration reversible; a11y considered; analytics event added if relevant; docs/ADR updated; feature flag documented; no new TODO without an issue; demo recorded for UI changes; traceable to a requirement ID.

### 23.5 Stop / pivot criteria

Stop or pivot if, after 30–50 real jobs: invite conversion < 25%; mutual acknowledgement < 20%; fewer than 10% of jobs have any change activity; or participants report that the plan is not used after the job starts. Pivot options (in order): (a) provider-initiated "quote recap" only; (b) WhatsApp-native assistant rather than an app; (c) category-specific tool for the strongest vertical; (d) read-only record keeper for disputes.

---

## 24. Decision log

| ID | Decision | Status | Owner | Evidence needed to change | Date |
|---|---|---|---|---|---|
| D-01 | Next.js PWA first | DECIDED | Tech lead | — | 2026-10-21 |
| D-02 | Kotlin/Compose native Android after web | DECIDED | Tech lead | Native cost > 1.5× estimate | 2026-10-21 |
| D-03 | Server-authoritative domain | DECIDED | Tech lead | — | 2026-10-21 |
| D-04 | Hono/Workers + Postgres + R2 + Queues | PROVISIONAL | Tech lead | Scale or vendor constraint | 2026-10-21 |
| D-05 | Web BFF cookie sessions | DECIDED | Security | — | 2026-10-21 |
| D-06 | Android OAuth PKCE | DECIDED | Security | — | 2026-10-21 |
| D-07 | Phone OTP primary, email fallback, passkeys later | PROVISIONAL | Product | OTP cost/fraud data | 2026-10-21 |
| D-08 | Redacted guest preview + verification before content | PROVISIONAL | Product | Pilot drop-off data | 2026-10-21 |
| D-09 | Local-first drafts, server-confirmed shared state | DECIDED | Tech lead | Full offline need validated | 2026-10-21 |
| D-10 | AI off by default, flag + evaluation gate | DECIDED | AI owner | Evaluation thresholds met | 2026-10-21 |
| D-11 | Push+email primary, SMS for invite/first ack | PROVISIONAL | Ops | Delivery/cost data | 2026-10-21 |
| D-12 | Hash-chained immutable versions | DECIDED | Tech lead | — | 2026-10-21 |
| D-13 | Dedicated DB/bucket, no shared product data | DECIDED | Security | — | 2026-10-21 |
| D-14 | EU primary region | PROVISIONAL | Security | NDPC/counsel guidance | 2026-10-21 |
| D-15 | en-NG + pcm at launch | PROVISIONAL | Content | Translation QA capacity | 2026-10-21 |
| D-16 | PostgreSQL over D1 | DECIDED | Tech lead | — (D1 lacks the transactional/trigger features this design relies on) | 2026-10-21 |
| D-17 | No in-app chat in MVP; structured questions only | DECIDED | Product | Pilot demand | 2026-10-21 |
| D-18 | No payments in MVP | DECIDED | Product | — | 2026-10-21 |

> D-16 is a deliberate departure from the README's suggestion of Cloudflare D1. Reason: the version/ack/outbox transaction, composite foreign keys, partial unique indexes, and immutability triggers used here are materially easier and safer on PostgreSQL. Record as ADR-110 if accepted.
