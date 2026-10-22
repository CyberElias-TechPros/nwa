# 08 — Ultra-Granular Build Todo List

**Purpose:** every single step needed to build NaWeAgree from today to public launch. Checkable, assignable, ordered.
**How to use:** tick items as they are done; never skip an item (if you skip, write why and re-open it). Each task says: what to do, how you'll know it's done, what it connects to, and why it matters.
**Status key:** ⬜ not started · 🔄 in progress · ✅ done · ⛔ blocked · 🟨 deferred with reason · 🗑️ cut consciously.
**Owners:** `TL` tech lead · `BE` backend · `WEB` web · `AN` android · `PD` product/design · `QA` QA · `OPS` devops/security · `CN` content · `ALL` all.
**Source of truth:** This file. Every PR references the todo ID(s) it closes (e.g. "Closes T-W0-04").
**Companion docs:** 01 (arch), 02 (web), 03 (android), 04 (gaps), 05 (backlog), 06 (audit), 07 (roadmap).

---

## How this list is organized

1. Each item has a stable ID (`T-W{week}-{seq}`) plus sub-items (`T-W{week}-{seq}.{n}`).
2. Items are grouped by week and within week by track (infra/BE/WEB/AN/PD/QA/OPS).
3. Each item carries: **Status · Owner · Purpose · Connects-to · Done-when** · and any sub-steps.
4. If an item blocks later items, it is tagged `[BLOCKER]`.
5. Items found during the build that aren't on this list get appended with IDs like `T-W{n}-NEW-{seq}` and a note saying why they were added.

---

# PHASE 0 — PRE-START & DECISIONS (W0–W1)

## Progress note (2026-10-21)

Scaffold and first end-to-end flow (create plan → share link → invite preview) are working locally and in the live preview (web on :3000, API on :8787). Store is in-memory in `apps/api/src/modules/jobs/store.ts` and is replaced by Neon Postgres/Kysely in W2 (T-W2-01). Android scaffold is static Gradle/Compose; builds on a dev machine with JDK 17 + Android SDK 35 but CI does not run Gradle yet (T-W12).

Items marked [~] are partially complete with notes inline.


## W0 — Pre-start (before kickoff; do this week)

### Accounts & access
- [ ] **T-W0-01** · ⬜ · OPS · *Register domain* · Why: brand anchor, email, invites. · Connects: DNS, SSL, cookies. · Done when: domain registered (`naweagree.app` or chosen alt), DNS in Cloudflare, registrant email secured.
  - [ ] T-W0-01.1 Pick final brand/domain (verify availability: .app/.ng/.com; Play listing; trademark conflict search).
  - [ ] T-W0-01.2 Register domain; enable auto-renew; add 2+ admin contacts.
  - [ ] T-W0-01.3 Point nameservers to Cloudflare.
- [ ] **T-W0-02** · ⬜ · OPS · *Cloudflare account/zone setup* · Why: edge, CDN, WAF, Workers host. · Done when: zone active; SSL mode "Full (strict)"; API tokens scoped per project.
- [ ] **T-W0-03** · ⬜ · OPS · *GitHub repository hygiene* · Why: branch protection, review gates. · Done when:
  - [ ] T-W0-03.1 `main` and `arena/72dac57a-nwa` protected (required reviews, status checks, no force-push).
  - [ ] T-W0-03.2 CODEOWNERS file created (BE/WEB/AN/OPS reviews routed).
  - [ ] T-W0-03.3 Branch naming convention documented (`feat/T-W{id}-slug`, `fix/T-W{id}-slug`).
  - [ ] T-W0-03.4 Commit message convention documented (Conventional Commits: `feat/fix/docs/chore/test/security`).
  - [ ] T-W0-03.5 GitHub Actions runners verified; Dependabot enabled weekly for npm/cargo/gradle-versions.
- [ ] **T-W0-04** · ⬜ · OPS · *Neon Postgres project* · Why: primary transactional DB. · Done when: project created, prod/staging branches, connection strings in vault, IP allowlist set.
- [ ] **T-W0-05** · ⬜ · OPS · *Cloudflare R2 buckets* · Why: private object storage. · Done when:
  - [ ] T-W0-05.1 Buckets per env: `nwa-media-dev`, `nwa-media-staging`, `nwa-media-prod`.
  - [ ] T-W0-05.2 Public access blocked at bucket policy; CORS scoped to app origins only.
  - [ ] T-W0-05.3 Service tokens scoped to per-env buckets.
- [ ] **T-W0-06** · ⬜ · OPS · *Cloudflare Queues + KV* · Why: outbox, rate limits, job queues. · Done when: queue created per env, KV namespace created for rate-limit/idempotency.
- [ ] **T-W0-07** · ⬜ · OPS · *Email vendor account* · Why: magic links, notifications, exports. · Pick one of Resend/SES/Postmark; done when: domain DNS (SPF/DKIM/DMARC) verified, sending domain warmed, API key in vault.
- [ ] **T-W0-08** · ⬜ · OPS · *SMS vendor account* · Why: OTP, invite, first-ack fallback. · Pick one of Termii/Twilio/MessageBird (verify Nigeria delivery). Done when: sender ID approved (Termii Nigeria requires registration), API keys in vault, test SMS sent to 3 carrier networks (MTN, Glo, Airtel).
- [ ] **T-W0-09** · ⬜ · OPS · *Sentry org* · Why: error tracking both clients + API. · Done when: projects created per app/environment, DSNs in vault, release tagging wired, PII scrubbing inbound filters configured.
- [ ] **T-W0-10** · ⬜ · OPS · *Analytics proxy* · Why: first-party event allowlist, no third-party SDK leakage. · Deploy tiny Cloudflare Worker or app-route that accepts allowlisted events to a chosen backend (self-hosted Plausible or PostHog EU). Done when: endpoint responds 204 to allowed events and drops unknown fields; no Google Analytics/Facebook SDK.
- [ ] **T-W0-11** · ⬜ · AN/OPS · *Firebase projects (per env)* · Why: FCM for Android push (also optional web push via FCM). · Done when: dev/staging/prod projects, google-services.json and GoogleService-Info placeholders (no web push yet), FCM v1 credentials in vault, server key minimal-scope.
- [ ] **T-W0-12** · ⬜ · AN/PD · *Google Play Developer account* · Why: Android distribution. · Done when: account registered ($25), identity verified, internal testing track created, data-safety form draft started (not final).
- [ ] **T-W0-13** · ⬜ · TL · *Shared secrets vault* (1Password teams or Bitwarden). · Done when: vault created, folders per env, MFA required, all T-W0-04 to T-W0-12 secrets stored; emergency access granted to one other founder.
- [ ] **T-W0-14** · ⬜ · PD/OPS · *Local counsel engagement* (Nigerian-firm familiar with NDPA, consumer tech). · Done when: retainer signed or LOI, kickoff call scheduled ≤ W6, doc-share access granted for privacy notice + terms draft.
- [ ] **T-W0-15** · ⬜ · QA · *Reference device procurement*. · Buy (or borrow) for the device lab:
  - [ ] T-W0-15.1 Android Go 2GB RAM (e.g. Tecno Spark Go / itel) on Android 11/12 Go.
  - [ ] T-W0-15.2 Mid-tier Android (4GB RAM, e.g. Samsung A14 / Redmi) on Android 13/14.
  - [ ] T-W0-15.3 Pixel (vanilla Android, latest OS).
  - [ ] T-W0-15.4 iPhone SE (iOS 16+) for web/iOS smoke (web only; no iOS app).
  - Done when: devices received, provisioned with test SIMs (MTN + Airtel), added to Firebase Test Lab where possible.
- [ ] **T-W0-16** · ⬜ · PD · *Wave-1 pilot recruitment* (Friendly 10). · List of ≥ 8 candidates across ≥ 2 trades (tailor + carpenter minimum). Done when:
  - [ ] T-W0-16.1 Names, phone numbers, trade, shop location recorded.
  - [ ] T-W0-16.2 Intro call/cafe visit scheduled for W3 to explain the concept and invite participation; consent form ready.
  - [ ] T-W0-16.3 No family/friends only; include at least one provider you don't know personally.

### Team & process
- [ ] **T-W0-17** · ⬜ · TL · *Confirm roster & capacity* for the first 16 weeks. · Record FTE per role and expected weekly hours. Done when: doc in repo (`docs/team.md`) lists owners for every track; vacation/holiday dates (late Dec) noted.
- [ ] **T-W0-18** · ⬜ · TL · *Calendar of recurring meetings*. Send invites for:
  - [ ] Daily standup 15 min, 10am WAT Mon–Fri.
  - [ ] Monday planning 60 min.
  - [ ] Thursday demo 45 min.
  - [ ] Friday retro 30 min.
  - [ ] Bug triage 15 min daily during pilot, otherwise twice weekly.
  - Done when: invites sent, Zoom/Meet link stable, notes doc created.
