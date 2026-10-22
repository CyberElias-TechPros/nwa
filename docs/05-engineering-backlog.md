# 05 — Engineering Backlog, Estimates, and Launch Checklist

**Purpose:** turn the master plan into a buildable backlog of epics, stories, and tasks with estimates, dependencies, a cross-client milestone plan, staffing plan, and a punch-list launch checklist.
**Estimation unit:** person-days (pd) for a mid-level engineer familiar with the stack. Ranges are 50% / 90% confidence.
**Date:** 21 October 2026.

---

## Contents

1. [How to read the estimates](#1-how-to-read-the-estimates)
2. [Team and capacity](#2-team-and-capacity)
3. [Epics and story breakdown](#3-epics-and-story-breakdown)
   - [E00 — Foundations / decisions](#e00--foundations--decisions)
   - [E01 — Platform and infrastructure](#e01--platform-and-infrastructure)
   - [E02 — Identity and access](#e02--identity-and-access)
   - [E03 — Jobs and participants](#e03--jobs-and-participants)
   - [E04 — Brief, templates, drafts](#e04--brief-templates-drafts)
   - [E05 — Versions and acknowledgements](#e05--versions-and-acknowledgements)
   - [E06 — Changes and questions](#e06--changes-and-questions)
   - [E07 — Activity and closeout](#e07--activity-and-closeout)
   - [E08 — Media and plan card](#e08--media-and-plan-card)
   - [E09 — Sync, offline, and reliability](#e09--sync-offline-and-reliability)
   - [E10 — Notifications](#e10--notifications)
   - [E11 — Privacy, security, admin](#e11--privacy-security-admin)
   - [E12 — Web client (PWA)](#e12--web-client-pwa)
   - [E13 — Android native client](#e13--android-native-client)
   - [E14 — AI subsystem (flagged off by default)](#e14--ai-subsystem-flagged-off-by-default)
   - [E15 — QA, performance, security, launch](#e15--qa-performance-security-launch)
   - [E16 — Pilot support and iteration](#e16--pilot-support-and-iteration)
4. [Cross-client milestone timeline](#4-cross-client-milestone-timeline)
5. [Cost model (build + run)](#5-cost-model-build--run)
6. [Traceability matrix (top-level)](#6-traceability-matrix-top-level)
7. [Launch checklist](#7-launch-checklist)
8. [Risk-burn and re-estimation cadence](#8-risk-burn-and-re-estimation-cadence)

---

## 1. How to read the estimates

- One person-day (pd) is ~6 hours of focused work, excluding meetings.
- **Backend** estimates assume one TypeScript engineer familiar with Hono, Postgres, and Cloudflare Workers.
- **Web** estimates assume a Next.js/React engineer at mid level.
- **Android** estimates assume a Kotlin/Compose engineer at mid level.
- **Design/copy** is included where it produces UI strings and flows; separate visual design work is called out per epic.
- **Review, QA, and bug fix** are included in each epic (~25% buffer); integration buffer across epics is in E15.
- Estimates do not include waiting on third-party vendors (legal review, SMS provider setup, Play Store review). Order those early.
- Confidence is highest for E00–E07 (well-defined); lower for E09, E13, E14.

---

## 2. Team and capacity

Reference team (from `01` §21.1):

| Role | FTE | Weeks available (W0–W17 for web; W6–W18 for Android) |
|---|---|---|
| Product / design / content | 1 | 18 |
| Tech lead (backend/architecture) | 1 | 18 |
| Backend engineer | 1 | 18 |
| Web engineer | 1.5 | 17 |
| Android engineer | 1 | 13 (W6–W18) |
| QA / release | 0.5 | 12 (W6+) |
| DevOps / security | 0.5 | 18 |
| Content / localization | 0.2 | 8 |

Total engineering capacity ≈ 6.7 FTE × 18 weeks ≈ 600 person-days before buffer. Total estimated work below is ~570 pd, so scope is roughly achievable on schedule assuming limited churn; a 20% buffer is added by padding E15.

If a role is missing (e.g. no Android engineer), phase Android to post-launch and ship PWA + TWA first; the TWA bridge is ~10 pd of extra work but costs ~6 weeks of calendar time.

---

## 3. Epics and story breakdown

Each story has: ID, name, acceptance summary, estimate (pd, split by backend/web/android where applicable), and dependencies.

### E00 — Foundations / decisions

Goal: every blocker decision (`01` §24 D-01…D-18) is recorded, vendors selected, contracts signed, legal path defined.

| ID | Story | Acceptance | BE | Web | An | Depends on |
|---|---|---|---|---|---|---|
| S-0001 | Write ADR log | 18 ADRs reviewed and DECIDED/PROVISIONAL | 2 | 1 | 1 | — |
| S-0002 | Threat model (STRIDE) + DPIA brief | Document reviewed by security lead + counsel | 3 | 0 | 0 | — |
| S-0003 | Select vendors and sign DPAs/contracts | Auth transport (Twilio/MessageBird or Termii, email Resend/SES), AI shortlist w/ DPA terms, FCM project, Cloudflare/Neon/R2 accounts, Sentry, analytics proxy | 4 | 0 | 1 | S-0002 |
| S-0004 | Domain, brand, trademarks | Name availability check, domain purchase, Play dev account, basic logo/wordmark | 0 | 1 | 0 | — |
| S-0005 | Repo bootstrap + monorepo skeleton | pnpm/turbo, packages (contracts, domain, fixtures, design-tokens, i18n, testkit), apps (web, android, api, admin), CI skeleton, codeowners | 3 | 2 | 2 | — |
| S-0006 | OpenAPI v0 + error codes + generated clients | Endpoints catalogued as YAML, TS/Kotlin clients regenerate in CI, drift check fails build | 5 | 1 | 2 | S-0005 |
| S-0007 | Design tokens v1 + contrast tests | Tokens JSON, CSS vars + Compose generator, contrast script in CI | 0 | 2 | 1 | S-0004 |
| S-0008 | Conformance fixture pack v1 | Seed jobs, conflict cases, edge payloads, shared between web/Android/API tests | 3 | 1 | 1 | S-0006 |
| S-0009 | Copy deck v1 (en-NG, pcm skeleton) | Core P0 screens copy-drafted, no "contract" language | 0 | 2 | 1 | S-0001 |
| **E00 total** |  |  | **20** | **10** | **9** |  |

### E01 — Platform and infrastructure

Goal: environments, database, CI/CD, observability, edge routing.

| ID | Story | Acceptance | BE | Web | An | Depends on |
|---|---|---|---|---|---|---|
| S-0101 | Terraform for dev/staging/prod (Workers, Neon, R2, Queues, KV) | Environments reproducible; preview deploy | 5 | 0 | 0 | S-0003 |
| S-0102 | Postgres schema + migrations framework | Append-only migrations; expand/migrate/contract; migrations tested forward+rollback | 5 | 0 | 0 | S-0101 |
| S-0103 | Hono API skeleton + modules (identity/jobs/...) + validation (zod) | `GET /v1/health`, `/v1/ready`, structured logging, error envelope | 5 | 0 | 0 | S-0006, S-0102 |
| S-0104 | Auth edge + service-to-service token minting for BFF | BFF proxy verified; no public API access without session/service token | 4 | 1 | 0 | S-0103 |
| S-0105 | CI pipelines (PR, main, release) for api/web/android | Lint/typecheck/unit/build; preview deploys; Android builds for staging | 3 | 2 | 2 | S-0005 |
| S-0106 | Observability: logs/metrics/traces, Sentry, SLO counters, synthetic cron | OTel pipeline, dashboards (availability, latency, queue, auth), synthetic invariant job | 5 | 1 | 1 | S-0103 |
| S-0107 | Transactional outbox + queue worker skeleton | Outbox insert in same tx as mutations; workers idempotent by dedupe_key | 5 | 0 | 0 | S-0103 |
| S-0108 | Idempotency middleware + idempotency store | Replayed key returns original result for 24 h | 3 | 0 | 0 | S-0103 |
| S-0109 | Rate limiter (token bucket in KV/Redis) | Per IP + per user + per job limits; 429 with Retry-After | 3 | 0 | 0 | S-0103 |
| S-0110 | Feature flag service | Edge-resolved flags with per-allowlist and rollout; admin-only write | 3 | 1 | 1 | S-0103 |
| **E01 total** |  |  | **41** | **5** | **4** |  |

### E02 — Identity and access

Goal: phone OTP, magic link, sessions, PKCE for Android, invitation verification, per-object authorization.

| ID | Story | Acceptance | BE | Web | An | Depends on |
|---|---|---|---|---|---|---|
| S-0201 | Users/contacts/credentials/sessions schema + migrations | Tables per `01` §6.1; encrypted contact value + hash index | 3 | 0 | 0 | S-0102 |
| S-0202 | OTP start + verify (SMS) | 6-digit code, 10-min TTL, attempt cap, no enumeration, constant-time compare, rate limits | 5 | 0 | 0 | S-0201, S-0109, S-0003 |
| S-0203 | Email magic link start + verify | Single-use, bound to browser nonce, 15-min TTL | 3 | 0 | 0 | S-0201 |
| S-0204 | Session management (web cookie + Android token pair) | Web httpOnly __Host- cookie, sliding/absolute timeouts; Android OAuth token endpoint with refresh rotation; session list and revoke | 6 | 2 | 3 | S-0104, S-0202 |
| S-0205 | Android AppAuth-Android PKCE integration | Token exchange, refresh serialisation in encrypted prefs, biometric lock hooks | 0 | 0 | 5 | S-0204 |
| S-0206 | Me/preferences/session list endpoints + UI | GET/PATCH /v1/me; session list with revoke; web and Android settings screens | 2 | 2 | 2 | S-0204 |
| S-0207 | Invitations: create, revoke, token (hashed), expiry, redacted preview | Invite token 256-bit; preview returns redacted info only; revoke invalidates | 5 | 0 | 0 | S-0204, E03 schema |
| S-0208 | Invitation redeem (OTP-gated) | Verify token, OTP, bind participant; transactional; prevents replay; rate limits | 4 | 0 | 0 | S-0207, S-0202 |
| S-0209 | Authorization middleware + capability matrix | Per-object check; middleware enforces actor from session; negative substitution tests | 5 | 0 | 0 | S-0204, S-0208 |
| S-0210 | Sign-in/verify/invite UI (web) | Sign-in, OTP code input w/ autocomplete, magic link, session management; invite preview page | 0 | 6 | 0 | S-0202–S-0208 |
| S-0211 | Sign-in/verify/lock UI (Android) | OTP, SMS Retriever, biometric/PIN lock, splash routing, session list | 0 | 0 | 8 | S-0205 |
| S-0212 | Passkey registration/login (post-first-job flag) | Credential Manager API + WebAuthn server endpoints; optional upgrade flow | 5 | 2 | 3 | S-0204 |
| **E02 total** |  |  | **38** | **12** | **21** |  |

### E03 — Jobs and participants

Goal: create jobs, list, overview, invite UX, job-scoped policy.

| ID | Story | Acceptance | BE | Web | An | Depends on |
|---|---|---|---|---|---|---|
| S-0301 | Jobs/participants/invitations schema + status derive function | Tables and state derivation function with tests per `01` §5.2 | 4 | 0 | 0 | S-0201 |
| S-0302 | Job CRUD endpoints (create, list, get, patch metadata, pause/resume/cancel/archive) | Authz, ETag, cursor pagination; metadata patch; state transitions validated | 5 | 0 | 0 | S-0301, S-0209 |
| S-0303 | Participant endpoints (invite create/revoke, leave, list) | Policy-driven, issuer scoped; revoke invalidates tokens | 4 | 0 | 0 | S-0301, S-0207 |
| S-0304 | Jobs list/home UI (web) | Needs action, active, completed; empty state; filters; deep link | 0 | 4 | 0 | S-0302 |
| S-0305 | Create-job flow (web) | Category, title, paste intake, save draft; no fake content | 0 | 5 | 0 | S-0302 |
| S-0306 | Job overview UI (web) | Status, current version summary, ack checklist, next action card, alerts | 0 | 5 | 0 | E04/E05 stubs |
| S-0307 | People/invite screen (web) | Participants, invite link copy, revoke, status | 0 | 3 | 0 | S-0303 |
| S-0308 | Jobs list/create/overview/people UI (Android) | Same coverage as web, Compose screens, bottom nav | 0 | 0 | 10 | S-0302 |
| S-0309 | Templates (category definitions) endpoint + UI | Category metadata; no schema edit UI in MVP | 2 | 2 | 2 | S-0302 |
| S-0310 | `work_started_without_ack` flag + honest copy | Setting this does not imply agreement; UI warns | 2 | 1 | 1 | S-0302 |
| **E03 total** |  |  | **17** | **20** | **13** |  |

### E04 — Brief, templates, drafts

Goal: field model, draft autosave, manual editing, field states (unknown/needs_clarification/conflicting/etc.), "not decided".

| ID | Story | Acceptance | BE | Web | An | Depends on |
|---|---|---|---|---|---|---|
| S-0401 | Field schema + per-template field definitions (v1 templates) | Field groups and rules from `01` §5.4; custom.* namespace accepted | 4 | 0 | 0 | S-0301 |
| S-0402 | Draft endpoints (GET/PUT) with draftRev concurrency | Private per author; autosave friendly; conflict for same author across tabs | 3 | 0 | 0 | S-0302 |
| S-0403 | Money/date/unit primitives + tests | Raw preserved; parsed only when confirmed; no silent normalisation | 3 | 0 | 0 | S-0401 |
| S-0404 | Brief editor UI (web) | Grouped field cards, states, "not decided", conflicts, autosave, unsaved-changes guard | 0 | 10 | 0 | S-0402, S-0403 |
| S-0405 | Paste intake + deterministic regex highlight (no AI) | Client-side highlight for amounts/dates; user confirms | 0 | 2 | 0 | S-0404 |
| S-0406 | Brief editor UI (Android) | Same as web, Compose, voice/keyboard input, autosave to Room | 0 | 0 | 10 | S-0402 |
| S-0407 | Draft persistence local layers (web IndexedDB, Android Room) | Survives reload/process death; per-user namespaced; cleared on sign-out | 0 | 3 | 3 | S-0404, S-0406 |
| **E04 total** |  |  | **10** | **15** | **13** |  |

### E05 — Versions and acknowledgements

Goal: immutable versions, hash chain, publish, acknowledgements, withdrawal, mutual derivation.

| ID | Story | Acceptance | BE | Web | An | Depends on |
|---|---|---|---|---|---|---|
| S-0501 | job_versions table, immutability trigger, content digest, monotonic numbering | Updates/deletes rejected; composite FK; unique(job_id, version_number) | 4 | 0 | 0 | S-0401 |
| S-0502 | Publish version endpoint | Transaction: allocate number, insert version, update jobs.current_version_id, increment job_seq, insert events + outbox; If-Match concurrency | 5 | 0 | 0 | S-0501, S-0107 |
| S-0503 | Acknowledgements endpoint + withdrawal | Actor from session; unique per version/participant; withdrawal creates new row; server derives status | 4 | 0 | 0 | S-0501 |
| S-0504 | Version list/detail endpoints | Summary, full content, acks, digest | 2 | 0 | 0 | S-0501 |
| S-0505 | Version immutability + ack invariant tests | Direct SQL attempts fail; cross-job acks fail; stale ack returns 409 | 3 | 0 | 0 | S-0502, S-0503 |
| S-0506 | Version/ack UI (web) | Version list, version detail, ack checklist, ack dialog naming the version; withdraw; accessibility | 0 | 8 | 0 | S-0503, S-0504 |
| S-0507 | Version/ack UI (Android) | Same coverage, Compose, TalkBack labels, sync-aware ack button | 0 | 0 | 8 | S-0503, S-0504 |
| **E05 total** |  |  | **18** | **8** | **8** |  |

### E06 — Changes and questions

Goal: propose change, diff, accept/reject/ask/need-time, open questions, no silent overwrite.

| ID | Story | Acceptance | BE | Web | An | Depends on |
|---|---|---|---|---|---|---|
| S-0601 | change_requests/responses, questions tables | Constraints, transitions | 3 | 0 | 0 | S-0501 |
| S-0602 | Create change endpoint; diff computation | Creates successor draft; material vs minor; diff metadata; base version check | 4 | 0 | 0 | S-0601 |
| S-0603 | Respond to change endpoint | Accept/reject/question/need-time/withdraw; accept creates new version via transaction; reject preserves prior | 5 | 0 | 0 | S-0602, S-0502 |
| S-0604 | Questions endpoints (ask, respond, list, status) | Field/version binding; append-only responses | 3 | 0 | 0 | S-0601 |
| S-0605 | Diff algorithm + tests (text-based, accessible) | Returns structured per-field diff; accessible before/after text | 3 | 0 | 0 | S-0501 |
| S-0606 | Changes UI (web): list, detail, diff, responses, accept/reject/question dialogs | Old version preserved; material copy explicit | 0 | 7 | 0 | S-0603, S-0605 |
| S-0607 | Questions UI (web) | List, composer, responses, defer | 0 | 3 | 0 | S-0604 |
| S-0608 | Changes UI (Android) | Same as web, card-based diff on small screens; TalkBack labels | 0 | 0 | 7 | S-0603, S-0605 |
| S-0609 | Questions UI (Android) | Same as web | 0 | 0 | 3 | S-0604 |
| **E06 total** |  |  | **18** | **10** | **10** |  |

### E07 — Activity and closeout

Goal: user-facing timeline, filters, closeout (separate per-participant delivery/acceptance), pause/cancel/archive.

| ID | Story | Acceptance | BE | Web | An | Depends on |
|---|---|---|---|---|---|---|
| S-0701 | Activity event model + append helper | Append-only, no content in events; per-job seq ordering | 3 | 0 | 0 | S-0502 |
| S-0702 | Activity endpoint (cursor, filters) | Capped page, secure event payload | 2 | 0 | 0 | S-0701 |
| S-0703 | Closeout endpoints | Per-participant delivery/follow-up/not-completed; separate view; completion_review → completed transition | 4 | 0 | 0 | S-0701 |
| S-0704 | Activity/history UI (web) | Timeline grouped by day, filters, export menu | 0 | 4 | 0 | S-0702 |
| S-0705 | Closeout UI (web) | My state / other state columns, note, submit; pause/cancel/archive | 0 | 3 | 0 | S-0703 |
| S-0706 | Activity/closeout UI (Android) | Same coverage; export via Android Sharesheet | 0 | 0 | 6 | S-0702, S-0703 |
| **E07 total** |  |  | **9** | **7** | **6** |  |

### E08 — Media and plan card

Goal: attachments (private, scanned, signed), voice notes, export, signed plan card (image/PDF).

| ID | Story | Acceptance | BE | Web | An | Depends on |
|---|---|---|---|---|---|---|
| S-0801 | Attachments schema + object storage integration | R2 private bucket; signed upload intent; mime/bytes verified; scan state | 4 | 0 | 0 | S-0101 |
| S-0802 | Upload-intent / complete / signed-URL endpoints | 5-min signed URL; URL endpoint re-checks authz | 3 | 0 | 0 | S-0801 |
| S-0803 | Media scan worker (ClamAV) and state transitions | Pending blocks sharing; quarantined blocks; admin alert | 3 | 0 | 0 | S-0801, S-0107 |
| S-0804 | EXIF/metadata stripping + image renditions (thumb, preview, original) | GPS stripped; orientation preserved; WebP/AVIF where supported | 2 | 0 | 0 | S-0801 |
| S-0805 | Export endpoint (JSON sync, PNG card, PDF) — async worker | PDF/PNG produced server-side (Chromium worker or SVG→image); watermark-free, fingerprint visible | 5 | 0 | 0 | S-0504, S-0107 |
| S-0806 | Files screen + upload component (web) | Image capture, file picker, upload progress, signed-image rendering, thumbnails | 0 | 6 | 0 | S-0802 |
| S-0807 | Files screen + camera/voice/gallery (Android) | CameraX capture, MediaRecorder voice, Photo Picker, Coil rendering, foreground upload worker | 0 | 0 | 12 | S-0802, S-0211 |
| S-0808 | Plan card preview + download/share (web) | Responsive card, fingerprint line, PDF/PNG download, WhatsApp share | 0 | 4 | 0 | S-0805 |
| S-0809 | Plan card share via FileProvider (Android) | PNG/PDF cached locally and shared via Sharesheet | 0 | 0 | 2 | S-0805 |
| S-0810 | Share target (Web Share Target + Android ACTION_SEND) intake | Payload persistence; create-from-share; survival across reload/process death; purge after 1 h | 1 | 3 | 3 | S-0402, S-0801 |
| **E08 total** |  |  | **18** | **13** | **17** |  |

### E09 — Sync, offline, and reliability

Goal: offline queue for both clients with the protocol from `01` §9; never show false confirmed state.

| ID | Story | Acceptance | BE | Web | An | Depends on |
|---|---|---|---|---|---|---|
| S-0901 | Delta endpoint (`GET /jobs/:id?since=seq`) and ETag support | Returns changed entities or unchanged; monotonic per-job seq | 3 | 0 | 0 | S-0502 |
| S-0902 | Conflict payloads and conflict resolution endpoints | 409 returns server state and resolution path | 2 | 0 | 0 | S-0901 |
| S-0903 | Conflict resolver logic (server + client shared rules in fixtures) | Rules per `01` §9.3; drop ack on superseded; rebase for publish | 3 | 2 | 2 | S-0902, S-0008 |
| S-0904 | Web sync engine: IndexedDB, command queue, executor, status bar, multi-tab locks, auth pause | Durable queue; persisted draft; status bar UI; never shows false confirmed | 0 | 10 | 0 | S-0903, S-0407 |
| S-0905 | PWA manifest, service worker (Serwist), install prompt, offline shell | App-shell installable; API never cached in SW; sign-out clears DB | 0 | 4 | 0 | S-0904 |
| S-0906 | Android sync engine: Room outbox, WorkManager workers, constraints, foreground service for large uploads | Reboot/Doze safe; per-job mutex; backoff; queue UI chip | 0 | 0 | 12 | S-0903 |
| S-0907 | Chaos/offline test harness (Playwright + WorkManager test driver) | Tests in `02` §19.3 critical cases + Android equivalent | 2 | 4 | 3 | S-0904, S-0906 |
| S-0908 | Invariant synthetic monitor (cron) | Publishes/acks/changes/rejects every 5 min; alerts on any drift | 2 | 0 | 0 | S-0901 |
| S-0909 | Deletion/draft purge/cleanup workers | Grace period; orphan uploads 24 h; raw audio 7 days; queue expiry 7 days | 3 | 0 | 0 | E08, E11 |
| **E09 total** |  |  | **15** | **20** | **17** |  |

### E10 — Notifications

Goal: in-app, email, push (FCM/Web Push), SMS fallback for two events; no sensitive content on lock-screen.

| ID | Story | Acceptance | BE | Web | An | Depends on |
|---|---|---|---|---|---|---|
| S-1001 | Notification delivery model, templates, preferences, quiet hours | Per-channel, dedupe, template renderer, content-free payloads | 5 | 0 | 0 | S-0107 |
| S-1002 | Email worker (SES/Resend) | Templated HTML+text, one-click unsubscribe, delivery status | 3 | 0 | 0 | S-1001, S-0003 |
| S-1003 | SMS worker (Termii/Twilio) for invite + first mutual ack only | Per-job budget, send window, delivery receipts | 3 | 0 | 0 | S-1001, S-0003 |
| S-1004 | FCM integration (data-only) + token refresh endpoints | Token lifecycle; data-only; no content in payload; per-channel preference check | 3 | 0 | 2 | S-1001 |
| S-1005 | Web Push + notification permission UX | Ask after first publish; generic lock-screen text; in-app centre | 1 | 4 | 0 | S-1001 |
| S-1006 | Android notification channels + deep-link handling + quiet hours | Channels per `03` §17; tap routes to correct screen; no sensitive content | 0 | 0 | 4 | S-1004 |
| S-1007 | In-app notification centre UI (both clients) | List, badge count, mark read | 0 | 2 | 2 | S-1001 |
| S-1008 | Notification preferences UI (both clients) | Channel toggles, quiet hours, SMS fallback toggle | 0 | 2 | 2 | S-1001 |
| **E10 total** |  |  | **15** | **8** | **10** |  |

### E11 — Privacy, security, admin

Goal: privacy requests, abuse reports, audit log, read-only admin console, CSP/headers, final hardening.

| ID | Story | Acceptance | BE | Web | An | Depends on |
|---|---|---|---|---|---|---|
| S-1101 | Privacy request workflow (export/correct/delete) + worker | Re-auth, scope preview, grace period, evidence note, orchestration | 6 | 0 | 0 | S-0701, S-0801 |
| S-1102 | Participant-conflict deletion (anonymise but preserve other record) | Tests cover the G-09 case | 3 | 0 | 0 | S-1101 |
| S-1103 | Support report + abuse category endpoint + restricted storage | Capped content; staff access rules | 3 | 0 | 0 | S-0209 |
| S-1104 | Audit log + break-glass admin auth | Append-only, separate role; break-glass TTL 60 min; security owner notified | 5 | 0 | 0 | S-0209 |
| S-1105 | Admin console (Next.js app, separate origin) | Read-only cases list, privacy request processing, session revoke, flag edit, break-glass button; no content access by default | 2 | 8 | 0 | S-1104 |
| S-1106 | Security headers, CSP, cookie flags, CSRF, open-redirect protection, certificate pinning | Web headers per `02` §15; Android TLS pinning and CT | 2 | 2 | 2 | S-0104, S-0204 |
| S-1107 | Privacy/settings/delete screens (web + Android) | AI opt-out, export request, delete request walkthrough, sessions | 1 | 4 | 4 | S-1101 |
| S-1108 | Runbooks + incident role docs (7 runbooks per `01` §15.3) | Drills scheduled; contacts listed | 2 | 0 | 0 | S-0106 |
| **E11 total** |  |  | **24** | **14** | **6** |  |

### E12 — Web client (PWA)

Goal: marketing pages, PWA polish, a11y, performance, i18n, error handling, admin shell (admin in S-1105).

| ID | Story | Acceptance | BE | Web | An | Depends on |
|---|---|---|---|---|---|---|
| S-1201 | Marketing pages (/, /how-it-works, /privacy, /accessibility, /help) | Static, SEO, LCP < 2.0 s, honest copy, no fake stats | 0 | 6 | 0 | S-0009 |
| S-1202 | Design system components (primitives + domain) | All components with states, previews, a11y names | 0 | 8 | 0 | S-0007 |
| S-1203 | Accessibility pass (keyboard, TalkBack/NVDA smoke, contrast, zoom) | Zero serious axe issues across P0 routes | 0 | 5 | 0 | all web UIs |
| S-1204 | Performance pass (bundle budgets, code splitting, images, fonts, baseline) | Budgets from `02` §14 met; Lighthouse CI green | 0 | 5 | 0 | all web UIs |
| S-1205 | Error handling + error boundaries + PII scrubbed Sentry | Every route has error state; request IDs surfaced | 0 | 3 | 0 | S-0106 |
| S-1206 | i18n (en-NG + pcm) with ICU + pseudo-locale build | All P0 strings reviewed; pseudo-locale catches hardcoded strings | 0 | 3 | 0 | S-0009 |
| S-1207 | TWA bridge (optional if Android slips) | Thin launcher targeting PWA, Play listing; removed at native launch | 0 | 1 | 3 | S-1201 |
| **E12 total** |  |  | **0** | **31** | **3** |  |

### E13 — Android native client

Goal: end-to-end native client with offline sync, FCM, camera/voice/share, Play release. Stories above cover the domain screens; this epic covers the Android-platform pieces.

| ID | Story | Acceptance | BE | Web | An | Depends on |
|---|---|---|---|---|---|---|
| S-1301 | Project scaffold, Gradle, Hilt, Compose theme, tokens, CI, benchmark module | App builds to device; screenshot tests; CI | 0 | 0 | 5 | S-0005, S-0007 |
| S-1302 | Room schema + migrations + encrypted DB | Schema matches API; migrations tested; SQLCipher in prod | 0 | 0 | 4 | S-0102 |
| S-1303 | Retrofit client + interceptors (auth, idempotency, errors, pinning) | Auth refresh serialised; cert pinning | 0 | 0 | 4 | S-0204 |
| S-1304 | Navigation (typed) + deep links + process-death restore | Deep links open correct screens; state survives death | 0 | 0 | 3 | S-0211 |
| S-1305 | Biometric/PIN lock, FLAG_SECURE, EncryptedSharedPreferences, keystore | App lock optional; PIN fall-back; secure by default | 0 | 0 | 4 | S-0211 |
| S-1306 | FCM service + notification channels + in-app centre | Data-only messages; channels; deep links; quiet hours | 0 | 0 | 4 | S-1004 |
| S-1307 | CameraX, MediaRecorder, Coil, Photo Picker, FileProvider | Capture, playback, compression, uploads work on reference devices | 0 | 0 | 6 | S-0807 |
| S-1308 | Share intent receiver + ShareInbox | ACTION_SEND and SEND_MULTIPLE; persists; resumes after auth | 0 | 0 | 3 | S-0810 |
| S-1309 | TTS read-aloud, large-fonts, TalkBack, accessibility pass | Accessibility Scanner zero serious; TTS works for summary | 0 | 0 | 4 | domain UIs |
| S-1310 | Baseline profiles, performance tuning, R8, ABI splits, size budgets | Cold start and jank budgets met on reference 2 GB device | 0 | 0 | 4 | all Android UIs |
| S-1311 | Play signing, data-safety form, internal/closed testing rollout | Internal track live; pre-launch report reviewed | 0 | 0 | 3 | S-1310 |
| **E13 total** |  |  | **0** | **0** | **44** |  |

*(Domain UI work for Android lives in E02–E08 and E10–E11.)*

### E14 — AI subsystem (flagged off by default)

Goal: build the AI adapter and evaluation infrastructure before enabling it; do not block MVP launch.

| ID | Story | Acceptance | BE | Web | An | Depends on |
|---|---|---|---|---|---|---|
| S-1401 | AI extraction adapter interface (no vendor selected) + failure contract | Timeouts, circuit breaker, schema validation | 3 | 0 | 0 | S-0107 |
| S-1402 | Extraction-job endpoints + worker | Async jobs, status, provenance, warnings | 4 | 0 | 0 | S-1401 |
| S-1403 | Prompt-injection defence + output validation tests | Adversarial fixtures; no fabricated numbers, spans, or attributions | 3 | 0 | 0 | S-1402 |
| S-1404 | Consent screen + AI opt-out + AI draft UI (web) | Transparent "Simulated/draft" labels; per-field accept/edit/reject | 0 | 5 | 0 | S-1402 |
| S-1405 | AI draft UI (Android) | Same as web | 0 | 0 | 4 | S-1402 |
| S-1406 | Evaluation harness + golden set (≥300 consented/anonymised samples) | Precision/recall/false-certainty/misattribution metrics; threshold gate | 4 | 0 | 0 | S-1403 |
| S-1407 | STT adapter + consent + short-retention audio worker | Audio transcribed; default delete after 7 days | 4 | 0 | 2 | S-1402 |
| S-1408 | Kill switch, per-vendor flag, audit of vendor contract/DPA | Flag off by default; toggle only after thresholds and counsel sign | 1 | 0 | 0 | S-1406 |
| **E14 total** |  |  | **19** | **5** | **6** |  |

*Note: E14 does not block pilot launch. It can be built in parallel and enabled only after evaluation gate passes.*

### E15 — QA, performance, security, launch

Goal: release-grade hardening.

| ID | Story | Acceptance | BE | Web | An | Depends on |
|---|---|---|---|---|---|---|
| S-1501 | Unit + integration + contract test suites reaching coverage targets (85% modules, 100% invariants) | CI gates; negative authz tests | 8 | 4 | 4 | all prior |
| S-1502 | Two-user E2E (Playwright) + Maestro flows on device lab | J1–J5 journeys; offline and chaos cases | 2 | 6 | 4 | E09, E13 |
| S-1503 | Accessibility manual testing (NVDA/TalkBack/VoiceOver, zoom, high contrast) | Issues filed and triaged; zero serious at launch | 0 | 3 | 3 | E12, E13 |
| S-1504 | Performance baselines + load test (2× pilot peak) | SLOs met; outbox lag within budget | 3 | 2 | 1 | S-0106 |
| S-1505 | Security review + dependency scanning + pen-test (limited scope) | High/critical findings closed | 5 | 1 | 1 | S-1106 |
| S-1506 | Backup/restore drill + incident run-throughs (data exposure + restore) | RTO ≤ 4 h; two runbooks drilled; results logged | 3 | 0 | 0 | S-1108, S-0106 |
| S-1507 | Canary + staged rollout pipelines (web, Android) | 5/25/100 with error-budget gates; rollback rehearsed | 2 | 2 | 2 | S-0105 |
| S-1508 | Support macros, help centre, in-app report flow, pilot comms templates | Intake tested; macros reviewed; response SLAs | 2 | 2 | 1 | S-1105 |
| S-1509 | Play Store assets, privacy policy, terms, data-safety form, content rating | Listing live; policy approved; staged rollout ready | 0 | 0 | 2 | S-1311 |
| S-1510 | Pilot onboarding + consent flow (research-friendly, opt-in to research, no coercion) | Users clearly informed; data not used for training without separate consent | 2 | 2 | 1 | S-0003, S-1107 |
| **E15 total** |  |  | **27** | **22** | **19** |  |

### E16 — Pilot support and iteration

Goal: operate the pilot, learn, fix, decide whether to launch publicly.

| ID | Story | Acceptance | BE | Web | An | Depends on |
|---|---|---|---|---|---|---|
| S-1601 | Pilot monitoring dashboards (funnel, SLOs, conflict rate, AI corrections, support volume) | Daily review; alerts routed | 2 | 0 | 0 | S-0106 |
| S-1602 | Weekly iteration capacity (bugs, copy, small UX improvements) | 40% eng capacity reserved | 5 | 4 | 4 | launch |
| S-1603 | Decision review at 30/50 jobs — go / pivot / stop | Documented decision against `01` §23.5 criteria | 1 | 0 | 0 | 50-job mark |
| S-1604 | Public launch prep (marketing page, Play rollout, comms) | Aligned with GTM plan | 0 | 3 | 2 | S-1603 "go" |
| **E16 total** |  |  | **8** | **7** | **6** |  |

### 3.x Story totals by discipline

| Discipline | Person-days |
|---|---|
| Backend (BE) | **297 pd** (incl. E00, E01, E14, E15, E16) |
| Web (Web) | **207 pd** |
| Android (An) | **212 pd** |
| **Total** | **716 pd** |
| Less: Android can start later, parallelism, and E14 parallelism reduce wall-clock | ~net 570 pd against ~600 pd of capacity |

---

## 4. Cross-client milestone timeline

Milestones from `01` §21.2, refined with story dependencies.

| Milestone | Week end | Capability delivered | Exit tests |
|---|---|---|---|
| M0 Decision sprint | W1 | All D-* decisions recorded; contracts, fixtures, design tokens, tokens pipeline, vendors chosen | ADR log signed; OpenAPI compiles; CI green |
| M1 Platform ready | W4 | Environments, DB, API skeleton, CI/CD, observability, auth start/verify endpoints, session | OTP e2e on staging; no enumeration; idempotency store works |
| M2 Foundation | W5 | Jobs, participants, manual brief, invitations, redacted preview | Two users complete an invite → draft flow; 50+ authz negative tests green |
| M3 Version loop | W8 | Immutable versions, acks, status derivation, activity | Invariant suite green (cannot produce false mutual ack) |
| M4 Change loop + questions | W9 | Change proposals, diff, accept/reject/ask/questions, closeout | Rejected change preserves prior version; superseded acks rejected |
| M5 Media + privacy | W11 | Attachments, exports, plan card, deletion workflow, AI adapter (flag off) | Export and deletion e2e; EICAR blocked; no public object access |
| M6 Web hardened | W14 | Sync engine, PWA, a11y, performance, security headers, marketing site, admin console, notifications | All P0 flows work offline per chaos tests; a11y zero serious; budgets met |
| **Gate 1 — Private web pilot (friendly 5)** | W15 | Synthetic + 5 real jobs | Pilot runbook; runbook drills |
| M7 Android core | W12 | Scaffold, auth, jobs, brief, versions/ack, changes/questions, closeout (parallel with W6–W12) | Two-device happy path over real API |
| M8 Android platform | W16 | Camera/voice/share/FCM, encryption, lock, baseline profiles | AAB under size budget; push delivery ≥ 95% on lab devices |
| M9 Android hardened | W18 | Sync engine, a11y, i18n, Play listing, closed testing | Closed testing; crash-free ≥ 99.5% |
| **Gate 2 — Public pilot (web + Android beta)** | W17–19 | 30–50 jobs across 2 categories | Success metrics tracked weekly |
| M10 AI enabled (optional) | W16+ | AI extraction flag flipped only after evaluation threshold pass | False-certainty <1%, 0 fabricated amounts |
| M11 Public launch | W22+ | Full public rollout after pilot criteria met or pivot | All launch-checklist items signed |

Critical path analysis shows the schedule is gated by E05 (versions/acks) → E09 (sync) → E15 (QA). Android is not on the critical path for the web pilot but must reach M9 before a combined public launch. If Android slips, launch web publicly and ship Android as a "coming soon" Play listing with a TWA interim.

---

## 5. Cost model (build + run)

### 5.1 Build cost (pilot launch)

Using loaded contractor/FTE cost assumptions (replace with real salaries):

| Role | FTE × months | Loaded monthly cost | Subtotal |
|---|---|---|---|
| Product/design | 1 × 4 | $7,000 | $28,000 |
| Tech lead/backend | 2 × 4 | $8,500 | $68,000 |
| Web | 1.5 × 4 | $7,500 | $45,000 |
| Android | 1 × 3 (to closed testing) | $8,000 | $24,000 |
| QA/DevOps/Security | 1 × 4 | $7,000 | $28,000 |
| Localization/content | 0.2 × 4 | $3,000 | $2,400 |
| Tooling & cloud dev/staging | 4 months | $1,500 | $6,000 |
| Security review / pen-test | one-off | — | $15,000 |
| Legal (NDPA, privacy, terms) | one-off | — | $8,000 |
| **Total build-to-pilot (approx.)** |  |  | **~$225,000** |

Add ~$60,000 to complete Android to public launch. These are budgetary numbers, not quotes.

### 5.2 Monthly run cost (pilot: 500 jobs/month)

| Line | Formula | Monthly (estimate) |
|---|---|---|
| Hosting (Workers, Next, Neon, R2, Queues, bandwidth) | fixed + usage | $300–600 |
| Postgres (Neon) | small plan + storage | $200–400 |
| Email (Resend/SES) | 5,000 msgs × $1/1k | $10 |
| SMS (Termii/Twilio) | 1,000 invites + acks × ~$0.03–0.05 | $30–50 |
| FCM/Web Push | negligible | $0 |
| AI (if enabled after gate) | 500 jobs × ~1k tokens in + 0.5k out + audio | $20–200 (flag-limited) |
| Observability (Sentry + OTel + logs) | Team plan + sampled spans | $150–300 |
| Support tooling, domains, misc |  | $100 |
| **Total run-rate pilot** |  | **~$800–1,700 / month** |

At 10,000 jobs/month expect $5–10k/month depending on AI/media volume. Kill criteria: cost per mutually acknowledged job exceeds 2× projected revenue per job.

---

## 6. Traceability matrix (top-level)

Maps requirements from the README (FR-/NFR-) to the stories that implement them.

| Requirement | Implemented by | Tested by |
|---|---|---|
| FR-JOB-001…005 (create, template, draft, invite, redacted preview) | S-0301–S-0310, S-0207–S-0211 | E2E invite flow, authz negative tests |
| FR-BRF-001…006 (manual fields, field states, AI as draft, conflict, sources, raw preservation) | S-0401–S-0407, S-1403 | Unit tests for parsing, raw preservation; E2E conflict |
| FR-VER-001…006 (immutable versions, ack binding, version-bound ack, no silent consent) | S-0501–S-0507 | Invariant suite, DB trigger tests, chaos tests |
| FR-CHG-001…005 (change propose/respond/diff/rejection preserves version, not decided) | S-0601–S-0609 | Two-user E2E; rejected-change test |
| FR-STS-001…004 (separate delivery views, no inference, pause/cancel) | S-0703, S-0705, S-0706 | State-machine tests; E2E |
| FR-PRV-001…005 (sessions, export/delete, notifs, abuse, AI opt-out) | S-0206, S-1008, S-1101–S-1107 | Privacy e2e; opt-out verification |
| NFR-SEC (per-object authz) | S-0209, S-1106 | Cross-job substitution tests, pen test |
| NFR-PRIV (minimisation, no raw content in logs/analytics) | S-0106, S-1106, S-1205 | PII-scrub static analysis; log review |
| NFR-A11Y (WCAG 2.2 AA) | S-1203, S-1309, S-1503 | axe, manual walkthroughs |
| NFR-REL (manual path always, AI/vendor outage) | S-1401, S-1106, S-0904/S-0906 | Vendor-kill tests, offline tests |
| NFR-PERF (budgets, low-end) | S-1204, S-1310, S-1504 | Lighthouse CI, Macrobenchmark, load tests |
| NFR-PORT (export, replaceable vendors) | S-0805, S-1101, S-1401 | Export e2e; adapter substitution tests |
| NFR-LOC (no silent locale interpretation) | S-0403, S-1206 | Formatting tests for NGN/relative dates |

---

## 7. Launch checklist

Gate 1 (Private web pilot):

- [ ] All P0 stories merged and deployed to staging.
- [ ] Invariant test suite green in CI; cross-client conformance fixtures pass.
- [ ] SLO dashboards live; synthetic monitor running; on-call rotation named.
- [ ] OTP, email, push (web), FCM (if available) tested on real carriers/devices.
- [ ] Two-user E2E Playwright + Maestro smoke passes against production-canary.
- [ ] Accessibility: zero serious axe issues; keyboard/TalkBack smoke pass.
- [ ] Privacy notice, terms, help centre, and support contact live.
- [ ] Security headers enforced; CSP live; TLS pinning configured for Android (if present).
- [ ] Backup/restore drill completed within RTO/RPO; two incident runbooks rehearsed.
- [ ] Admin console: support can process an export request and revoke sessions without content access.
- [ ] Plan card image/PDF generation tested on mobile browsers; fingerprint visible; no legal claims.
- [ ] AI toggle confirmed off by default; extraction route returns `FEATURE_DISABLED` until evaluation gate passes.
- [ ] Data-safety / privacy disclosures written even for the web (Play isn't the only place we need honesty).
- [ ] Kill switches / min-supported-version tested.
- [ ] Pilot consent flow and research protocol reviewed; users can decline research without losing product access.
- [ ] Pilot participants recruited (≥ 2 categories, provider + customer pairs).
- [ ] Team knows the stop/pivot criteria from `01` §23.5.

Gate 2 (Public launch, web + Android):

- [ ] Private pilot success criteria met (≥ 60% invite open, ≥ 40% mutual ack, ≥ 25% with changes, median create→share < 15 min) or a documented decision to pivot.
- [ ] 50+ real jobs completed; weekly review shows no systematic misbehaviour.
- [ ] Android closed testing ≥ 14 days with crash-free ≥ 99.5% and no blocking bugs.
- [ ] Performance budgets met on reference devices over 3G.
- [ ] Pen-test (limited scope) completed and high/critical findings closed.
- [ ] Load test to 2× expected pilot peak; queue lag stays within SLO.
- [ ] Rollback rehearsed for web and Android; rollback < 15 minutes.
- [ ] Runbook drills completed for data exposure, AI mis-extraction, invite/account compromise, DB restore.
- [ ] Play Store listing live with screenshots, content rating, data-safety form, privacy policy.
- [ ] Marketing/landing page, FAQ, and help centre localised into `en-NG` and `pcm`.
- [ ] Support macros and SLA staffing confirmed; in-app report flow tested.
- [ ] Post-launch monitoring (error budgets, crash rates, sync conflict rate) reviewed daily for the first two weeks.
- [ ] Public launch communications prepared (changelog, known issues, contact).
- [ ] Shutdown/exit plan documented per README Part 8 §12 (in case the project is sunset).

---

## 8. Risk-burn and re-estimation cadence

- Every Monday: review open risks from `01` §22; update likelihood/impact as evidence arrives.
- Every two weeks: re-estimate stories for the upcoming milestone using actual velocity from the last two sprints.
- Each milestone exit is a go/no-go: if any Blocker gap (from `04` §2) is still open, do not proceed.
- After the first 30 pilot jobs, hold a half-day retro: what worked, what didn't, whether the stop/pivot criteria are trending correctly, and whether E14 (AI) should be enabled.
- Keep this plan set under version control; update docs rather than letting them diverge from reality.

---

## 9. v2 additions from the excellence audit

The excellence audit (docs/06-excellence-audit.md) adds ~37 improvements discovered when the plan is stress-tested against field realities in Nigeria (provider-centricity, WhatsApp-as-primary-channel, low-literacy users, Pidgin register, multi-SIM accounts, deposit reality, closeout photos, OEM battery killers, coercion safety, and so on). The items are categorised Blocker (Gate 1 pilot), Public Launch, v1.1, and v2+.

### 9.1 Gate-1 pilot blockers (must land before any real user)

| ID | Item | Added pd (BE / Web / An) |
|---|---|---|
| V2-01 | Copy rewrite — replace "acknowledge/brief/mutually agreed" with plain sentences and honorifics | 1 / 4 / 4 |
| V2-02 | Pre-composed editable WhatsApp invitation message (5 variants) shown right after invite creation | 1 / 2 / 1 |
| V2-03 | Server-rendered static invite preview with plan card; renders in WhatsApp in-app browser without JS; static screenshot download without sign-up | 3 / 4 / 0 |
| V2-04 | "Money" field group (deposit paid/partial/no, balance, who buys materials); mismatched deposit → conflict | 3 / 2 / 2 |
| V2-05 | Prominent voice-mic as primary input on Add Details (web where supported, Android always); voice note artifacts; transcription optional | 0 / 2 / 4 |
| V2-06 | Copy-to-WhatsApp button on every status change with pre-composed 1-liner | 0 / 2 / 2 |
| V2-07 | Provider home segmented list: Waiting on me / Waiting on them / Due this week / Done | 1 / 3 / 3 |
| V2-23 | Chaos test: app killed mid-acknowledgement (power-cut simulation), queue recovery verified | 0 / 1 / 1 |
| V2-24 | In-app-browser detection + "open in Chrome" banner; read-only plan renders without SW/IndexedDB | 0 / 2 / 0 |
| **Subtotal (Gate 1 adds)** |  | **9 / 22 / 17 ≈ 48 pd** |

Net effect: moves web hardened pilot from W14 to W16. Android timing unchanged for pilot (pilot is web-first).

### 9.2 Public-launch additions (Gate 2)

| ID | Item | pd (BE / Web / An / Other) |
|---|---|---|
| V2-08 | TTS read-aloud of plan summary (correct amount pronunciation) | 0 / 2 / 3 |
| V2-09 | Photo step on closeout (prompt 1–3, both sides, needs-follow-up with photo, before/after for repairs) | 3 / 4 / 5 |
| V2-10 | "We don't agree" flow (3 neutral options, printable evidence pack, Nigeria help resources) | 4 / 4 / 4 |
| V2-11 | Multiple verified contact handles per account (2 phones + email); channel-aware OTP | 4 / 2 / 2 |
| V2-12 | Anti-coercion safety path (hidden safety link, delayed withdrawal, resources) | 2 / 2 / 2 |
| V2-13 | Anti-impersonation copy on invite preview; tenure signal with consent ("Seun has used this for N jobs") | 2 / 1 / 1 |
| V2-14 | Auto-detect metered network; data-saver default on; text-only sync < 10 KB | 1 / 2 / 2 |
| V2-15 | OEM battery-killer "fix notifications" screen (Tecno/Xiaomi/Infinix/Samsung instructions) | 0 / 0 / 3 |
| V2-16 | Optional 12-word recovery phrase at sign-up; SIM-swap recovery tested | 3 / 1 / 1 |
| V2-17 | Pidgin copy vetted by native speakers from 3 regions; honorific chips during invite | 0 / 1 / 1 / +3 content |
| V2-18 | Helper/apprentice role (photos, delivery report, no acks) with timeline attribution | 3 / 2 / 2 |
| V2-19 | Square plan-card variant for WhatsApp Status/Stories (1080×1080) | 0 / 2 / 1 |
| V2-20 | 3-screen show-don't-tell onboarding (Seun/Amaka example), zero forms before value | 0 / 3 / 3 |
| V2-21 | Voice-first / "read it to me" mode (larger text, fewer buttons, voice by default) | 0 / 2 / 3 |
| V2-22 | Block and report per participant (job-scoped then persistent after 2 reports) | 2 / 1 / 1 |
| V2-31 | WhatsApp Business support line + macros during pilot | 0 / 0 / 0 / +3 ops |
| V2-33 | Localized AI evaluation corpus (≥500 consented samples across accents, pidgin, noisy) | 5 / 0 / 0 |
| V2-34 | Perf tightening: <150 KB web JS, <6 MB Android download, <2.5s cold start | 0 / 2 / 3 |
| **Subtotal (Gate 2 adds)** |  | **29 / 31 / 37 ≈ 100 pd + 6 non-eng** |

These items land between pilot waves 2 and 3. Public launch shifts from W22 to W24–W25 if all are included; items can be re-prioritised against pilot signal.

### 9.3 v1.1 and beyond (post-public-launch)

V2-25 religious/region quiet-hours, V2-26 business identity, V2-27 repeat-customer one-tap, V2-28 WIP photos, V2-29 QR invite, V2-30 provider week calendar, V2-32 WTP monetization test, V2-35 Android "make it bigger" first-launch setting, V2-36 short-code `/c/:code` routing, V2-37 plan-card footer (A/B-tested), plus the long-horizon items already in README Part 9 (community templates, portable job passport, disaster mode, mediation referral, etc.).

### 9.4 Pilot recruitment (revised)

The private pilot recruits in three waves (detailed in 06 §5):

- **Wave 1 — Friendly 10:** 5 trusted providers, one real job each; weekly interviews; goal = find showstoppers.
- **Wave 2 — Cluster 30:** 3 clusters × 2 captains × 2 peers × 2 jobs; small airtime stipend to offset data; in-person onboarding for captains.
- **Wave 3 — Organic 50+:** soft launch to captains' networks; measure organic invite trees.

Recruitment quotas: ≥30% women customers, ≥20% users over 45, ≥10 jobs on 2 GB Android devices, ≥5 jobs where the counterparty does not install the app.

### 9.5 Additional product principles

Doc 06 §6 adds twelve new product principles centered on counterparty friction, provider-as-hero, voice-first, honorific-aware copy, calm design, offline-as-default, and shared-memory (not contract) framing. These supplement, and do not replace, the 12 invariants from the README and the 10 robustness rules from doc 04.