- [ ] **T-W0-19** · ⬜ · TL · *Slack/Discord workspace structure*. Channels: `#general`, `#engineering`, `#product-design`, `#pilot-ops`, `#incidents`, `#android`, `#web`, `#random`, plus per-PR auto-posts. Done when: channels exist, team joined, integration with GitHub added.
- [ ] **T-W0-20** · ⬜ · PD/CN · *Copy deck skeleton* (spreadsheet or JSON). Columns: key, en-NG draft, pcm draft, context (where it appears), length limit. Done when: sheet created and seeded with the 50 highest-frequency strings (acknowledge, invite, closeout, errors, etc.).
- [ ] **T-W0-21** · ⬜ · TL · *Day-one kickoff presentation* (60 min). Must cover: 12 product invariants (from README), 10 robustness rules (doc 04), 12 new principles (doc 06 §6), roadmap overview, "north-star anti-metric" (never show "agreed" state when the server didn't say so). Done when: deck saved, meeting scheduled for W1 Monday.

### Monorepo skeleton
- [x] **T-W0-22** · ⬜ · TL/BE/WEB/AN · *Initialize pnpm/turbo monorepo*. Done when:
  - [x] T-W0-22.1 `pnpm init`, turbo config, pnpm-workspace.yaml with `apps/*` and `packages/*`.
  - [x] T-W0-22.2 Root `package.json` scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `e2e`.
  - [x] T-W0-22.3 `tsconfig.base.json` (strict: `strict: true`, `noImplicitAny`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`).
  - [ ] T-W0-22.4 ESLint + Prettier config at root; no per-app overrides without justification.
  - [x] T-W0-22.5 Editorconfig, gitignore, nvmrc (node 20 LTS), `.npmrc` with `engine-strict`.
  - [x] T-W0-22.6 Renovate/Dependabot config grouping minor deps weekly.
- [x] **T-W0-23** · ⬜ · TL · *Package scaffolding* (empty packages compile):
  - [ ] `packages/contracts` (OpenAPI source + generators entrypoint).
  - [ ] `packages/domain` (shared TS types only; no rule logic).
  - [ ] `packages/fixtures` (seed JSON, test clock, fakes).
  - [ ] `packages/design-tokens` (JSON tokens + build script).
  - [ ] `packages/i18n` (ICU messages source).
  - [ ] `packages/testkit` (helpers: fake clock, id generator, auth mocks).
  Done when: all packages build, typecheck, lint; consumed by one app each.
- [x] **T-W0-24** · ⬜ · WEB · *Web app placeholder* (Next.js 15 + App Router). Done when:
  - [x] T-W0-24.1 `apps/web` created; `pnpm dev` serves hello world at `localhost:3000`.
  - [x] T-W0-24.2 `next.config.mjs` strict (no `x-powered-by`, strict CSP in middleware planned for later).
  - [x] T-W0-24.3 Vitest + Playwright added as dev deps; one sample test runs.
- [x] **T-W0-25** · ⬜ · AN · *Android app placeholder*. Done when:
  - [ ] T-W0-25.1 `apps/android` Gradle project (Kotlin DSL, version catalog `libs.versions.toml`).
  - [ ] T-W0-25.2 minSdk 26, targetSdk latest (API 35), Kotlin 2.x, Compose BOM, Hilt, Room, WorkManager, CameraX, Coil, Retrofit, kotlinx-serialization added as deps.
  - [ ] T-W0-25.3 Single activity "Hello NaWeAgree" Compose screen launches on an emulator and reference device.
  - [ ] T-W0-25.4 `dev/staging/prod` flavors wired; applicationId suffix for non-prod.
  - [ ] T-W0-25.5 JUnit5 + MockK + Turbine + Compose Test + Maestro configured.
- [x] **T-W0-26** · ⬜ · BE · *API service placeholder* (Hono on Workers). Done when:
  - [x] T-W0-26.1 `apps/api` (Hono, TypeScript), Vitest, `pnpm dev` serves `GET /v1/health` → `{status:"ok"}`.
  - [x] T-W0-26.2 `wrangler.toml` per env; deploy script to Cloudflare Workers.
  - [x] T-W0-26.3 Zod used for request validation; single error-handling middleware returns envelope per `01` §8.2.
- [x] **T-W0-27** · ⬜ · WEB · *Admin app placeholder* (separate Next.js app, separate origin `admin.naweagree.app`). Done when: empty app scaffold; marked "not ready"; separate auth route.
- [x] **T-W0-28** · ⬜ · OPS · *CI starter (GitHub Actions)*. Workflows:
  - [x] T-W0-28.1 `pr.yml` (lint, typecheck, unit, build for api/web/android), required check on PRs.
  - [ ] T-W0-28.2 `deploy-preview.yml` (web/API preview per PR to Cloudflare).
  - Done when: all three apps build on PR from clean checkout; preview URL for web commented on PR.

---

## W1 — Decision sprint (ADRs, OpenAPI, tokens, fixtures)

> Goal: exit W1 with all architectural decisions recorded and the contracts/tokens/fixtures compiled; no "we can decide later" on anything that blocks code.

### ADRs
- [~] **T-W1-01** · ⬜ · TL · *Write ADR log* (18 decisions from `01` §24 plus any W0 surprises).
  - [x] T-W1-01.1 Create `docs/adr/` directory with template (Context / Decision / Consequences / Reconsider triggers / Date / Owner).
  - [~] T-W1-01.2 Write ADR-101…ADR-118 per doc 01 (8 of 18 drafted: 101-108 in this push; remainder T-W1) (monolith, Postgres, auth method, OAuth PKCE, phone-first OTP, redacted-guest-preview, Postgres-over-D1, etc.).
  - [ ] T-W1-01.3 Team reviews ADRs in Thursday W1 demo; any "NO" is resolved before Friday EOD.
- [ ] **T-W1-02** · ⬜ · PD/TL/CN · *Product invariants re-signoff*. · Walk the team through the 12 README invariants + 10 robustness rules (04 §3) + 12 new principles (06 §6). Done when: every engineer can explain why each invariant matters; doc `docs/principles.md` is created and linked from README.

### Contracts (OpenAPI)
- [ ] **T-W1-03** · ⬜ · BE · *Write OpenAPI 3.1 contract* for all P0 endpoints (doc 01 §8.3).
  - [ ] T-W1-03.1 `packages/contracts/openapi/nwa.yaml` created.
  - [ ] T-W1-03.2 Schemas defined for all error codes, idempotency envelope, pagination cursors.
  - [ ] T-W1-03.3 Every endpoint specifies auth requirements, rate-limit bucket, and idempotency semantics.
  - [ ] T-W1-03.4 Add openapi-lint + spectral rules; CI fails on unused schemas or missing error responses.
  - [ ] T-W1-03.5 TS client generation via `openapi-typescript` or `openapi-typescript-codegen` into `packages/contracts/gen/ts`.
  - [ ] T-W1-03.6 Kotlin client generation via `openapi-generator` into Android's network module (`apps/android/app/src/main/kotlin/.../api/gen`).
  - [ ] T-W1-03.7 Drift check: PRs changing openapi must regenerate clients or fail.
- [x] **T-W1-04** · ⬜ · BE · *Define problem-response envelope + error codes* per 01 §8.2. Done when: `packages/domain/src/errors.ts` defines typed error code union; Kotlin sealed class mirrors it; both clients generate helpers to map API errors to user messages.
- [ ] **T-W1-05** · ⬜ · BE · *Pagination + cursor spec* (opaque base64 `{id,createdAt,seq}`, HMAC-signed); one spec doc + shared test helper.
- [ ] **T-W1-06** · ⬜ · BE · *Rate-limit buckets* defined per 01 §8.6; table of bucket/limit added to code as constants, not magic numbers.

### Design tokens
- [ ] **T-W1-07** · ⬜ · PD/WEB/AN · *Design tokens v1* (`packages/design-tokens/tokens.json`).
  - [ ] T-W1-07.1 Colors: semantic (bg, surface, text, primary, accent, success, warning, danger, border, focus) with light values; dark values reserved.
  - [ ] T-W1-07.2 Spacing (4-based scale up to 32), radii, type scale (display/headline/title/body/label/caption), motion durations, breakpoints.
  - [ ] T-W1-07.3 Build script outputs CSS variables (`tokens.css`) for web and Kotlin (`Theme.kt`) for Android.
  - [ ] T-W1-07.4 Automated contrast script: every fg/bg pair is asserted in CI for WCAG AA (4.5:1 body, 3:1 large).
- [ ] **T-W1-08** · ⬜ · WEB · *Wire up tokens in web*. Import tokens.css in root layout; no hard-coded hex in component code (lint rule: `no-color-literals`).
- [ ] **T-W1-09** · ⬜ · AN · *Wire up tokens in Android*. `MaterialTheme.colorScheme/typography/shapes` populated from generated Theme.kt; `@ColorInt` outside theme is banned via ktlint custom rule (or code-review checklist).

### Copy / i18n
- [ ] **T-W1-10** · ⬜ · CN/PD · *Copy deck v1* for P0 screens (en-NG) using plain-language rules from 06 §3.4 and 06 §3.19 (no "acknowledge", "mutually agreed", "brief"; honorific-aware; sentences over labels).
- [ ] **T-W1-11** · ⬜ · CN/PD · *Pidgin skeleton* (pcm) for the same P0 strings; mark `pseudo` locale `en-XA` (long unicode strings to catch truncation).
- [ ] **T-W1-12** · ⬜ · WEB · Wire ICU catalogue (next-intl) into web; pseudo-locale builds and renders.
- [ ] **T-W1-13** · ⬜ · AN · Wire strings XML generated from ICU into Android; `en-rNG` and `b+pcm` locales.

### Fixtures & test infra
- [ ] **T-W1-14** · ⬜ · QA/BE · *Conformance fixture pack* (`packages/fixtures/scenarios/*.json`), ≥20 scenarios per 07 W1 exit.
  - Happy path: customer + provider, mutually acknowledged, one change accepted.
  - Rejected change preserves prior version.
  - Superseded ack.
  - Offline ack queued → success.
  - Offline ack queued → version superseded → drop-and-prompt.
  - Invite expired / revoked / wrong-token.
  - 409 conflict, idempotency replay, rate-limit exceeded.
  - Deposit mismatch → conflict.
  - AI unavailable, manual path works.
  - Large text, Unicode, emoji, code-switch.
  - Cross-job access attempt (404).
  - (plus 9 more during W1 build.)
  Done when fixtures are consumed by BE unit tests, web MSW handlers, and Android fake repo.
- [ ] **T-W1-15** · ⬜ · TL · *testkit primitives*: FakeClock, DeterministicIdGenerator, FakeQueue, LogCollector (assembles assertions), to be used by all three apps to avoid test flake.

### Exit W1 (Gate DG-0)
- [ ] **T-W1-16** · ⬜ · TL · Friday W1 review: every ADR signed off, openapi compiles and generates clients on CI, tokens produce CSS/KT and contrast script passes, 20 fixtures load, copy deck seeded. If any red, do not move to W2 until fixed.

---

## PHASE 1 — PLATFORM & FOUNDATIONS (W2–W5)

## W2 — Infra, DB, CI, observability

### DB & migrations
- [ ] **T-W2-01** · ⬜ · BE · *Database connection module* (`services/api/src/platform/db`) with Neon serverless/pg, typed queries via `postgres.js` or `kysely`; no raw SQL without parameter binding.
- [ ] **T-W2-02** · ⬜ · BE · *Migrations framework* (`services/api/migrations/`); append-only, named `NNNN_short_description.sql`; runner script against each env in CI; backward-compatibility check script (no dropping columns still referenced in released code).
- [ ] **T-W2-03** · ⬜ · BE · *Schema M001–M010* (create core tables per `01` §6.1): users, user_contacts, sessions, otp_challenges, jobs, job_participants, invitations, job_versions, acknowledgements, change_requests, change_responses, questions, question_responses, attachments, input_artifacts, field_sources, activity_events, outbox, notification_deliveries, privacy_requests, support_cases, audit_log, feature_flags, schema_migrations. Each with indexes, FKs, check constraints per `01` §6.2.
- [ ] **T-W2-04** · ⬜ · BE · *Immutability trigger* on `job_versions` BEFORE UPDATE/DELETE → RAISE. Unit test attempts to update a version and asserts failure.
- [ ] **T-W2-05** · ⬜ · BE · *Composite FK* (job_id, current_version_id) + unique (job_id, version_number). Test with a version from a different job.
- [ ] **T-W2-06** · ⬜ · BE · *Id generation*: ULID/UUIDv7 helper; used everywhere; tests confirm sortability and no collisions at 100k batch.

### API skeleton
- [ ] **T-W2-07** · ⬜ · BE · *Hono module layout* (`src/modules/{identity,jobs,brief,versions,changes,media,notifications,privacy,admin}`); each module exports a `router` Hono instance.
- [x] **T-W2-08** · ⬜ · BE · *Central error middleware* maps thrown `DomainError` → envelope per `01` §8.2; unknown errors mapped to INTERNAL_ERROR with requestId; never leaks stack traces.
- [x] **T-W2-09** · ⬜ · BE · *Logging middleware* — structured JSON, `requestId`, hashed userId/jobId, status, latency; asserts via unit test that raw field values / tokens never appear in logs.
- [x] **T-W2-10** · ⬜ · BE · *RequestId middleware* generates UUID on request, attaches via AsyncLocalStorage.
- [x] **T-W2-11** · ⬜ · BE · *Health endpoints*: `/v1/health` (liveness), `/v1/ready` (DB + queue reachable).
- [ ] **T-W2-12** · ⬜ · BE · *Feature flag service* reads from KV (env-backed in dev); endpoints for admin to set (admin module later); unit tests for enabled/disabled/allowlist.

### Observability
- [ ] **T-W2-13** · ⬜ · BE/OPS · *Sentry integration* for API; traces sampled 10%, errors 100%; beforeSend scrubber removes authorization, cookie, and any field matching money/phone/email regex.
- [ ] **T-W2-14** · ⬜ · BE/OPS · *OpenTelemetry* spans for: HTTP handler, DB queries, queue enqueue/process; spans exported to Sentry/Honeycomb.
- [ ] **T-W2-15** · ⬜ · BE/OPS · *Metrics* (Prometheus push or vendor): RED per route (requests/errors/duration), queue depth, outbox lag; dashboards for availability/latency provisioned in staging.

### CI/CD
- [ ] **T-W2-16** · ⬜ · OPS · *PR pipeline* wired: lint + typecheck + unit + migration dry-run + build for all three apps; required checks block merge.
- [ ] **T-W2-17** · ⬜ · OPS · *Preview deploys*: web and API preview per PR on Cloudflare/Vercel; preview URL commented on PR; DB branch per preview (Neon).
- [ ] **T-W2-18** · ⬜ · OPS · *Secret scanning* (git-secrets / GitHub advanced security) + dependency audit (pnpm audit + npm audit + gradle dependencyCheck) fails PR on high/critical.

### Android scaffold
- [ ] **T-W2-19** · ⬜ · AN · *Module/packages* under `app/src/main/kotlin/.../nwa/` per `03` §6 (core, feature, data, di); add Detekt + ktlint with project config.
- [ ] **T-W2-20** · ⬜ · AN · *Hilt setup*: Application class, AndroidEntryPoint on MainActivity; one injected fake repo works.
- [ ] **T-W2-21** · ⬜ · AN · *Compose baseline*: theme (from generated tokens), Scaffold with TopAppBar placeholder; screenshot test (Shot/Paparazzi) captures hello world.

### Web scaffold
- [ ] **T-W2-22** · ⬜ · WEB · *App structure* per `02` §4.3 (routes grouping: marketing, auth, app, api BFF); layout.tsx for each group.
- [ ] **T-W2-23** · ⬜ · WEB · *Design primitives v0*: Button, TextField, Badge, Card, Skeleton, Spinner (no domain components yet); all use tokens; each has a preview page and a11y name test.
- [ ] **T-W2-24** · ⬜ · WEB · *BFF proxy* in `app/api/_proxy.ts`: forward authenticated requests to API with service token mint, strip upstream error text, pass through idempotency/if-match/request-id headers.

### Exit W2
- [ ] **T-W2-25** · ⬜ · TL · Smoke: deploy to staging; `/v1/health` and `/v1/ready` respond; migrations applied; PR preview spins up a new Neon branch and deploys; all primitives render with tokens.

---

## W3 — Auth & security baseline

> Goal: OTP + magic-link work; sessions work for web cookie and Android PKCE; authorization middleware rejects cross-job access.

### Backend auth
- [ ] **T-W3-01** · ⬜ · BE · *Users + contacts schema* wired; create user on first verified OTP; no duplicate users on same verified contact.
- [ ] **T-W3-02** · ⬜ · BE · *OTP start* (`POST /v1/auth/otp/start`):
  - T-W3-02.1 Generate 6-digit code; bcrypt/argon2 hash; store with purpose, attempts=0, 10 min TTL.
  - T-W3-02.2 Send via SMS worker; constant response time regardless of whether contact exists (anti-enumeration).
  - T-W3-02.3 Rate limit per IP and per contact-hash bucket per `01` §8.6.
  - T-W3-02.4 Include contact-hash only in logs; no raw phone.
  - T-W3-02.5 Unit tests for: valid send, rate limit, constant-time non-existence, SMS worker idempotent.
- [ ] **T-W3-03** · ⬜ · BE · *OTP verify* (`POST /v1/auth/otp/verify`):
  - T-W3-03.1 Constant-time compare; increment attempts; invalidate after 5.
  - T-W3-03.2 On success: issue web session cookie AND/OR Android token pair based on `client` param.
  - T-W3-03.3 Link session to user; rotate session ID; emit activity event.
  - T-W3-03.4 Tests: correct code logs in, wrong code fails and increments attempts, expired code rejected, replay after consume rejected.
- [ ] **T-W3-04** · ⬜ · BE · *Email magic link*: token stored hashed, 15 min TTL, browser-nonce binding; redeem endpoint.
- [ ] **T-W3-05** · ⬜ · BE · *Session service*:
  - T-W3-05.1 Web cookie (`__Host-nwa_session`, HttpOnly, Secure, SameSite=Lax, 30 min idle / 12 h absolute, sliding refresh).
  - T-W3-05.2 Android token endpoint returns short-lived JWT access (15 min) + rotating refresh (60 d); reuse detection revokes family.
  - T-W3-05.3 Session list + revoke + sign-out + sign-out-everywhere endpoints.
  - T-W3-05.4 `GET /v1/me` returns profile + capabilities.
  - T-W3-05.5 Single-flight token refresh mutex (no stampede).
  - T-W3-05.6 Tests: cookie flags set correctly; refresh rotation works; reuse-detection revokes; revoke removes row; cross-user cannot list sessions.
- [ ] **T-W3-06** · ⬜ · BE · *Middleware `requireAuth`*: extracts user from cookie or bearer token; attaches to Hono context; rejects UNAUTHENTICATED otherwise.
- [ ] **T-W3-07** · ⬜ · BE · *Authorization service* `authorize(capability, resource)`; capability matrix per `01` §5.3; throws FORBIDDEN or NOT_FOUND_OR_NOT_VISIBLE. Build helper `asParticipant(jobId)` resolving participant from session.
- [ ] **T-W3-08** · ⬜ · BE · *Negative test suite* for authorization:
  - Attempt to GET a job you don't belong to → NOT_FOUND_OR_NOT_VISIBLE.
  - Attempt to POST ack with actor set to another participant → rejected, actor forced to session user.
  - Attempt to use another user's session cookie → rejected.
  - Attempt invite to nonexistent job → 404.
  - (15–20 such tests; must stay green forever.)
- [ ] **T-W3-09** · ⬜ · BE/OPS · *CSRF protection* on web BFF routes: double-submit token or SameSite+Origin allowlist; middleware rejects cross-origin unsafe methods without valid origin.
- [ ] **T-W3-10** · ⬜ · WEB · *Web security headers middleware*: CSP v1 per `02` §15 (default-src self; nonce for script/style; img-src self+blob+data+media origin; frame-ancestors none; form-action self; object-src none; upgrade-insecure-requests), HSTS preload, X-Content-Type-Options, Referrer-Policy no-referrer, Permissions-Policy deny-by-default (camera/microphone per-use), COOP same-origin, CORP same-origin. Tests: CSP header present, blocks inline script without nonce.

### Android auth
- [ ] **T-W3-11** · ⬜ · AN · *AppAuth-Android integration* for OAuth PKCE against API (custom scheme `naweagree://auth/callback`); callback Activity registered with intent filter.
- [ ] **T-W3-12** · ⬜ · AN · *Token store* in EncryptedSharedPreferences (AndroidKeyStore master key, AES256-GCM); access token in memory only; refresh token encrypted.
- [ ] **T-W3-13** · ⬜ · AN · *OkHttp interceptor* attaches bearer token; on 401 calls single-flight refresh; if refresh fails marks session unauthenticated and emits to flow.
- [ ] **T-W3-14** · ⬜ · AN · *Sign-in screen UI* (phone input, country code +234 preselected, keyboard numeric, client-side phone validation E.164).
- [ ] **T-W3-15** · ⬜ · AN · *OTP screen* (single text field with visual 6-box segmentation, autocomplete one-time-code, SMS Retriever API — no READ_SMS permission).
- [ ] **T-W3-16** · ⬜ · AN · *SMS Retriever* wiring: request SMS consent on OTP send; on receipt fill code and submit after user tap (no auto-submit without consent).
- [ ] **T-W3-17** · ⬜ · AN · *BiometricPrompt + PIN lock* scaffolding (settings toggle not yet wired; but primitives exist).
- [ ] **T-W3-18** · ⬜ · AN · *Certificate pinning*: OkHttp CertificatePinner with primary + backup pin; CT enforcement via okhttp-cert-transparency; tests reject MITM cert.
- [ ] **T-W3-19** · ⬜ · AN · *TLS only*: `usesCleartextTraffic=false`, min TLS 1.3, CipherSuite allowlist.

### Rate limiting / idempotency
- [ ] **T-W3-20** · ⬜ · BE · *Rate-limit middleware* (KV token bucket); per-user + per-IP + per-job buckets; returns 429 with Retry-After. Test: 6th OTP start within hour returns 429.
- [ ] **T-W3-21** · ⬜ · BE · *Idempotency middleware*: key from header; stores result hash 24h (KV); replays return original response; POST endpoints require key (mutations). Tests: replay with same key returns same response; different key creates new record.

### Web auth screens
- [ ] **T-W3-22** · ⬜ · WEB · *Sign-in page* (`/sign-in`): phone/email toggle, primary CTA, helper copy, no password; rate-limit messaging.
- [ ] **T-W3-23** · ⬜ · WEB · *Verify page* (`/verify?contact=…&channel=…`): single OTP input with autocomplete="one-time-code", 60s resend timer, change-contact link; error for invalid/expired.
- [ ] **T-W3-24** · ⬜ · WEB · *Session management UI* (`/settings/sessions`): device list, revoke button, sign out everywhere.
- [ ] **T-W3-25** · ⬜ · WEB · *BFF auth endpoints* (`/api/auth/*`); magic-link land-and-exchange.

### Exit W3
- [ ] **T-W3-26** · ⬜ · TL · Real-device test: web Chrome on Android + Android emulator can sign up with OTP to staging SMS sink (Mailpit/Twilio test credentials); sessions survive reload; revocation works; IDOR test suite runs 20 cases and all pass.

---

## W4 — Jobs, participants, manual brief

### Backend jobs
- [ ] **T-W4-01** · ⬜ · BE · *Create job endpoint* (`POST /v1/jobs`): validates title/category/policy; inserts job + creator participant; emits outbox event; returns job id.
- [ ] **T-W4-02** · ⬜ · BE · *List jobs endpoint* (`GET /v1/jobs?cursor&status&role`): cursor pagination, returns summary fields; filters by role (creator/participant/archived).
- [ ] **T-W4-03** · ⬜ · BE · *Get job aggregate endpoint* (`GET /v1/jobs/:id`): returns job + currentVersion + participants + acks + openChanges/openQuestions + capabilities + jobSeq; ETag based on jobSeq.
- [ ] **T-W4-04** · ⬜ · BE · *Patch metadata endpoint* (`PATCH /v1/jobs/:id`): title/policy only; material changes require new version; validates policy changes.
- [ ] **T-W4-05** · ⬜ · BE · *Policy/role helpers*: who_can_edit_draft, who_can_invite, require_ack_to_start default to creator-only.
- [ ] **T-W4-06** · ⬜ · BE · *Invitation create* (`POST /v1/jobs/:id/invitations`): generates 256-bit random token, stores token_hash, intended_contact_hash, expiry (7 days), one-use; returns one-time raw link; enqueues notification.
- [ ] **T-W4-07** · ⬜ · BE · *Invitation revoke*, *list* endpoints.
- [ ] **T-W4-08** · ⬜ · BE · *Preview endpoint* (`POST /v1/invitations/:token/preview`): returns redacted info only (inviter name, category, generic title); does not require auth; rate-limited per token+IP.
- [ ] **T-W4-09** · ⬜ · BE · *Redeem endpoint* (`POST /v1/invitations/:token/redeem`): requires authenticated session, valid token (not expired/revoked/used up), transactionally binds participant + increments use_count + emits events; returns job aggregate.
- [ ] **T-W4-10** · ⬜ · BE · *Participant leave endpoint* (`POST /v1/jobs/:id/participants/:pid/leave`): sets state left, emits event; cannot leave if sole required participant before cancel.
- [ ] **T-W4-11** · ⬜ · BE · *Pause/resume/cancel/archive endpoints* with state-machine validation (reuse `deriveStatus` helper).

### Templates and fields
- [ ] **T-W4-12** · ⬜ · BE/PD · *Template definitions v1* (Kind of work):
  - T-W4-12.1 Blank/custom (custom.* namespace allowed).
  - T-W4-12.2 Tailoring: outcome, scope, fabric, measurements, style notes, price, timing, delivery, revisions, open questions.
  - T-W4-12.3 Furniture/carpentry: outcome, material, dimensions, finish, price, timing, delivery, installation, who buys material, open questions.
  - T-W4-12.4 Printing/design: outcome, quantity, size, paper/material, colors, file spec, price, deadline, delivery, revisions.
  - T-W4-12.5 Catering/event: outcome, guest count, menu, service style, venue/time, price, deposit, delivery/setup, dietary notes.
  - T-W4-12.6 Repair: item, problem diagnosis (if known), parts (who supplies), price estimate, timing, warranty (none unless explicitly stated).
  - Templates live in versioned JSON; each field defines key, label, type, required_before_review, required_before_mutual_confirmation, can_remain_open, material_on_change.
- [ ] **T-W4-13** · ⬜ · BE · *Field value model* per `01` §5.4: raw + display + type + unit + status + certainty + condition + visibility + source + author.
- [ ] **T-W4-14** · ⬜ · BE · *Draft endpoints* (`GET/PUT /v1/jobs/:id/draft`): per-author private draft; draftRev concurrency (If-Match); 30-day idle purge worker; autosave-friendly JSON merge rules.
- [ ] **T-W4-15** · ⬜ · BE · *Money/date/unit parsing rules* (safe, never auto-confirm): parsers exist but only populate `amount_minor/date` when explicit AND human-confirmed; raw string always preserved. Unit tests: "80k" → needs_clarification until currency confirmed; "before month end" → status=needs_clarification.

### Web jobs screens
- [ ] **T-W4-16** · ⬜ · WEB · *Marketing shell* (`/`): hero, 3-step explanation, example, cross-category use cases, AI transparency, privacy/equal-footing section, FAQ (is it a contract? do both need accounts? what does AI do?), footer prototype notice; LCP < 2.5s; no fake stats.
- [ ] **T-W4-17** · ⬜ · WEB · *Server-rendered invite preview* (`/invite/[token]`): static HTML, redacted card, CTA "See full plan" / "Screenshot", zero JS required; states: valid/expired/revoked/wrong-token; copy: "NaWeAgree does not verify people".
- [ ] **T-W4-18** · ⬜ · WEB · *Authenticated App shell*: layout, TopAppBar + MobileTabBar (Jobs/History/People/Settings placeholder), DesktopSidebar on ≥1024px.
- [ ] **T-W4-19** · ⬜ · WEB · *Jobs home* (`/jobs`): segmented lists (Waiting on me / Waiting on them / Due this week / Done) per V2-07; empty state; FAB "New job".
- [ ] **T-W4-20** · ⬜ · WEB · *Create job flow* (`/jobs/new`): category chips (with photos not abstract icons), title, "paste what you already wrote" textarea, deterministic regex highlight (amounts/dates/quantities), save draft / continue; progress indicator.
- [ ] **T-W4-21** · ⬜ · WEB · *Paste intake* (V2-05 scaffold): client-side highlight of ₦ amounts and date words; "turn into fields" manual mapping (no AI); user confirms each.
- [ ] **T-W4-22** · ⬜ · WEB · *Brief editor* (`/jobs/[id]/brief`): grouped field cards per template, "not decided" chip, state badges, autosave with per-group "Saved/Saving", unsaved-changes dialog; manual entry works for every field.
- [ ] **T-W4-23** · ⬜ · WEB · *Voice mic button* on Add Details (web where `getUserMedia` supports audio mimetype): record via MediaRecorder, upload as attachment v1 (transcription later); big tappable button, always visible.
- [ ] **T-W4-24** · ⬜ · WEB · *People screen* (`/jobs/[id]/people`): participant list, invite link copy, revoke button, statuses, role labels with honorifics.

### Android jobs screens
- [ ] **T-W4-25** · ⬜ · AN · *Room DB schema v1* + migrations: jobs, participants, drafts, queue, sync_metadata; type converters for Instant/enums/JSON; SQLCipher integration enabled for prod flavor (test for dev).
- [ ] **T-W4-26** · ⬜ · AN · *Retrofit API interface* against OpenAPI-generated DTOs; ErrorMapper to DomainError; AuthInterceptor + IdempotencyInterceptor + RequestIdInterceptor + ConnectivityInterceptor.
- [ ] **T-W4-27** · ⬜ · AN · *Repository layer* stubs with fake repos for preview; real repos wired by W5.
- [ ] **T-W4-28** · ⬜ · AN · *Jobs list / Create / Overview* Compose screens against fake data; bottom nav; segmented lists placeholder (data can be static now).

### Tests & QA
- [ ] **T-W4-29** · ⬜ · QA · *Cross-job substitution test* as automated Playwright/REST test: 20 cases run nightly.
- [ ] **T-W4-30** · ⬜ · QA · *Invite matrix test*: valid / expired / revoked / wrong token / wrong OTP / rate-limited.

### Exit W4
- [ ] **T-W4-31** · ⬜ · TL · End-to-end: user creates a job, adds manual fields, invites a second user; second user opens preview page (server-rendered, no JS), signs in via OTP, redeems invite, sees the job; pause/cancel/archive transitions work with validations.

---

## W5 — Invite polish, design system, invariants monitor

### Backend closeout prep
- [ ] **T-W5-01** · ⬜ · BE · *Invite preview v2* (V2-03): include plan card image rendered server-side (SVG→PNG via resvg/satori) with fingerprint, no sensitive price/address; screenshot download endpoint generates static image without sign-up.
- [ ] **T-W5-02** · ⬜ · BE/PD · *Pre-composed invite message* API: returns variant (A/B/C/D/E) for sending via WhatsApp; messages written per 06 §3.1 ("Sister Amaka, I just put what we discussed…"); message variants tracked for analytics.
- [ ] **T-W5-03** · ⬜ · BE · *Outbox publisher*: transactional outbox writes are picked up by a queue worker (skeleton for now; real notification workers in W11); test verifies dual-write invariant (no event lost when DB commits).
- [ ] **T-W5-04** · ⬜ · BE · *Activity event helper*: every write appends an event with actor, type, per-job seq, minimal payload; no content in events by default.
- [ ] **T-W5-05** · ⬜ · BE/OPS · *Synthetic invariant monitor*: Cloudflare Cron every 5 min runs a job: create→publish→ack(customer)→ack(provider)→mutual→change→reject→verify v1 still current; alerts via Sentry/email on failure.

### Web design system & polish
- [ ] **T-W5-06** · ⬜ · WEB · *Domain components library*: JobStatusBadge, JobCard, NextActionCard, ParticipantRow, AckChecklist, BriefField, FieldStateBadge, SourceAttribution, ConflictCard, DraftSuggestionPanel (placeholder), VersionHeader.
- [ ] **T-W5-07** · ⬜ · WEB · *Error states* for every P0 screen: empty, loading skeleton, error with retry, 404, offline, stale (VERSION_CONFLICT) with resolution.
- [ ] **T-W5-08** · ⬜ · WEB · *Honorific chips* during invite flow (Sister/Aunty/Broda/Oga/Madam/Mallam/Mummy/Daddy/Pastor/Alhaja + custom).
- [ ] **T-W5-09** · ⬜ · WEB · *In-app-browser detection*: read-only rendering path for WhatsApp/Facebook in-app browsers; persistent "Open in Chrome" banner with intent link.
- [ ] **T-W5-10** · ⬜ · WEB · *Quick sign-out / shared-device mode* (15-min session, no persistence, explicit UI).

### Android polish
- [ ] **T-W5-11** · ⬜ · AN · *Theme finalized* from generated tokens; type scale; light theme default; dark theme reserved.
- [ ] **T-W5-12** · ⬜ · AN · *App navigation* typed routes + deep links (`naweagree://invite/:token`, `naweagree://jobs/:id`, etc.); process-death restore via SavedStateHandle.

### Research
- [ ] **T-W5-13** · ⬜ · PD · *Discovery interview guide* finalized (per README Part 2 §2.3/2.4 + additions from 06 §7); interviews scheduled to begin W6.
- [ ] **T-W5-14** · ⬜ · PD · *Consent form* for research/pilot in en-NG and Pidgin; users can decline research without losing product access.

### Exit W5 (DG-1 Platform ready)
- [ ] **T-W5-15** · ⬜ · TL · Check W5 exit criteria in `07`: two users can complete invite→draft flow; synthetic monitor runs for ≥48h without false alarm; invite preview renders in WhatsApp in-app browser statically without sign-in; component previews show all states.

---

---

# PHASE 2 — CORE JOB LOOP ON WEB (W6–W9)

## W6 — Versions, acknowledgements, Android auth deepens

### Backend versions & acks
- [ ] **T-W6-01** · ⬜ · BE · *Versions table + logic*: monotonic numbering via `SELECT ... FOR UPDATE` on jobs row; insert job_version; compute content_digest (canonical JSON + sha256) and prev_digest to form hash chain. Test: concurrent publishes produce sequential gap-free numbers; direct SQL update on job_versions is rejected (trigger already added T-W2-04).
- [ ] **T-W6-02** · ⬜ · BE · *Publish endpoint* (`POST /v1/jobs/:id/versions`) — transaction: validate baseVersionId, insert version, update jobs.current_version_id, increment job_seq, write activity events, enqueue outbox notifications; return new version. Tests: If-Match stale → 409; double publish with same idempotency key → exactly one version.
- [ ] **T-W6-03** · ⬜ · BE · *Version list/detail endpoints* (`GET /v1/jobs/:id/versions`, `GET /v1/jobs/:id/versions/:vid`) with acknowledgements and digest; superseded flag set correctly when successor created.
- [ ] **T-W6-04** · ⬜ · BE · *Acknowledgements endpoint* (`POST /v1/jobs/:id/versions/:vid/acknowledgements`):
  - T-W6-04.1 Actor forced from session (never request body).
  - T-W6-04.2 Action enum (reviewed/question/disagree/need_time).
  - T-W6-04.3 Enforce version is current published; if superseded → VERSION_SUPERSEDED.
  - T-W6-04.4 Mutual derivation: after insert, recompute job status and write ack event.
  - T-W6-04.5 Unique constraint per (version_id, participant_id) for live actions; withdrawals are separate rows.
  - Tests: cannot ack for another user; cannot ack superseded; all-required-acks → mutually_acknowledged; silence/timer never ack.
- [ ] **T-W6-05** · ⬜ · BE · *Withdrawal endpoint* (`POST /v1/jobs/:id/acknowledgements/:aid/withdrawal`): inserts new row, does not delete original; recomputes status; emits event. Test: original ack remains visible in history.
- [ ] **T-W6-06** · ⬜ · BE · *deriveStatus* function is **single source of truth** (from `01` §5.2) and used by every write; exhaustively unit-tested for all 12 states and 15 transitions; client state mirrors for UX must match the unit tests.

### Web version UI
- [ ] **T-W6-07** · ⬜ · WEB · *Version list screen* (`/jobs/[id]/versions`): numbered chips, current highlighted, superseded muted; human-readable timestamp per version.
- [ ] **T-W6-08** · ⬜ · WEB · *Version detail screen*: read-only field list with diff-from-previous; fingerprint line ("Fingerprint 7f3a9c02b1de — matches what NaWeAgree has stored. Not a legal proof."); ack checklist.
- [ ] **T-W6-09** · ⬜ · WEB · *Acknowledge dialog*: names the version ("I have seen and I agree with version 3"), lists any open material fields before confirm, shows consequences plainly, secondary options ("Ask a question", "I need more time", "I disagree").
- [ ] **T-W6-10** · ⬜ · WEB · *Withdraw action* from version detail; confirmation dialog states that withdrawal is recorded, not erased.
- [ ] **T-W6-11** · ⬜ · WEB · *Job overview next-action card*: shows the single next action (e.g. "Waiting for Seun to review version 2") per `02` §4.5.

### Android auth completion & navigation
- [ ] **T-W6-12** · ⬜ · AN · *Splash routing*: check encrypted session → Jobs or SignIn.
- [ ] **T-W6-13** · ⬜ · AN · *Typed NavGraph* with sealed routes for Auth/Jobs/Job sub-screens; deep link intent-filter for `naweagree://invite/:token`.
- [ ] **T-W6-14** · ⬜ · AN · *Session state flow* in repository; app observes and reacts (force sign-in on refresh failure; biometric unlock when enabled).

### Research
- [ ] **T-W6-15** · ⬜ · PD · First Wave-1 friendly-provider interview conducted; notes captured; product backlog updated with new findings within 24 h.

### Exit W6
- [ ] **T-W6-16** · ⬜ · TL · Two users can publish v1, both acknowledge, see mutual state; immutability trigger blocks UPDATE attempts; synthetic monitor includes the ack portion.

---

## W7 — Changes, questions, diff, copy rewrite

### Backend changes
- [ ] **T-W7-01** · ⬜ · BE · *change_requests / change_responses* schema; status transitions server-validated.
- [ ] **T-W7-02** · ⬜ · BE · *Create change endpoint* (`POST /v1/jobs/:id/change-requests`): takes baseVersionId, array of field changes (key, oldValue, newValue), reason, materiality; creates successor draft version; enforces baseVersionId is last mutually acknowledged or current published.
- [ ] **T-W7-03** · ⬜ · BE · *Diff algorithm*: structured per-field diff (added/removed/changed/unchanged) with accessible labels; handles text values and money values; test fixtures cover simple change, multi-field change, conditional price change.
- [ ] **T-W7-04** · ⬜ · BE · *Respond to change endpoint* (`POST /v1/change-requests/:id/responses`): accept/reject/question/need_time/withdraw; accept triggers transaction that publishes new version when all required accept; reject leaves prior version current; idempotent per participant.
- [ ] **T-W7-05** · ⬜ · BE · Tests: rejected change preserves prior version; partial accept → partially_acknowledged; all accept → new mutual version; proposer can withdraw.

### Questions
- [ ] **T-W7-06** · ⬜ · BE · *Question endpoints*: `POST /v1/jobs/:id/questions`, `POST /v1/questions/:qid/responses`; field/version binding; status open/answered/deferred; append-only responses.
- [ ] **T-W7-07** · ⬜ · BE · Activity events for questions and responses.

### Web changes/questions UI
- [ ] **T-W7-08** · ⬜ · WEB · *Changes list*: tabs Open/Accepted/Rejected; each card shows proposer, affected fields, status.
- [ ] **T-W7-09** · ⬜ · WEB · *Change detail / Diff view*: old/new side-by-side; accessible labels ("Added"/"Removed"/"Changed", not color-only); reason shown; response actions (accept/reject/ask/need-time).
- [ ] **T-W7-10** · ⬜ · WEB · *Questions list*: open count, filter, question card with field badge and asker; composer; response input with answer/not-decided/follow-up.
- [ ] **T-W7-11** · ⬜ · PD/WEB · **Copy rewrite v1 (V2-01)**: sweep all screens for "acknowledge", "brief", "mutually agreed", "participant", "closeout", replace with plain sentences (per 06 §3.4/§3.19); honorifics wired throughout. Every new string goes through copy review before merge.
- [ ] **T-W7-12** · ⬜ · WEB · *Confirmation dialogs* explicitly name the action and version; no "OK/Cancel" — use specific verbs ("Yes, I agree with version 3", "No, take me back").

### Android UIs continue
- [ ] **T-W7-13** · ⬜ · AN · *Jobs list, Create job, Overview screens against real API* (not fake data); segmented list placeholder; load/error/empty states.
- [ ] **T-W7-14** · ⬜ · AN · *Brief editor* on Android (grouped fields, states, autosave to Room draft).

### Tests
- [ ] **T-W7-15** · ⬜ · QA · *Two-user Playwright E2E for happy path*: provider publishes v1, customer asks question, provider answers, both acknowledge → mutual; screenshots captured at each step.
- [ ] **T-W7-16** · ⬜ · QA · *Rejection test*: customer proposes change, provider rejects → v1 still current, no UI drift.

### Exit W7
- [ ] **T-W7-17** · ⬜ · TL · Copy reads like normal Nigerian speech (run by at least one native speaker in review); reject-change E2E passes on staging; questions render and accept responses.

---

## W8 — Activity, closeout, money (deposit/materials), segmented home

### Backend activity/closeout/money
- [ ] **T-W8-01** · ⬜ · BE · *Activity endpoint* (`GET /v1/jobs/:id/activity`): cursor pagination; curated events (not security log); filters by type.
- [ ] **T-W8-02** · ⬜ · BE · *Closeout endpoints*: per-participant state (delivered/received/follow_up/not_completed), note, timestamps; completion_review → completed when both report complete (or explicit close); pause/cancel/archive with reason.
- [ ] **T-W8-03** · ⬜ · BE/PD · *Money field group* (V2-04):
  - T-W8-03.1 Fields: total_price, deposit_amount, deposit_status (not_paid/partial/paid), balance_due, who_buys_materials (customer/provider/split), material_cost_inclusion.
  - T-W8-03.2 Per-participant deposit record (as recorded by Seun; not verified).
  - T-W8-03.3 Conflict detection: if participants report mismatched deposit paid status/amount, version publish surfaces the conflict as needs_clarification; cannot publish as mutually acknowledged without explicit acknowledgment of discrepancy.
  - Tests: mismatch produces conflict; match produces ready_for_review.
- [ ] **T-W8-04** · ⬜ · BE · *Segmented home data*: extend list endpoint with `nextAction`, `waitingOnMe/waitingOnThem/dueThisWeek` buckets for the provider queue.
- [ ] **T-W8-05** · ⬜ · BE · *Work-started-without-ack flag*: can be set explicitly; UI warning; never moves status to mutually_acknowledged.

### Web screens
- [ ] **T-W8-06** · ⬜ · WEB · *History/timeline* (`/jobs/[id]/history`): grouped-by-day timeline, filters (versions/questions/changes/other), events attribute actor ("Seun the tailor agreed", not "Participant 2 ack").
- [ ] **T-W8-07** · ⬜ · WEB · *Closeout screen* (`/jobs/[id]/closeout`): My state / Their state columns, chips (delivered/received/follow-up/not completed), note field, submit.
- [ ] **T-W8-08** · ⬜ · WEB · *Pause / cancel / archive* actions with consequence confirmation, optional reason (free text + chips: "No longer needed", "Customer changed mind", "I can't do it now", "Other").
- [ ] **T-W8-09** · ⬜ · WEB · *Money section* in brief editor (deposit, balance, who buys materials, currency, estimate vs exact); raw + display; deposit mismatch surfaces ConflictCard on publish.
- [ ] **T-W8-10** · ⬜ · WEB · *Home screen segmented view* (Waiting on me/Waiting on them/Due this week/Done); counts; colors semantically correct; deep-links to each job's next action.
- [ ] **T-W8-11** · ⬜ · WEB · *Voice primary button* Add Details: recorded audio stored as input artifact (placeholder, transcription deferred); playback on brief page; visible consent ("Voice notes are kept for 7 days by default").
- [ ] **T-W8-12** · ⬜ · WEB · *Honest work-started-without-ack banner*: "Work has started but you haven't both reviewed the plan — be careful."

### Android
- [ ] **T-W8-13** · ⬜ · AN · *Versions/Ack screens*: version list, version detail, ack dialog, withdraw; TalkBack labels for status badges.
- [ ] **T-W8-14** · ⬜ · AN · *Changes list/detail*: card-based diff on small screens (stacked definition-list layout under 480dp, table above).
- [ ] **T-W8-15** · ⬜ · AN · *Questions list/composer/response* flows.
- [ ] **T-W8-16** · ⬜ · AN · *MediaRecorder voice capture*: AAC LC 32 kbps, waveform, pause/resume, max 5 min, playback before send, consent screen; stored in app cache pending upload.

### Research
- [ ] **T-W8-17** · ⬜ · PD · Wave-1 interviews continue; at least 2 more providers this week; track "this feels like paperwork" objections specifically.

### Exit W8
- [ ] **T-W8-18** · ⬜ · TL · History, closeout, money, segmented home all work; deposit mismatch surfaces a conflict; voice notes record and play back; segmented queue reflects real state.

---

## W9 — Notifications skeleton, copy-to-WhatsApp, first two-user E2E

### Backend notifications skeleton
- [ ] **T-W9-01** · ⬜ · BE · *Notification delivery model* (DB + worker dedupe) per `01` §13: notification_deliveries table, per-channel templates, idempotency keys, quiet hours (default 21–07 WAT), generic content rule (no price/address/name in subject/lock-screen).
- [ ] **T-W9-02** · ⬜ · BE · *Copy-to-WhatsApp message generator* (`GET /v1/jobs/:id/share-update?action=...`): returns pre-composed short message per status change (5 variants randomized); message never includes sensitive data; callable from clients for copy-clipboard button.
- [ ] **T-W9-03** · ⬜ · BE · *Notification preferences endpoints* (in-app/email/push/SMS, quiet hours start/end).
- [ ] **T-W9-04** · ⬜ · BE · *Notification worker skeleton*: reads outbox; picks channel; sends; records delivery; retries with exponential backoff; dead letters on terminal fail.
- [ ] **T-W9-05** · ⬜ · BE · *Email worker* (Resend/SES): HTML+text templates; one-click unsubscribe (mangled list-id); delivery receipts logged. No email sends with price/address in subject.
- [ ] **T-W9-06** · ⬜ · BE · *SMS worker* stub behind flag (only used for invite and first mutual ack in production; test mode during pilot).

### Web copy-to-WhatsApp
- [ ] **T-W9-07** · ⬜ · WEB · *Copy-to-WhatsApp button* on every status change (ack, change propose, change respond, closeout, publish): copies pre-composed message and opens `https://wa.me/?text=...` (if phone known) or copies to clipboard with a toast "Paste into WhatsApp".
- [ ] **T-W9-08** · ⬜ · WEB · *In-app notification centre* placeholder (list of updates, mark read, tap-to-job).
- [ ] **T-W9-09** · ⬜ · WEB · *Pre-composed invite message* UI shown right after invite creation: editable textarea with variant picker, "Copy" + "Open WhatsApp" buttons, "This is what they will see" preview.

### Tests & QA
- [ ] **T-W9-10** · ⬜ · QA/WEB · *Two-user E2E suite in Playwright* for:
  - T-W9-10.1 Happy path publish→mutual ack.
  - T-W9-10.2 Rejected change preserves prior version.
  - T-W9-10.3 Withdraw ack creates visible event, doesn't delete original.
  - T-W9-10.4 Deposit mismatch blocks mutual ack until resolved.
  - T-W9-10.5 Pause/cancel/archive transitions.
  - T-W9-10.6 Invite expired/revoked states.
  Each runs in CI; block PR on failure.
- [ ] **T-W9-11** · ⬜ · QA · *Invariant negative tests* (SQL injection attempt, IDOR, spoofed actor, stale seq, duplicate idempotency).

### Android progress
- [ ] **T-W9-12** · ⬜ · AN · *History, closeout, people, files* screens placeholder; navigation wired; real data where possible.
- [ ] **T-W9-13** · ⬜ · AN · *Repository layer* real (not fake) for jobs/versions/acks/changes/questions; Room→UI flow works.

### Exit W9 (M3 — Version loop proven)
- [ ] **T-W9-14** · ⬜ · TL · Per exit criteria 07 §Phase 2: full mutual-plan loop works immutably; rejection preserves prior version; E2E pass; UI copy sounds natural in read-aloud; copy-to-WhatsApp works from web.

---

# PHASE 3 — WEB HARDENED & PILOT READY (W10–W16)

## W10 — Media, attachments, plan card

### Backend media
- [ ] **T-W10-01** · ⬜ · BE · *Attachments table* (object_key, uploader, mime, bytes, checksum, scan_state, metadata_stripped, retention).
- [ ] **T-W10-02** · ⬜ · BE · *Upload-intent endpoint* (`POST /v1/jobs/:id/attachments/upload-intent`): returns signed PUT URL to R2 (5 min TTL) and attachment id; server-chosen object key (no client-controlled paths).
- [ ] **T-W10-03** · ⬜ · BE · *Complete upload endpoint*: triggers scan worker and image renditions; blocks sharing while scan_state=pending.
- [ ] **T-W10-04** · ⬜ · BE/OPS · *ClamAV worker* (Docker or vendor API): scans uploaded objects; marks clean/blocked; quarantines blocked; alerts on blocked >=10/hour spike.
- [ ] **T-W10-05** · ⬜ · BE · *Image rendition worker*: strips EXIF/GPS, generates thumb (320px) and preview (1280px), keeps original; converts to WebP/AVIF where supported; preserves orientation.
- [ ] **T-W10-06** · ⬜ · BE · *Signed download endpoint* (`GET /v1/attachments/:id/url`): re-authorizes membership; returns 5-min signed GET URL.
- [ ] **T-W10-07** · ⬜ · BE · *Delete attachment endpoint*: tombstones, async purge, CDN purge.
- [ ] **T-W10-08** · ⬜ · BE · *Validation*: magic-byte sniff, MIME allowlist (image/jpeg, image/png, image/webp, application/pdf, audio/aac, audio/mpeg, audio/webm, audio/ogg), 25 MB audio / 10 MB image / 20 MB PDF / 200 MB/day/user.

### Plan card export
- [ ] **T-W10-09** · ⬜ · BE · *Plan card renderer* (server-side):
  - T-W10-09.1 Layout: names + honorifics, job kind, key fields (price, timing, material, delivery, open questions), fingerprint, last-updated date.
  - T-W10-09.2 Produce PNG (1080×1350 portrait) via satori/sharp; 1080×1080 square variant for Status/Stories (V2-19).
  - T-W10-09.3 PDF export (later W14; PNG required for pilot).
  - T-W10-09.4 Watermark/footer: "Record from NaWeAgree — not a legal document"; small "Made with NaWeAgree" footer is A/B-tested OFF by default during pilot (V2-37).
- [ ] **T-W10-10** · ⬜ · BE · *Static screenshot download for non-signed-up viewers* (V2-03): invite preview page includes "Download a copy" button returning PNG without auth; rate-limited.

### Web files + card
- [ ] **T-W10-11** · ⬜ · WEB · *Files screen* (`/jobs/[id]/files`): attachment grid, upload via camera/file picker, upload progress, scan pending/blocked states, thumbnails via signed URLs (loaded lazily), delete.
- [ ] **T-W10-12** · ⬜ · WEB · *Image rendering* via next/image custom loader that signs URLs server-side; placeholders; no original-size in lists; respects data-saver.
- [ ] **T-W10-13** · ⬜ · WEB · *Plan card preview* (`/jobs/[id]/card`) + download PNG + share to WhatsApp status/chat (square variant via V2-19).
- [ ] **T-W10-14** · ⬜ · WEB · *In-app-browser full path*: when detected, load read-only plan view without IndexedDB/SW dependency; copy screenshot button; "Open in Chrome for full features" CTA always present.

### Android camera/voice
- [ ] **T-W10-15** · ⬜ · AN · *CameraX capture*: preview, tap-to-focus, flash auto, image capture → app cache → downscale to 1600px long edge, WebP compression, orientation correction.
- [ ] **T-W10-16** · ⬜ · AN · *Photo Picker* (ActivityResultContracts.PickVisualMedia) for Android 13+; READ_MEDIA_IMAGES fallback on older; copy to app cache.
- [ ] **T-W10-17** · ⬜ · AN · *Coil setup* with OkHttp signed-URL fetcher, memory cache 1/8 device memory, disk 200 MB LRU; downsample to view size.
- [ ] **T-W10-18** · ⬜ · AN · *Voice note playback* via MediaPlayer/ExoPlayer, play/pause, seek; visual waveform.

### Exit W10
- [ ] **T-W10-19** · ⬜ · TL · Upload→scan→rendition→view works for JPG/PNG/PDF/audio; blocked files show blocked state; plan card PNG renders correctly on 360px width (no overflow, fingerprint legible); EICAR test file is blocked.

---

## W11 — Notifications (email/SMS/web push), share target

### Backend channels
- [ ] **T-W11-01** · ⬜ · BE · *Email worker live* (staging uses Mailpit; prod uses Resend/SES); templates: invite, draft-shared, change-proposed, ack-received, closeout, security-event; unsub header; 1-click mailto: support.
- [ ] **T-W11-02** · ⬜ · BE · *SMS worker live* for invite + first mutual ack only; delivery receipts logged; per-job budget (max 2 SMS/job unless opted-in).
- [ ] **T-W11-03** · ⬜ · BE · *Web Push endpoint* (VAPID keys); subscribe/unsubscribe; send generic push (data payload `{type, jobId, eventId}` only).
- [ ] **T-W11-04** · ⬜ · BE · *Dedupe* per (recipient, purpose, resource, day) to prevent double-notifies on retries.
- [ ] **T-W11-05** · ⬜ · BE · *Content rules enforced*: subject/body template does not include price/address/other party full name; tests verify redaction.

### Web push + share target
- [ ] **T-W11-06** · ⬜ · WEB · *Push permission ask* AFTER user publishes first version (never on first open); explanation dialog ("We'll send a small note when they respond") + "use email only" option.
- [ ] **T-W11-07** · ⬜ · WEB · *Service worker push handler*: on push, fetch minimal content after auth; show notification with generic title "NaWeAgree: update on a shared plan"; tap routes to correct screen; respects quiet hours.
- [ ] **T-W11-08** · ⬜ · WEB · *Notification preferences screen*: push/email/SMS toggles per event type; quiet hours start/end; preview of what each channel sends.
- [ ] **T-W11-09** · ⬜ · WEB · *Web Share Target* (manifest + POST handler `/share-target`): stores text/url/files in IndexedDB with 1 h TTL; redirects to `/jobs/new?from=share`; New Job screen shows "We got what you shared" card with preview/thumbnails; "Use this" / "Start blank". Works on Android Chrome.
- [ ] **T-W11-10** · ⬜ · WEB · *In-app notification centre* live: list of updates, badge count, mark read, tap to job; no duplicate dismissal.

### Android FCM wiring
- [ ] **T-W11-11** · ⬜ · AN · *FCM service*: data-message only; no auto-display; fetch details after unlock; display via NotificationCompat with channels per `03` §17; content-free lock-screen.
- [ ] **T-W11-12** · ⬜ · AN · *Deep link routing from notification tap*: app opens to the relevant change/question/closeout screen; if signed out, resume after auth.
- [ ] **T-W11-13** · ⬜ · AN · *Token refresh*: send new token to server on launch and on `onNewToken`; invalidation on logout.

### Exit W11
- [ ] **T-W11-14** · ⬜ · TL · Email+SMS+push (where available) deliver for invite/draft-shared/ack/change events; content redaction verified; web share target receives text from Android Chrome share menu and creates a draft; FCM data message arrives on Pixel/Samsung test devices.

---

## W12 — Web sync engine + PWA

### Backend delta + conflict
- [ ] **T-W12-01** · ⬜ · BE · *Delta endpoint* (`GET /v1/jobs/:id?since=<seq>`): returns changed entities and new events, or `{unchanged:true}`; uses ETag `W/"job-<seq>"`; 304 on match.
- [ ] **T-W12-02** · ⬜ · BE · *Conflict resolution payloads*: 409 response carries currentJobSeq, currentVersionId, list of changed fields; exposes helper `rebaseProposedChange` that attaches the proposal to latest base for client review.
- [ ] **T-W12-03** · ⬜ · BE · *Conflict rules* per `01` §9 enforced server-side (drop ack on superseded; require rebase on publish conflict; never silent wins for material fields).

### Web offline
- [ ] **T-W12-04** · ⬜ · WEB · *IndexedDB schema*: jobs, jobCache, drafts, queue, outboxMeta, prefs (per-user namespaced DBs, cleared on sign-out).
- [ ] **T-W12-05** · ⬜ · WEB · *Command model* (types, ids, idempotency, attempts, state: queued/sending/needs_user/failed/done).
- [ ] **T-W12-06** · ⬜ · WEB · *Sync executor*: drain per job in creation order; per-job mutex via `navigator.locks`; backoff (5s/15s/1m/5m/15m jittered); halt-on-conflict; auth pause.
- [ ] **T-W12-07** · ⬜ · WEB · *Triggers*: online event, visibility change, interval (30s), after mutation, service-worker message.
- [ ] **T-W12-08** · ⬜ · WEB · *UI SyncStatusBar*: "Saved on this device" / "Sending…" / "Saved" / "Needs your attention (1)" / "Offline. 2 changes waiting."; click opens queue sheet listing per-command state with Retry/Discard actions.
- [ ] **T-W12-09** · ⬜ · WEB · *Critical rule*: Acknowledgement in queue shows "We'll record this when you're back online" — never a green check; on connect if superseded, drop and open conflict sheet.
- [ ] **T-W12-10** · ⬜ · WEB · *Multi-tab locks*: BroadcastChannel + storage event; stale tabs refresh on visibility change; another-tab-changed-this-draft notice.
- [ ] **T-W12-11** · ⬜ · WEB · *Sign-out clears DB* after warning if queue is non-empty.

### PWA
- [ ] **T-W12-12** · ⬜ · WEB · *manifest.webmanifest*: name, short_name, start_url with `source=pwa`, display standalone, theme/background colors, maskable icons, share_target, shortcuts; icons 192/512/maskable.
- [ ] **T-W12-13** · ⬜ · WEB · *Serwist service worker*: precache shell + static assets; runtime strategies per `02` §8.3; navigation NetworkFirst with 3s timeout → /~offline; **API never cached**.
- [ ] **T-W12-14** · ⬜ · WEB · *Install prompt*: captured `beforeinstallprompt`; shown after second visit with one-line benefit; dismiss-forever option.
- [ ] **T-W12-15** · ⬜ · WEB · *Update prompt* when new SW is waiting: "Update available" with reload; never reload while editing.
- [ ] **T-W12-16** · ⬜ · WEB · *~offline page*: simple shell with "You're offline. Open a recent job or try again."; link to recent jobs from cache.

### Android sync
- [ ] **T-W12-17** · ⬜ · AN · *WorkManager workers*: PullJobWorker, SendCommandWorker, TokenRefreshWorker, MediaUploadWorker, PeriodicCleanupWorker; unique work policies, backoff, network constraints.
- [ ] **T-W12-18** · ⬜ · AN · *Outbox/command store* in Room; per-job mutex; queue UI chip showing count/tap-through detail.

### Chaos harness
- [ ] **T-W12-19** · ⬜ · QA/WEB · *Playwright chaos*: emulate offline, 3G, slow 3G; publish+ack offline, reconnect while version advanced, verify no false mutual state.
- [ ] **T-W12-20** · ⬜ · QA/AN · WorkManager test driver scenarios (reboot via test driver, Doze, metered network).

### Exit W12
- [ ] **T-W12-21** · ⬜ · TL · Queue survives refresh and service-worker restart; dropping connectivity during ack never shows "both agreed" falsely; install prompt works; offline page renders; chaos suite passes.

---

## W13 — Privacy, admin, safety, pidgin

### Backend privacy/admin
- [ ] **T-W13-01** · ⬜ · BE · *Privacy request workflow*: submit/re-auth/scope preview/grace period/orchestration worker/evidence note; per `01` §14.4 participant-conflict anonymisation rules.
- [ ] **T-W13-02** · ⬜ · BE · *Support report endpoint*: restricted content length; categorised; stored in support_cases table.
- [ ] **T-W13-03** · ⬜ · BE · *Audit log* table; append-only write-role separate from API role; every access to job content by admin/support is logged (actor, resource, reason, timestamp, ticket id).
- [ ] **T-W13-04** · ⬜ · BE · *Break-glass admin auth*: SSO + hardware key; grant creates a TTLed session (≤60 min); security owner notified; all content accesses logged.
- [ ] **T-W13-05** · ⬜ · BE · *Admin API* (separate origin, separate app): list support cases, privacy requests, revoke sessions, edit flags, request break-glass. **No endpoint that edits acks/versions exists. Add a test that asserts this.**
- [ ] **T-W13-06** · ⬜ · BE · *Block/report* endpoints (participant level, job-scoped; persistent block after 2 reports).
- [ ] **T-W13-07** · ⬜ · BE/PD · *Anti-coercion safety path* (V2-12): hidden-in-plain-sight settings link "I'm being pressured"; local resources list (women's support orgs by state — need real vetted numbers, not placeholders); "Delay my withdrawal" option that postpones notification for 24h (or user-selected) so a pressured user can leave without immediate alert to the other party.

### Admin console (web)
- [ ] **T-W13-08** · ⬜ · WEB · *Admin app shell* (separate Next.js deployment at admin.naweagree.app): login with SSO (hardware key), list of cases/privacy requests/flags; break-glass button with reason + ticket + TTL entry.
- [ ] **T-W13-09** · ⬜ · WEB · *Views*: support case detail (metadata only; content visible only during active break-glass session, with countdown timer), privacy request processing, session revoke, feature flag edit.
- [ ] **T-W13-10** · ⬜ · WEB · *Audit trail visible* on every case: who accessed, when, why.

### Web privacy/safety
- [ ] **T-W13-11** · ⬜ · WEB · *Settings/Privacy screen*: AI opt-out, data-saver toggle, export request (JSON/PNG/PDF), delete account walkthrough (scope preview with "what stays / what is removed"), sessions list/revoke, report abuse/safety link.
- [ ] **T-W13-12** · ⬜ · WEB · *Delete flow*: re-auth (OTP), 7-day grace period, cancel link in email, explanation that the other person's record is kept (anonymised) and why; export-before-delete prompt.
- [ ] **T-W13-13** · ⬜ · WEB · *Anti-impersonation banner* on invite preview (V2-13): "NaWeAgree does not verify people. Pay only in ways you normally would. We don't handle money."
- [ ] **T-W13-14** · ⬜ · CN/PD · *Pidgin review*: 3 native speakers (from SW, SE, and SS/NC or north-centric mix for balance) review and sign off on P0 strings; mark regional notes.

### Android settings
- [ ] **T-W13-15** · ⬜ · AN · *Settings/privacy/AI/delete/sessions* screens matching web parity; safety link.
- [ ] **T-W13-16** · ⬜ · AN · *FLAG_SECURE* toggle default-ON for jobs with addresses; biometric/PIN lock enforcement after timeout.

### Exit W13
- [ ] **T-W13-17** · ⬜ · TL · Export produces a readable JSON/PNG; delete grace-period works; break-glass leaves audit entries; pidgin copy signed off; safety resources have real phone numbers/links.

---

## W14 — TTS, accessibility, performance

### Read-aloud TTS
- [ ] **T-W14-01** · ⬜ · WEB · *Web Speech read-aloud* button on job overview; synthesise a plain-language summary (not field-by-field jargon); handles amount pronunciation ("eighty thousand naira"); stop/pause button; announce when unsupported.
- [ ] **T-W14-02** · ⬜ · AN · *Android TTS* read-aloud of plan summary; use Nigerian English voice if installed, otherwise default; test on 2 reference devices; duck audio focus.
- [ ] **T-W14-03** · ⬜ · PD/CN · *Plain-language summary generator* (server or client) turns field set into 5–8 sentences ("Seun will sew a long blue ankara gown for Amaka. You agreed on ₦80,000. She will deliver on November 4…"). Keep neutral tone; no inferred facts.

### Accessibility
- [ ] **T-W14-04** · ⬜ · WEB/AN/QA · *Keyboard flow* on web: every P0 action keyboard-operable; visible focus; skip link; escape closes dialogs; focus returns after dialog close.
- [ ] **T-W14-05** · ⬜ · WEB/AN/QA · *Screen reader smoke*: NVDA+Chrome web, TalkBack on 2 Android devices, VoiceOver iOS Safari for web; capture issues.
- [ ] **T-W14-06** · ⬜ · WEB · *axe-core run on every P0 route* in CI; zero serious/critical.
- [ ] **T-W14-07** · ⬜ · WEB · *200% text zoom + 320px width* layout testing; no horizontal overflow; diff view stacks.
- [ ] **T-W14-08** · ⬜ · AN · *Accessibility Scanner* on Android P0 flows; zero serious; TalkBack traversal order correct; content descriptions for icon-only actions.
- [ ] **T-W14-09** · ⬜ · WEB/AN · *Reduced motion*: respect `prefers-reduced-motion`; no parallax; no auto-advancing carousels.
- [ ] **T-W14-10** · ⬜ · WEB/AN · *High contrast/forced colors*: CSS forced-colors media query; Android dynamic color opt-in.
- [ ] **T-W14-11** · ⬜ · PD · *"Voice-first / Read it to me" mode*: larger text, bigger buttons, voice input default, TTS autoplays summary on open. Android: explicit 3-choice size prompt on first launch if not already system-large.

### Performance
- [ ] **T-W14-12** · ⬜ · WEB · *Code splitting* per route; heavy components (diff viewer, plan card, image cropper) dynamic-imported on interaction.
- [ ] **T-W14-13** · ⬜ · WEB · *Fonts*: subset variable sans or system font default; `font-display: swap`; no icon font; preload critical fonts only.
- [ ] **T-W14-14** · ⬜ · WEB · *Image budgets*: next/image sizes; lazy below fold; data-saver mode default-on when Save-Data header or connection effectiveType is 2g/slow-2g; text-only cards shown before images.
- [ ] **T-W14-15** · ⬜ · WEB · *Lighthouse CI* integrated into PR; budgets per `02` §14 (LCP < 2.5, INP < 200, CLS < 0.1, JS ≤ 150 KB initial); PR fails on >5% regression.
- [ ] **T-W14-16** · ⬜ · AN · *Baseline profiles* generated and shipped; R8 full mode; ABI splits (arm64-v8a, armeabi-v7a, x86_64); resource shrinking; target AAB download ≤ 6 MB; cold start on 2 GB reference < 2.5s p90.
- [ ] **T-W14-17** · ⬜ · WEB/AN · *Real User Monitoring*: web-vitals + Android Perfetto; dashboards split by device class and connection type.

### Exit W14
- [ ] **T-W14-18** · ⬜ · TL · A11y zero-serious; Lighthouse meets budgets; Android cold start under target; TTS pronounces amounts correctly.

---

## W15 — Security, runbooks, drills, multi-contact handles

### Security & pen-test prep
- [ ] **T-W15-01** · ⬜ · OPS/BE · *Security headers audit*: CSP nonce rotation per request, no unsafe-inline except trusted hashes; cookie __Host- prefix; HSTS preload submission prepared; Referrer-Policy no-referrer; Permissions-Policy correct.
- [ ] **T-W15-02** · ⬜ · OPS/BE · *Open redirect test*: `returnTo` validated against internal path regex; SSRF test on avatar/URL fields (none accepted); content-sniff tests.
- [ ] **T-W15-03** · ⬜ · OPS/BE · *Rate-limit load test*: simulate OTP brute force, invite spam, AI flood; ensure 429s fire and lockouts work.
- [ ] **T-W15-04** · ⬜ · OPS · *Limited-scope pen-test* by external or in-house reviewer: authz, invite-token brute force, XSS, CSRF, file upload (EICAR + polygot), TLS pinning, Android backup flag, exported components.
- [ ] **T-W15-05** · ⬜ · BE · *Dependency audit*: no postinstall scripts; lockfile audited; known CVE responses documented.
- [ ] **T-W15-06** · ⬜ · OPS/AN · *Android security*: `allowBackup=false`, exported components explicitly, no logs with content, screenshot/FLAG_SECURE for sensitive screens, no world-readable files.

### Runbooks & drills
- [ ] **T-W15-07** · ⬜ · OPS · Write 7 runbooks per `01` §15.3: data exposure, wrong AI extraction, invite/account compromise, queue backlog, DB failover, delete-request conflict, Play/web rollback.
- [ ] **T-W15-08** · ⬜ · OPS · *Backup/restore drill*: restore staging from backup, verify PITR within RPO ≤ 5 min, RTO ≤ 4h, outbox replays correctly, invariant monitor runs against restored DB.
- [ ] **T-W15-09** · ⬜ · OPS · *Drill 1 — suspected data exposure*: walk through runbook (revoke sessions, scope, notify, preserve logs).
- [ ] **T-W15-10** · ⬜ · OPS · *Drill 2 — wrong AI extraction / flag off* (with AI disabled by default this is still drilled).
- [ ] **T-W15-11** · ⬜ · OPS · *On-call rota*: 24/7 coverage for pilot launch; escalation tree; PagerDuty (or equivalent) configured; on-call phone tested.

### Canary / deploy
- [ ] **T-W15-12** · ⬜ · OPS · *Canary pipeline*: 5% cookie-hash → 25% → 100%; auto-rollback on error-rate >1% or LCP p75>3s or SLO-4 (false confirmed) any incident.
- [ ] **T-W15-13** · ⬜ · OPS · *Migration policy*: expand/migrate/contract script validated; forward + backward migrations tested on production-sized anonymised snapshot.

### Multi-contact handles (V2-11)
- [ ] **T-W15-14** · ⬜ · BE · *Allow multiple verified contacts per account* (up to 2 phones + 1 email); login accepted via any verified contact; primary contact selectable.
- [ ] **T-W15-15** · ⬜ · BE/WEB/AN · *Add contact flow* in settings (OTP on new contact, merge detection).
- [ ] **T-W15-16** · ⬜ · BE · *Channel-aware OTP routing*: send OTP to the contact/channel that's being used for current sign-in attempt.

### Data saver/network
- [ ] **T-W15-17** · ⬜ · WEB/AN · *Auto data-saver* when Save-Data or metered network detected; image preloading disabled; sync deferrable; badge "Data saver is on" in SyncStatusBar.
- [ ] **T-W15-18** · ⬜ · AN · *OEM "fix notifications" screen*: detect when FCM messages are delayed and offer per-OEM instructions (Xiaomi, Tecno, Infinix, Samsung, Gionee) with screenshots.

### Exit W15
- [ ] **T-W15-19** · ⬜ · TL · High/critical pen-test findings closed; backup/restore succeeded within RTO; canary auto-rollback tested; multi-contact login works; OEM instructions screens for at least 5 OEMs.

---

## W16 — Pilot readiness gate (Gate 1)

### Marketing & pilot content
- [ ] **T-W16-01** · ⬜ · PD/CN · *Privacy notice, terms, help centre*: written in en-NG + Pidgin; legal counsel signed off; no "contract" or "binding" language.
- [ ] **T-W16-02** · ⬜ · PD/WEB · *Marketing page* final copy; hero, 3-step, cross-category use cases (equal visual weight), AI transparency, privacy/equal-footing, FAQ (contract? accounts? WhatsApp? AI? decline?).
- [ ] **T-W16-03** · ⬜ · PD · *Pilot onboarding kit*: 1-page guide for providers (what it does, how to invite, who to text for help), in en-NG + Pidgin.
- [ ] **T-W16-04** · ⬜ · OPS · *WhatsApp Business support line* live; macros for top 5 issues (link not opening, didn't get OTP, wrong price, don't want to use anymore, harassment report); SLA Mon–Sat 9am–6pm WAT.
- [ ] **T-W16-05** · ⬜ · PD · *Consent flow* for research and data use (opt-in to research, never pre-checked); plain-language explanation of AI processing and 7-day audio retention.

### Product readiness
- [ ] **T-W16-06** · ⬜ · WEB · *Server-rendered invite page* fully tested on: Android Chrome, Samsung Internet, WhatsApp in-app browser, Facebook in-app browser, Chrome iOS, Safari iOS. Static screenshot works without JS.
- [ ] **T-W16-07** · ⬜ · WEB/AN · *Honorifics* wired in invite flow (chips + custom); shown consistently on plan card and timeline.
- [ ] **T-W16-08** · ⬜ · PD · *Photo closeout and "We don't agree" flow*: scoped for public-launch (W22–W24) but placeholder copy and route exist; users know to reach support for disagreements during pilot.
- [ ] **T-W16-09** · ⬜ · QA · *Dogfood week*: every team member completes 3 fictional jobs with a partner; file all bugs; S1/S2 fixed before pilot.
- [ ] **T-W16-10** · ⬜ · OPS · *Kill switches / min-supported-version* endpoint: tested; web + Android respect it; emergency-banner endpoint.
- [ ] **T-W16-11** · ⬜ · QA · *Test data purged* from staging; production seeded only with admin users; synthetic monitor pointed at production.

### Gate review
- [ ] **T-W16-12** · ⬜ · TL/PD · *Gate 1 go/no-go meeting*: walk checklist in `05` §7 Gate 1 (SLOs, authz negative tests green, a11y, plan card renders, pen-test findings closed, runbooks drilled, pilot participants scheduled). All present; if any red, W16 extends until fixed.

### Exit W16 (Private pilot opens)
- [ ] **T-W16-13** · ⬜ · PD · *Wave-1 providers onboarded in person*; first job scheduled for W17 Monday; team member on call for first 48 h.


---

# PHASE 4 — PRIVATE PILOT (W17–W24) & PHASE 5 — ANDROID (OVERLAPPING W6–W22)

## W17–W18 — Pilot Wave 1: Friendly 10

### Operations
- [ ] **T-W17-01** · ⬜ · PD · *Onboard each provider in person or via call* (45 min); walk through install/sign-in/create-job/invite flow; take notes.
- [ ] **T-W17-02** · ⬜ · ALL · *Daily triage* (first 2 weeks): 30-min meeting at 6pm WAT to walk new bugs; S1 gets owner within 1 hour.
- [ ] **T-W17-03** · ⬜ · OPS · *On-call schedule published* for first 2 weeks (rotating); on-call has WhatsApp support line on phone.

### Engineering support
- [ ] **T-W17-04** · ⬜ · BE/WEB/AN · *Canary 5% → 100%* to production behind canary; if pilot users need features only in staging, point them via flag.
- [ ] **T-W17-05** · ⬜ · QA · *Reproduction environment*: ability to create a staging clone from production logs (scrubbed) when investigating issues.
- [ ] **T-W17-06** · ⬜ · BE · *Instrument funnel analytics*: jobs created → invite sent → invite opened → verified → redeemed → draft published → mutual ack → change proposed → completed. Dashboard updated hourly.

### Research
- [ ] **T-W17-07** · ⬜ · PD · *Post-first-job interviews* with each provider and (where possible) their customer; capture verbatim: what felt weird, what was missing, any suspicion/paperwork feeling, network issues, device issues.
- [ ] **T-W17-08** · ⬜ · PD · *Log bug + feature requests* directly into the issue tracker tagged `pilot-wave1`.

### Android parallel
- [ ] **T-W18-01** · ⬜ · AN · *Encrypted Room/DB verified* via debugging; DB file extracted from emulator is unreadable without key.
- [ ] **T-W18-02** · ⬜ · AN · *Repository layer fully real* (all P0 endpoints used; no fake data remaining on primary flows).
- [ ] **T-W18-03** · ⬜ · AN · *FCM data-only messages tested* on reference devices (Pixel/Samsung); deep links work after cold start.
- [ ] **T-W18-04** · ⬜ · AN · *Notification channels* created; quiet hours defaults.
- [ ] **T-W18-05** · ⬜ · AN · *Biometric/PIN lock* wired end-to-end: enable from settings; lock after configurable timeout; fallback to device credential.
- [ ] **T-W18-06** · ⬜ · AN · *FLAG_SECURE* toggle wired to privacy setting, default ON for sensitive fields.

### Exit W18
- [ ] **T-W18-07** · ⬜ · PD · *Wave-1 review* (DG-4): 10+ jobs completed or attempted; top 5 pain points catalogued; decision on whether to (a) continue to Wave 2 with fixes, (b) revisit copy/onboarding, or (c) stop.

---

## W19–W21 — Pilot Wave 2: Cluster 30 (plus Android platform polish)

### Recruitment and clusters
- [ ] **T-W19-01** · ⬜ · PD · *Pick top 3 categories* from Wave-1 signal (default: tailoring, carpentry, printer/event); recruit 2 captains per cluster (total 6 captains).
- [ ] **T-W19-02** · ⬜ · PD · *Captain onboarding*: in-person visit, app walkthrough, ₦1,000 airtime per completed job (capped), direct WhatsApp channel to team; ask them to invite 2 peer providers each.
- [ ] **T-W19-03** · ⬜ · PD · *Informed consent & honoraria* documentation; records kept per NDPA requirements.

### Product hardening from Wave-1 findings
- [ ] **T-W20-01** · ⬜ · ALL · Triage and fix all pilot S1/S2 bugs; defer S3/S4 to a prioritized list.
- [ ] **T-W20-02** · ⬜ · PD/CN · *Copy adjustments* based on observed confusion (e.g., users misunderstand "I have seen and I agree", adjust wording; test 2 variants with Wave-2 cohort).
- [ ] **T-W20-03** · ⬜ · WEB/AN · *Onboarding tweaks*: if users are stuck at a specific step, add a tooltip, a 1-sentence explainer, or an example.

### Public-launch feature work lands in this window
- [ ] **T-W20-04** · ⬜ · BE/WEB/AN · *Photo closeout (V2-09)*: prompt 1–3 photos on closeout, before/after for repairs, "needs follow-up" with photo; compress to 1080px; media upload worker handles.
- [ ] **T-W20-05** · ⬜ · BE/WEB/AN · *"We don't agree" flow (V2-10)*: side-by-side conflict view, three neutral options (talk / invite trusted observer read-only / close job); printable evidence pack PDF (server-rendered) watermarked "Not a legal document".
- [ ] **T-W20-06** · ⬜ · PD · *Nigeria help pages*: links to FCCPC, small-claims courts Lagos/Abuja/Port-Harcourt, consumer rights contacts; safety resources; neutral tone.
- [ ] **T-W20-07** · ⬜ · BE/WEB/AN · *Voice-first "read it to me" mode* (V2-21): larger text, fewer buttons, voice input default, TTS autoplays.
- [ ] **T-W20-08** · ⬜ · WEB/AN · *Block & report* UI: from participant row; confirm; confirmation explains it won't notify the other person immediately.
- [ ] **T-W20-09** · ⬜ · BE · *Tenure signal* (V2-13): "Seun has used NaWeAgree for N jobs" shown with consent; off by default for first X users, on after opt-in.

### Android platform
- [ ] **T-W21-01** · ⬜ · AN · *WorkManager stable*: SendCommandWorker, PullJobWorker, MediaUploadWorker (foreground service >10 MB uploads or >30s), TokenRefreshWorker, CleanupWorker tested with WorkManagerTestInitHelper.
- [ ] **T-W21-02** · ⬜ · AN · *CameraX + MediaRecorder + Photo Picker + FileProvider*: full capture flow tested on reference devices; playback works; upload survives app kill.
- [ ] **T-W21-03** · ⬜ · AN · *Share-intent receiver* handles ACTION_SEND (text/image) and ACTION_SEND_MULTIPLE; ShareInbox persists to Room; survives process death; routes to New Job screen.
- [ ] **T-W21-04** · ⬜ · AN · *Coil integration*: signed-URL fetcher, 200 MB disk cache, LRU eviction; images show correctly on 2 GB device without OOM.
- [ ] **T-W21-05** · ⬜ · AN · *Settings screens parity* (notifications, privacy, AI opt-out, lock, data saver, language).

### Exit W21
- [ ] **T-W21-06** · ⬜ · PD · *Wave-2 midpoint review*: 30+ jobs; invite open and mutual-ack rates tracked; if either is below threshold (40%/20%), prioritize fixes before Wave-3.

---

## W22–W24 — Wave 3 organic, Android closed, public-launch items

### Organic wave
- [ ] **T-W22-01** · ⬜ · PD · *Soft-launch* to captains' networks (no paid ads, just captains sharing); monitor organic invite trees.
- [ ] **T-W22-02** · ⬜ · PD · *Power-user captains* identified; invite them to a feedback group (WhatsApp).

### Android closed testing
- [ ] **T-W22-03** · ⬜ · AN · *Baseline profiles committed*; startup benchmark Macrobenchmark test verifies cold start p90 < 2.5s on 2 GB reference.
- [ ] **T-W22-04** · ⬜ · AN · *R8/resource shrinking, ABI splits*; verify AAB ≤ 6 MB; local APK smoke test on minSdk 26 and latest Android.
- [ ] **T-W22-05** · ⬜ · AN/OPS · *Play listing*: data-safety form filled accurately (declare only what we collect and for what purpose), content rating questionnaire, screenshots (phone/7" tablet), privacy policy URL, content rating, no "fastest" / "100% safe" claims.
- [ ] **T-W22-06** · ⬜ · AN · *Internal track* (50 users, team + Wave-2 providers on Android); collect crash-free rate; block on <99% for 7 days.
- [ ] **T-W22-07** · ⬜ · AN · *Closed testing* (staged 10% → 100%) to Wave-2 Android users; ANR monitoring; device-specific bug fixes (OEM-specific crashes prioritized).
- [ ] **T-W22-08** · ⬜ · AN · *Accessibility pass II*: Accessibility Scanner zero serious; TalkBack walkthrough for create→ack→change→closeout; large-font mode tested.

### Public-launch feature finalization
- [ ] **T-W23-01** · ⬜ · BE/WEB/AN · *Helper/apprentice role (V2-18)*: can see shared plan, add photos, report delivery, ask questions; cannot acknowledge; timeline attribution "Posted by Chidi, Seun's apprentice".
- [ ] **T-W23-02** · ⬜ · BE/WEB · *PDF export* via headless Chromium worker (v1.1 priority; if it slips, PNG-only for launch).
- [ ] **T-W23-03** · ⬜ · BE/WEB · *Religious/region quiet hours* (V2-25): default 9am–6pm Mon–Sat; Fri 1pm–3pm quiet for Jummah; users can override.
- [ ] **T-W23-04** · ⬜ · WEB · *Square plan-card variant* (1080×1080) + "Share to WhatsApp Status" / "Share to Instagram Stories" chooser (uses Web Share API where available; download otherwise).
- [ ] **T-W23-05** · ⬜ · BE/PD · *Recovery phrase (optional)* at sign-up; 12 words, displayed once; tested for recovery on new device.
- [ ] **T-W23-06** · ⬜ · BE/PD · *Willingness-to-pay interviews* (V2-32) with 10 providers; record price tolerance for pay-per-job vs subscription; do not build payments yet.
- [ ] **T-W23-07** · ⬜ · BE/AI · *AI evaluation corpus* build begins (V2-33, ≥500 samples) with consented local voices, pidgin variants, market noise; not enabled for launch.
- [ ] **T-W23-08** · ⬜ · WEB/AN · *Repeated-customer one-tap (V2-27)*: after completion, "Start another job with this person" pre-populates category and participant.

### Load & soak
- [ ] **T-W23-09** · ⬜ · OPS/QA · *Load test* at 3× projected peak (30 concurrent publish/ack pairs, 100 concurrent list reads, 20 concurrent attachments); assert outbox lag < 5min p95.
- [ ] **T-W23-10** · ⬜ · OPS · *Staging soak*: run full synthetic workload for 72 hours; check for memory leaks, queue buildup, connection pool exhaustion.
- [ ] **T-W23-11** · ⬜ · OPS · *DB failover drill* on staging; promote Neon branch, replay outbox, verify integrity.
- [ ] **T-W23-12** · ⬜ · OPS · *Rollback drill*: deploy bad canary, verify auto-rollback fires, confirm no data corruption; manual rollback for Android staged release documented.

### Gate DG-6 (Go-public)
- [ ] **T-W24-01** · ⬜ · TL/PD · *Gate 2 meeting* (end of W24): pilot success criteria from `01` §1.4 reviewed (invite open ≥60%, mutual ack ≥40%, change activity ≥25%, create→share <15min, S1 incidents 0, support <0.3/job); explicit go/pivot/stop decision recorded.
- [ ] **T-W24-02** · ⬜ · PD/legal · *Final legal review* of privacy notice, terms, pilot data destruction or retention.
- [ ] **T-W24-03** · ⬜ · PD · *Launch comms*: changelog, known issues doc, provider captains notified, user stories (with explicit consent) lined up.


---

# PHASE 6 — PUBLIC LAUNCH (W25–W28)

## W25 — Launch readiness finalization
- [ ] **T-W25-01** · ⬜ · TL · *Release branch* cut; main continues for post-launch fixes; release branch only accepts bugfixes.
- [ ] **T-W25-02** · ⬜ · OPS · *Production checklist*:
  - T-W25-02.1 Canary % reset; 5% rollout to production web.
  - T-W25-02.2 Android rollout staged 10% → 50% → 100% (over 3 days).
  - T-W25-02.3 SMS/email/FCM budgets topped up.
  - T-W25-02.4 Sentry alerts routed to on-call phone.
  - T-W25-02.5 On-call rota confirmed for 14 days post-launch.
  - T-W25-02.6 Support WhatsApp line staffed; macros updated for expected launch questions.
- [ ] **T-W25-03** · ⬜ · PD · *Press/captain notifications*: email/captains-only WhatsApp note announcing launch day.
- [ ] **T-W25-04** · ⬜ · WEB/PD · *Public marketing page live* (en-NG + Pidgin); landing A/B copy variants ready.

## W26–W27 — Launch week
- [ ] **T-W26-01** · ⬜ · TL · *Soft launch Monday* (existing pilot users + their networks only); no public announcement.
- [ ] **T-W26-02** · ⬜ · ALL · *Daily standup at 9am WAT* for first 14 days; incident commander named each day.
- [ ] **T-W26-03** · ⬜ · OPS · *Hourly metrics review* for first 72 h: error rate, p95 latency, crash-free sessions, queue lag, SMS delivery rate, invite open rate.
- [ ] **T-W26-04** · ⬜ · QA/WEB/AN · *No new features* for first 7 days; only blocker/critical bug fixes.
- [ ] **T-W26-05** · ⬜ · PD/OPS · *Support response SLA*: 2-hour first response during waking hours for first two weeks.
- [ ] **T-W27-01** · ⬜ · PD · *Social/captain-led announcement*; no paid ads yet; rely on organic + captain shares.
- [ ] **T-W27-02** · ⬜ · AN · *Play Store reviews* responded to within 24 hours (including negative ones).
- [ ] **T-W27-03** · ⬜ · WEB · *Status page* (`status.naweagree.app`) updated during any incident; users directed there from support.

## W28 — Launch retro & roadmap reset
- [ ] **T-W28-01** · ⬜ · PD · *Launch retro (2h)*: top 5 surprises, top 5 friction points, top 5 wins.
- [ ] **T-W28-02** · ⬜ · TL · *Reliability debt list*: OEM-specific failures, slow queries, OOMs, FCM drop rates — scheduled into W29+.
- [ ] **T-W28-03** · ⬜ · PD · *Roadmap reset*: decide v1.1 priorities based on pilot+launch data; deprioritize everything not in the top 3 problems.
- [ ] **T-W28-04** · ⬜ · PD · *Thank-you comms* to pilot users and captains; credit early testers visibly in a changelog (with consent).

---

# PHASE 7 — POST-LAUNCH (W29+)

Priority order:

1. **Reliability debt** (anything discovered in production).
2. **Top friction fixes** from support + funnel.
3. **Provider-paid tier exploration** (after ≥ 30 providers have done ≥ 3 jobs each).
   - T-W29-01 · ⬜ · PD/BE · *Pay-per-job ₦100* vs *monthly ₦500* A/B test; in-app purchase on Android (Play billing library) and web (Paystack/Flutterwave). Do not start this work before willingness-to-pay evidence.
4. **v1.1 features** (deferred from launch):
   - T-W29-02 · ⬜ · Business identity (provider business name + workshop photo; no ratings).
   - T-W29-03 · ⬜ · WIP photo (one-per-day optional during in_progress).
   - T-W29-04 · ⬜ · QR invite (`/q/:code`) for in-person handoff + 6-character short-code `/c/:code` routing.
   - T-W29-05 · ⬜ · Provider week calendar view.
   - T-W29-06 · ⬜ · "Make it bigger" one-tap size setting on Android first launch.
   - T-W29-07 · ⬜ · Plan-card footer ("Made with NaWeAgree") — roll out via A/B test only after users organically share screenshots without being asked.
5. **AI enablement** (gated):
   - T-W29-08 · ⬜ · AI/BE · Build consented evaluation corpus ≥ 500 samples (local voices, pidgin, noisy).
   - T-W29-09 · ⬜ · AI/BE · Achieve release thresholds (false-certainty <1%, 0 fabricated amounts, ambiguity recall >90%); flip flag per-category, monitor weekly.
   - T-W29-10 · ⬜ · WEB/AN · Wire AI draft panel (per-field accept/edit/reject); AI opt-in screen during job creation; STT audio transcribed via STT adapter with 7-day default audio deletion.
6. **v2 horizons** (3–6 months post-launch, evidence-dependent):
   - Community templates with governance.
   - Portable job passport export.
   - Multi-party beyond helper (observer role for family member/interpreter).
   - Disaster/continuity mode.
   - Third-party mediator referral partner program (not adjudication).
   - WhatsApp Business API for replies (if opt-in and approved; no cold outreach).

---

# STANDING CHECKLISTS (re-run before every release)

## Pre-deploy smoke (run by QA each release)
- [ ] Sign up with phone OTP works on Chrome Android, Safari iOS, reference Android Go device.
- [ ] Magic link login works.
- [ ] Create job → invite → preview renders in WhatsApp in-app browser → redeem works.
- [ ] Publish v1 → both acknowledge → "mutual" status shown on both devices.
- [ ] Proposed change → reject → prior version still current; UI matches.
- [ ] Proposed change → accept → new version created; old version viewable in history.
- [ ] Withdraw ack creates event; does not delete original.
- [ ] Deposit mismatch surfaces conflict.
- [ ] Attachment upload → renders → delete works; EICAR is blocked.
- [ ] Plan card PNG renders; fingerprint visible; "not a legal document" disclaimer present.
- [ ] Offline: kill network mid-ack; "Waiting to send" shown (never green check); reconnect either sends or prompts on superseded.
- [ ] Sign-out clears IndexedDB/Room/cache; session is revoked server-side.
- [ ] Delete account: 7-day grace, cancel link in email, other side sees anonymised participant.
- [ ] Email/SMS/ push delivers with no sensitive content in subject/lock-screen.
- [ ] Admin break-glass leaves audit entry; cannot edit acks.

## Post-deploy smoke (run within 30 min of deploy)
- [ ] Health/ready 200.
- [ ] Synthetic invariant monitor pass (cron job completed).
- [ ] Sentry error rate baseline (<0.5% within 1 hour).
- [ ] Canary metrics (LCP, latency, crash-free) green.
- [ ] Support WhatsApp inbound test (send a message, autoresponder works).

## Monthly reviews
- [ ] Cost review (per-job cost vs revenue/value).
- [ ] Pilot metrics review against targets.
- [ ] Security log review (admin break-glass, failed auth, rate-limit spikes).
- [ ] AI metrics (if enabled): false-certainty, correction rate, user opt-out rate.
- [ ] Support top-10 issues; prioritize bugs over new features.
- [ ] Copy review: any stale/confusing strings from the changelog?
- [ ] Dependency upgrades and security patches applied.

---

# RAPID-RESPONSE ESCALATION CHEAT SHEET

| Signal | First action | Who owns |
|---|---|---|
| Sentry error rate > 2% for 10 minutes | Roll back latest deploy; post in #incidents | On-call |
| Any case of false "mutually acknowledged" in UI but not server | Feature-flag the ack flow, push message to affected users, open S1 | TL |
| OTP/SMS delivery < 80% for 15 min | Switch SMS vendor (if redundant) or notify via email/in-app; post status page | On-call OPS |
| FCM delivery drops > 20% on a specific OEM | Push OEM-specific guidance, enable SMS fallback for those users | AN |
| DB connection pool saturation | Scale read replica; throttle non-critical writes | BE/OPS |
| Abuse report: user pressured/coerced | Route to safety escalation; don't notify other party for 24h per user setting | Support + TL |
| Data exposure confirmed | Revoke sessions, rotate keys, follow runbook; notify counsel within 24 h | OPS/legal |
| Play Store rejection | Address policy issue; if critical, publish TWA as interim; communicate timeline | AN/PD |
| Cost spike > 2× baseline | Identify source (AI? SMS? storage?), apply per-job budget kill switch | OPS/BE |
| Pilot mutual-ack rate < 20% at 30 jobs | Pause expansion, schedule usability retest, consider pivot to provider-quote-only | PD/TL |

---

# BUG SEVERITY DEFINITIONS

- **S1 (critical):** Data integrity risk; user could see false "agreed"; data loss; security breach; crash on launch; impossible to complete a P0 flow. Fix within 4 hours, hotfix deploy.
- **S2 (major):** P0 flow blocked for a subset of users/devices/browsers; incorrect content shown but no false-ack; significant performance regression. Fix within 24 hours.
- **S3 (minor):** Cosmetic issues, edge-case copy errors, non-blocking UX friction. Fix in regular release.
- **S4 (polish):** Suggestions, nice-to-haves. Backlog, prioritized quarterly.

---

# DEFINITION OF DONE FOR A TASK (ticked only when all are true)

1. Code written and follows project conventions (tokens, i18n, error envelope, no raw SQL, no hard-coded colors).
2. Unit tests cover the happy path, error path, and at least one negative/edge case.
3. If a mutation: idempotency test + authz negative test exists.
4. If a UI change: a11y name/role/value verified; keyboard/TalkBack smoke; loading/error/empty states present.
5. If Android: works on reference 2GB device; doesn't increase APK beyond 6 MB; doesn't cause ANR in profile.
6. If web: no new JS exceeds 5 KB delta in initial bundle without flag; Lighthouse delta accounted for.
7. Strings added to `en-NG` and `pcm` (pcm can be "TODO: translate" with flag for launch, but key exists).
8. Copy has been seen by PD/CN before merge if user-facing.
9. Sentry/analytics event added if action is a meaningful milestone (and respects no-content rule).
10. PR description references the todo ID(s) closed, describes what changed, and includes a screenshot/recording for UI changes.
11. Code reviewed by one engineer from the appropriate track (BE/WEB/AN); security-sensitive changes reviewed by a second.
12. Deployed to preview and manually tested by the author before merge.
13. Any new environment variable or secret is documented and added to the vault + preview/staging/prod.
14. Any new user-facing flow has a corresponding Playwright or Maestro test.
15. Documentation (runbooks, READMEs, this file) updated if the change affects process or architecture.

---

# HOW TO KEEP THIS FILE ALIVE

- Each PR that adds work not on this list must append the item to this file with a `T-W{n}-NEW-{seq}` ID and a short note explaining why it was added.
- Every Friday retro, items that are done get their ⬜ flipped to ✅ with a note linking to the PR.
- Items that are cut consciously get flipped to 🗑️ with the reason and date.
- Items deferred go to 🟨 with which release they're deferred to.
- Once per month, re-read docs 01–07 in order, compare to this list, and update estimates.
