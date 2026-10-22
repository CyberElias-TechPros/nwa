# 07 — Implementation Roadmap (Start → Pilot → Public Launch)

**Purpose:** week-by-week execution plan turning docs/01–06 into a shipped product. Ties together decisions, architecture, backlog, and the excellence-audit v2 items.
**Start date (W0):** Monday, 2 November 2026 (example — replace with actual kickoff date; all dates are relative).
**Cadence:** Monday sprint planning, Thursday demos, Friday retros. Code ships to preview every PR; staging every Thursday; canary only after Gate 1.
**Owner per track:** TL=Tech Lead, BE=Backend, WEB=Web, AN=Android, PD=Product/Design, QA=QA/Release, OPS=DevOps/Sec.
**Legend:** 🟢 normal progress · 🟡 at risk · 🔴 blocker · ✅ exit criterion met.

---

## Contents

1. [Pre-start: week 0 (this week)](#1-pre-start-week-0-before-any-code)
2. [Phase 0 — Decision sprint (W1, 3–9 Nov)](#2-phase-0--decision-sprint-w1)
3. [Phase 1 — Platform & foundations (W2–W5)](#3-phase-1--platform--foundations-w2w5)
4. [Phase 2 — Core job loop on web (W6–W9)](#4-phase-2--core-job-loop-on-web-w6w9)
5. [Phase 3 — Web hardened + pilot readiness (W10–W16)](#5-phase-3--web-hardened--pilot-readiness-w10w16)
6. [Phase 4 — Private pilot (W17–W24)](#6-phase-4--private-pilot-w17w24)
7. [Phase 5 — Android to closed testing (overlapping W6–W22)](#7-phase-5--android-to-closed-testing-w6w22)
8. [Phase 6 — Public launch (W25–W28)](#8-phase-6--public-launch-w25w28)
9. [Phase 7 — Post-launch (W29+)](#9-phase-7--post-launch-w29)
10. [Week-at-a-glance calendar](#10-week-at-a-glance-calendar)
11. [Decision and review gates](#11-decision-and-review-gates)
12. [Team routines](#12-team-routines)
13. [If things slip: what to cut first](#13-if-things-slip-what-to-cut-first)
14. [Day-one checklist (kickoff day)](#14-day-one-checklist-kickoff-day)

---

## 1. Pre-start: week 0 (before any code)

**Goal:** have everything staged so that W1 can produce an ADR log and contracts, not meetings.

| # | Task | Owner | Done when |
|---|---|---|---|
| 0.1 | Confirm founding team and who is full-time vs part-time for the first 16 weeks | PD | Named owners on every track (TL/BE/WEB/AN/QA/OPS/PD) |
| 0.2 | Lock communication channels: GitHub (source of truth), Slack/Discord (#engineering, #product, #pilot-ops, #incidents), shared doc space | TL | Channels exist, all team members invited |
| 0.3 | Set up GitHub repo protections: required PR reviews (1 BE + 1 client), CI checks must pass, no direct pushes to main | TL | Repo settings applied; CODEOWNERS file |
| 0.4 | Provision Cloudflare/Neon/R2 accounts; pick SMS vendor shortlist (Termii, Twilio, Twilio Verify, MessageBird); pick email vendor (Resend/SES); pick Sentry; pick analytics proxy | OPS | Logins stored in shared password vault; staging environments exist |
| 0.5 | Purchase domain (`naweagree.app` or chosen alternative); set up DNS | OPS | Domain resolves; EV/SSL cert planned |
| 0.6 | Create Play developer account ($25); set up Firebase project(s) per environment | AN/OPS | Access granted; google-services.json placeholders |
| 0.7 | Book 30 min call with local counsel to start NDPA/terms/privacy review | PD | Date on calendar before W6 |
| 0.8 | Begin recruiting Wave-1 friendly providers (5) for early research and pilot | PD | Names list of 8+ candidates; first 5 interviews scheduled for W3 |
| 0.9 | Pick a reference test device (2 GB RAM Android Go, e.g. Tecno Spark / itel) and buy 2 for the device lab | QA | Devices in hand by W5 |
| 0.10 | Confirm weekly recurring meetings: Mon planning, Thu demo, Fri retro, daily 15-min standup | PD | Calendar invites sent |

---

## 2. Phase 0 — Decision sprint (W1)

**Goal:** turn the 18 open decisions into recorded ADRs; produce OpenAPI v0 and the fixture pack so coding can begin in W2.

| Day | Theme | Deliverable | Owner |
|---|---|---|---|
| Mon | Kickoff + product walkthrough | Team has read README + docs/01-06; no open confusion about the 12 invariants | PD/TL |
| Tue | Architecture decisions (D-01…D-18) | ADR log entries for all 18 decisions, each DECIDED or PROVISIONAL with owner and date | TL |
| Wed | API contract v0 | OpenAPI YAML for all P0 endpoints; error codes; idempotency; rate limits | BE/WEB/AN |
| Thu | Data model + domain types | `packages/contracts` and `packages/domain` with types; generated TS/Kotlin clients compile | BE |
| Fri | Design tokens v1 + copy deck v1 | Tokens JSON → CSS vars + Compose theme; en-NG copy for P0 screens; Pidgin skeleton | PD/WEB/AN |

**Week 1 exit criteria (all must pass):**
- ✅ ADR log has 18 decisions recorded.
- ✅ OpenAPI compiles; TS + Kotlin clients generate in CI and drift check fails the build.
- ✅ Conformance fixture pack has ≥ 20 scenarios incl. happy path, rejected change, superseded ack, invite expiry, 404, 409 conflict, offline ack queued.
- ✅ Monorepo skeleton (`apps/web`, `apps/android`, `services/api`, `packages/*`) builds and CI is green on a hello-world PR.
- ✅ Vendors short-listed to ≤ 2 per category; contracts/DPA review started.

**If you skip this week and start coding, you will spend 3–4x more time reworking later.** Do not skip.

---

## 3. Phase 1 — Platform & foundations (W2–W5)

Goal: environments, database, auth skeleton, jobs/participants, manual brief, invites, and the provider/customer can create and exchange an invitation against staging.

### W2 — Infra + DB skeleton
- Terraform dev/preview/staging/prod (Workers, Neon, R2, Queues, KV)  *(BE/OPS)*
- Postgres schema + migrations framework; first 10 tables (users, contacts, sessions, jobs, participants, invitations, versions, acks, change_requests, questions)  *(BE)*
- Hono API skeleton; validation; error envelope; logging; health endpoints  *(BE)*
- CI pipelines: lint/typecheck/unit/build for all three apps  *(OPS/WEB/AN)*
- Observability: Sentry, OTel pipeline, dashboards for availability/latency  *(BE/OPS)*
- Project scaffold: web (Next.js) and Android (Gradle/Compose/Hilt)  *(WEB/AN)*

### W3 — Auth & security baseline
- OTP start+verify endpoint + SMS integration  *(BE)*
- Email magic-link endpoints  *(BE)*
- Web session cookie (httpOnly __Host-) / Android OAuth PKCE skeleton  *(BE/WEB/AN)*
- Authorization middleware (capability-based) + negative cross-job substitution tests  *(BE)*
- CSP/HSTS/CSRF headers on web; TLS pinning scaffolding on Android  *(WEB/AN/OPS)*
- Rate limiter (token bucket); idempotency middleware  *(BE)*

### W4 — Jobs, participants, manual brief (web only for now)
- Jobs CRUD + list/get/patch + pause/cancel/archive  *(BE)*
- Invitation create/revoke/redeem (OTP-gated)  *(BE)*
- Field schema + templates v1 (outcome, scope, price, timing, delivery, materials, questions)  *(BE/PD)*
- Draft endpoints with draftRev concurrency  *(BE)*
- Web: marketing shell, sign-in/verify/OTP screens, jobs list, create job (category/title/paste intake)  *(WEB)*
- Android: scaffold, tokens Compose, Hilt, Room schema v1, Retrofit client  *(AN)*

### W5 — Invitations end-to-end on web + design system
- Invite preview (server-rendered, static HTML, plan card placeholder — V2-03)  *(BE/WEB)*
- Pre-composed WhatsApp invite message (V2-02)  *(WEB/PD)*
- Web: People/invite screen, manual brief editor (grouped fields, "not decided", states), autosave  *(WEB)*
- Android: auth screens (splash/Sign in/OTP/SMS Retriever)  *(AN)*
- Component library: tokens → primitives (Button, Field, Dialog, Badge, Card, SyncBar)  *(WEB/AN)*
- Synthetic invariant monitor cron starts running (publish/ack/change/reject loop every 5 min)  *(BE/OPS)*

**Phase 1 exit (M1 — Platform ready):**
- ✅ Two real users (BE+QA) can sign in with phone OTP, create a job, add fields manually, invite each other, open the invite preview, redeem, and see the job together on staging.
- ✅ Cross-job ID substitution tests fail correctly (404, no title leak).
- ✅ No enumeration on OTP endpoints.
- ✅ Synthetic invariant monitor runs and alerts on failure.
- ✅ Web marketing page + auth + jobs list + brief editor + invite flow render on mobile Chrome over 3G.
- ✅ Android builds to a device; auth screens navigate end-to-end.

---

## 4. Phase 2 — Core job loop on web (W6–W9)

Goal: versions, acknowledgements, changes, questions, closeout, activity — the full mutual-plan loop works on web, with immutable storage and the core invariant tests. This is where Android goes parallel.

### W6 — Versions + acknowledgements (BE + web)
- job_versions immutable table, monotonic numbering, content_digest hash chain, immutability trigger  *(BE)*
- Publish version endpoint (transactional, increments job_seq, outbox events)  *(BE)*
- Acknowledgements endpoint + withdrawal (new row, never erase)  *(BE)*
- Version list/detail endpoints  *(BE)*
- Web: Version list/detail, Acknowledge dialog naming the version, Ack checklist, Withdraw  *(WEB)*
- **Android starts in parallel:** Auth PKCE token storage, EncryptedSharedPreferences, Keystore, biometric lock scaffolding, NavGraph typed routes  *(AN)*
- Wave-1 research interviews (5 friendly providers) start this week — PD sits with each for 45 minutes with a clickable prototype  *(PD)*

### W7 — Changes, questions, diff
- change_requests/responses schema; create/respond endpoints; accept = new version via transaction; reject preserves prior  *(BE)*
- Diff algorithm (per-field, text-based, accessible labels, not color-only)  *(BE)*
- Questions endpoints (ask/respond/defer)  *(BE)*
- Web: Changes list/detail, Diff view, accept/reject/ask/need-time dialogs; Questions list/composer  *(WEB)*
- Copy rewrite v1 (V2-01): replace "acknowledge/brief/mutually agreed" with plain sentences + honorifics  *(PD/WEB)*
- Android: Jobs list/create/overview/brief editor against real API  *(AN)*

### W8 — Activity, closeout, Money fields (V2-04), segmented provider home (V2-07)
- Activity events model, cursor-paginated endpoint  *(BE)*
- Closeout endpoints: per-participant delivered/received/follow-up/not-completed; completion_review → completed transition  *(BE)*
- Money group (deposit paid/partial/no, balance, who-buys-materials); mismatched deposit → conflict (V2-04)  *(BE)*
- Home endpoint extended with "Waiting on me / Waiting on them / Due this week" segmentation  *(BE)*
- Web: History timeline (filters), Closeout screen, Home segmented list (V2-07), Money fields, conflict on mismatched deposit  *(WEB)*
- Android: Versions/ack screens, Change list/detail, Questions screens  *(AN)*
- Voice-mic primary button on Add Details (web where supported, Android always — V2-05)  *(WEB/AN)*

### W9 — Deposit-as-conflict, first end-to-end test pass
- Notifications skeleton: delivery model, template renderer, preferences (no real channels yet)  *(BE)*
- BE side of "Copy update to WhatsApp" (V2-06): per-action pre-composed message generation endpoint  *(BE)*
- Web: Copy-to-WhatsApp buttons wired, "work started without ack" flag and honest warning  *(WEB/PD)*
- Web: first two-user Playwright E2E: (a) mutual ack happy path, (b) rejected change preserves prior version  *(QA/WEB)*
- Android: History/closeout/people/files placeholders; voice recorder via MediaRecorder  *(AN)*
- First design/copy review with Wave-1 providers (paper prototype or staging walkthrough)  *(PD)*

**Phase 2 exit (M3 — Version loop):**
- ✅ Two-user E2E: Provider publishes v1, customer asks a question, provider answers, both acknowledge → mutually_acknowledged; customer proposes change, provider rejects → v1 is still current; accept → v2 is current with hash chain intact.
- ✅ Direct SQL attempts to update a version row fail (immutability trigger).
- ✅ Acknowledgement actor cannot be spoofed via request body (negative test).
- ✅ UI copy uses plain language ("I have seen and I agree") not "acknowledge".
- ✅ Deposit mismatch surfaces as a conflict before publishing.
- ✅ Invariant monitor has been running for ≥ 2 weeks without false positives/negatives.

---

## 5. Phase 3 — Web hardened + pilot readiness (W10–W16)

Goal: media/export/plan-card, notifications, privacy, admin console, sync/offline engine, accessibility, performance, security, v2 Gate-1 items, runbooks. Web must be pilot-ready by W16.

### W10 — Media, attachments, plan card
- Attachments schema, R2 integration, signed upload-intent, mime/byte verification, scan state (ClamAV worker)  *(BE)*
- EXIF strip, image renditions (thumb/preview/original), WebP conversion  *(BE)*
- Export endpoint: JSON sync, PNG card, PDF (async worker), fingerprint visible, no legal claims  *(BE/PD)*
- Web: Files screen (upload/camera/file picker), image rendering via signed URLs, plan card preview + download, square Status/Stories variant (V2-19)  *(WEB)*
- Android: CameraX capture, Photo Picker, Coil integration, attachment grid  *(AN)*
- In-app-browser detection + "open in Chrome" banner; read-only rendering without SW/IDb (V2-24)  *(WEB)*

### W11 — Notifications + sharing
- Email worker (Resend/SES) with unsub; SMS worker for invite + first mutual ack  *(BE)*
- Web Push (permission ask after first publish) with generic lock-screen text  *(BE/WEB)*
- Notification preferences UI, quiet hours (respecting Friday lunch/Sunday defaults — V2-25 flagged for v1.1)  *(WEB/BE)*
- In-app notification centre (web first)  *(WEB)*
- Web Share Target for receiving text/images from Android Chrome  *(WEB)*
- Android: FCM data-message integration, notification channels, deep links  *(AN)*

### W12 — Sync engine + offline (web)
- Delta endpoint and ETag support (`?since=seq`)  *(BE)*
- Conflict payloads + resolver logic  *(BE)*
- Web: IndexedDB schema, command queue, SyncStatusBar, drain executor, multi-tab locks, auth pause  *(WEB)*
- PWA: manifest, Serwist service worker, install prompt, ~offline shell; API never cached in SW  *(WEB)*
- Android: WorkManager outbox, SendCommandWorker, per-job mutex, queue UI chip  *(AN)*
- Chaos tests WIP: Playwright network emulation; simulate offline ack + superseded version  *(QA/WEB)*

### W13 — Privacy, admin console, copy
- Privacy request workflow (export/correct/delete) with grace period and participant-conflict anonymisation  *(BE)*
- Support reports + audit log + break-glass admin auth  *(BE)*
- Admin console (separate Next.js app): support cases list, privacy request processing, session revoke, flag edit, break-glass  *(WEB/BE)*
- Settings/privacy/delete screens (web): AI opt-out, export request, sessions list  *(WEB)*
- Anti-coercion safety path (hidden settings link, delayed withdrawal, local resources — V2-12)  *(BE/WEB/PD)*
- Anti-impersonation copy on invite preview ("NaWeAgree does not verify people…") V2-13  *(PD/WEB)*
- Pidgin v1 reviewed by ≥ 3 native speakers from different regions; honorific chips during invite (V2-17)  *(PD/WEB/AN)*

### W14 — Read-aloud, accessibility, performance
- TTS read-aloud on the plan summary; correct amount pronunciation ("eighty thousand naira") V2-08  *(WEB/AN)*
- Accessibility pass (keyboard, focus order, NVDA/TalkBack smoke, zoom 200%, high contrast, reduced motion)  *(WEB/AN/QA)*
- Performance pass: code splitting, image optimization, font subsetting, baseline profile for Android work begins  *(WEB/AN)*
- Auto-detect metered network; data-saver default on; text-only sync < 10 KB target V2-14  *(WEB/AN/BE)*

### W15 — Security, runbooks, drills
- Pen-test (limited scope) by security review; high/critical findings closed  *(OPS/BE/WEB/AN)*
- Backup/restore drill (RPO ≤ 5 min, RTO ≤ 4 h)  *(OPS/BE)*
- Two runbooks drilled live: (a) suspected data exposure, (b) wrong AI extraction (flag disabled, users notified)  *(OPS/BE)*
- Error budgets and burn-rate alerts configured for pilot  *(OPS)*
- Canary deploy pipeline (5% → 25% → 100%) with auto-rollback  *(OPS/WEB)*
- Chaos tests extended: power-cut (app killed mid-ack), duplicate idempotency, token refresh storm, FCM delivery failures  *(QA/BE/WEB/AN)*
- Multiple verified contact handles per account (V2-11) — optional secondary phone, email; channel-aware OTP  *(BE/WEB/AN)*

### W16 — Pilot readiness gate (Gate 1)
- Marketing page final; landing LCP < 2.0s; no fake testimonials  *(WEB/PD)*
- Invite landing page renders in WhatsApp in-app browser without JS; static screenshot download works without sign-up (V2-03)  *(WEB/BE)*
- Pilot consent flow, in-app report flow, support macros, WhatsApp Business support line live (V2-31)  *(PD/OPS)*
- Pilot data-safety / privacy notice / terms live; counsel sign-off for pilot  *(PD)*
- Kill switches / min-supported-version tested  *(BE/OPS)*
- Pilot participants Wave 1 (5 friendly providers) scheduled for onboarding visits  *(PD)*
- Dogfood: every team member completes 3 fictional jobs with a partner before pilot opens  *(all)*

**Phase 3 exit (Gate 1 — Private web pilot, W16):**
- [ ] All launch-checklist items from `05-engineering-backlog.md` §7 Gate 1 are ticked.
- [ ] 9 v2 Gate-1 blockers (V2-01…V2-07, V2-23, V2-24) are closed.
- [ ] No Blocker/High bugs open; crash-free sessions ≥ 99%; error rate < 0.5%.
- [ ] PWA is installable; offline queue survives reboot and "Don't keep activities".
- [ ] Plan card renders correctly in WhatsApp in-app browser on ≥ 3 reference devices.
- [ ] Invariant monitor has run continuously for 2 weeks without a false-positive or missed drift.
- [ ] Restore drill completed within RTO; two runbooks rehearsed.

---

## 6. Phase 4 — Private pilot (W17–W24)

Parallel: web pilot runs in waves; Android continues to closed testing.

### W17–W18 — Wave 1: Friendly 10
- 5 trusted providers onboarded in person; each uses the app for 1–2 real jobs with their own customers.
- Team member attends (or calls after) each early job. Daily triage of bugs; fixes deployed to canary within 24 h of blocker.
- Weekly structured interviews with both providers and (where possible) customers. Capture verbatim objections.
- Track the 5 pilot metrics from `01` §1.4 (invite open ≥ 60%, mutual ack ≥ 40%, changes ≥ 25%, create→share < 15 min, support < 0.3/job).
- Begin weekly bug-burn: every Friday, 50% of the week's capacity goes to pilot-issues, 50% to roadmap.

### W19–W21 — Wave 2: Cluster 30
- Recruit 3 clusters (tailor, carpenter, printer/event — choose based on Wave-1 signal).
- 2 captains per cluster, in-person onboarding visit by team, small airtime stipend (₦1,000 per completed job, capped).
- Roll out fixes from Wave 1 friction (expect heavy churn on invite preview, notification delivery, copy clarity, data usage).
- Android reaches M8 (platform polished: camera/voice/share/FCM/encryption/lock) by W20 and opens internal testing.
- First 5 paid features explored in interviews (ask, don't build): willingness-to-pay questions baked into weekly calls (V2-32).

### W22–W24 — Wave 3: Organic 50+, Android closed testing
- Soft-launch to captains' networks without active recruitment.
- Measure organic invite trees; identify power users for captain program.
- Android reaches closed testing on Play (M9) by W22; enroll 50 Android users (from Wave-2 providers) in closed track.
- Public-launch additions V2-08 through V2-22 land (photo closeout, "we don't agree" flow, OEM battery-killer screen, 12-word recovery, helper role, voice-first mode, block/report, etc.).
- Pen-test final report; load test to 2× projected peak; staging soak for 72 h.
- End-of-pilot decision review: **go / pivot / stop** against `01` §23.5 criteria.

**Pilot stop/pivot triggers (must be acted on, not ignored):**
- Invite open rate < 25% after 30 jobs → double down on the plan card and in-app invite preview; consider TWA/Android push for invites.
- Mutual ack < 20% → redesign the ack flow; maybe the wording is scary; test alternative copy.
- Fewer than 10% of jobs have a change → the change loop isn't needed yet; consider a record-only MVP.
- Providers say "this adds work" without corresponding benefit → simplify aggressively before any more features.

---

## 7. Phase 5 — Android to closed testing (overlapping W6–W22)

Android runs in parallel with web. The engineer is not on the critical path for web pilot, but Android must be at closed testing before public launch.

| Week | Android focus | Exit when |
|---|---|---|
| W6 | Scaffold, Gradle, Hilt, tokens, CI, benchmark module | Hello-World Compose app on device, screenshot tests in CI |
| W7 | Room DB + migrations, SQLCipher prod, Retrofit client, interceptors | DB roundtrip + API call against staging works |
| W8 | Navigation (typed routes + deep links), Splash/Sign in/OTP/SMS Retriever | OTP flow works end-to-end on 2 reference devices |
| W9 | Encrypted prefs, Keystore, BiometricPrompt/PIN lock, FLAG_SECURE | App lock works; PIN fallback; encrypted storage verified |
| W10 | Jobs list/create/overview against real API; bottom nav | Happy path browse/create job |
| W11 | Brief editor (grouped fields, autosave to Room, states, voice button) | Edit draft, survive process death |
| W12 | Versions/ack screens; change list/detail; TalkBack labels | Two-device ack/change path over real API |
| W13 | Questions, history, closeout, people, files placeholders | Parity with web P0 flows for reading/writing |
| W14 | WorkManager sync engine (SendCommand, PullJob, MediaUpload, TokenRefresh), per-job mutex, constraints | Pending ack survives reboot + flaky network |
| W15 | CameraX capture, MediaRecorder voice, Photo Picker, Coil, foreground upload service | Capture photo + voice, queue uploads, playback |
| W16 | FCM data-only messages, notification channels, deep links, quiet hours | Push arrives on Pixel/Samsung/Tecno test devices; tap opens correct screen; no content in payload |
| W17 | Share-inbox (ACTION_SEND + SEND_MULTIPLE); TTS read-aloud | Sharing text/images from WhatsApp creates a draft; TTS plays summary |
| W18 | Settings/privacy/delete/AI opt-out; data-saver auto-enable; multi-contact handles | All settings match web parity |
| W19 | Baseline profiles, R8, ABI splits, size budgets (<6 MB); AAB signing; internal track | Cold start < 2.5s on 2 GB reference device; AAB ≤ 6 MB |
| W20 | Accessibility (Accessibility Scanner zero serious; TalkBack P0 flows; large-font "make it bigger") | Scanner green; 200% zoom works |
| W21 | Play listing: data-safety, content rating, screenshots, privacy policy; internal testing to 50 users | Internal track live; pre-launch report clean |
| W22 | Closed testing rollout (10%) | Crash-free ≥ 99.5% after 14 days; no blocking bugs |

---

## 8. Phase 6 — Public launch (W25–W28)

Only entered after pilot decision = "go".

### W25 — Launch readiness
- Final load test at 3× projected peak (modest; pilot is small).
- Staging soak 72 h; error budgets healthy.
- Runbook drill: DB failover.
- Play Store closed → open (staged rollout 5/20/50/100).
- Web production canary 5% for 48 h; monitor; ramp.
- Marketing page localized in en-NG + Pidgin; Plan card share with Status/Stories size.
- Support WhatsApp line staffed; macros finalized; on-call rota published for first 2 weeks.

### W26–W27 — Launch week
- Soft launch Monday to existing pilot users' networks.
- Daily standup at 9am WAT for first 14 days; on-call 24/7 rotation.
- Monitor crash rates, error budgets, sync conflict rate, invite conversion hourly for 72 h.
- Hold non-bugfix work for the first 7 days.
- Publish first changelog; respond to Play reviews within 24 h.

### W28 — Launch review
- Two-week retro: what worked, what didn't, top 5 support issues, top 5 drop-off points.
- Re-evaluate roadmap against real data.
- Begin public content: user stories (with explicit consent), captain spotlights, social content.

---

## 9. Phase 7 — Post-launch (W29+)

Priority order after launch:

1. **Reliability debt** — anything the launch exposed (OOMs on specific devices, OEM FCM failures, slow queries).
2. **Top 3 friction points** from support tickets and funnel drop-offs.
3. **Provider-paid tier** — only after ≥ 30 providers have done ≥ 3 jobs and pricing interviews suggest a price they will pay. Start with pay-per-job (₦100/job) before subscription.
4. **v1.1 features** from `05` §9.3 (WIP photos, repeat-customer one-tap, QR invite, calendar week view, business identity).
5. **AI enablement** — flip on only after evaluation corpus ≥ 500 samples meets thresholds (false-certainty <1%, zero fabricated amounts). Do not rush this; AI is a force multiplier only after the manual loop is loved.
6. **v2 horizons** (community templates, multi-party beyond helper, mediation-referral partners, portable job passport) — revisit after 3 months and 1,000+ jobs.

---

## 10. Week-at-a-glance calendar

```
W0   Oct 26–Nov 1   Pre-start (tooling, accounts, recruiting)
W1   Nov 2–8        Phase 0 — Decision sprint
W2   Nov 9–15       P1: infra, DB, CI, observability
W3   Nov 16–22      P1: OTP/auth/cookies/PKCE, rate limits
W4   Nov 23–29      P1: jobs CRUD, manual brief, invites
W5   Nov 30–Dec 6   P1: invite preview, brief editor, Android scaffold
W6   Dec 7–13       P2: versions + acks; Android auth starts; W1 interviews
W7   Dec 14–20      P2: changes, questions, diff, copy rewrite v1
W8   Dec 21–Jan 3*  P2: activity, closeout, money fields, segmented home
                        (*winter break — assume 50% capacity this week)
W9   Jan 4–10       P2: notifications skeleton, copy-to-WhatsApp, 2-user E2E
W10  Jan 11–17      P3: media/R2/plan card, in-app-browser fallback
W11  Jan 18–24      P3: email/SMS/web push, preferences, share target
W12  Jan 25–31      P3: web sync engine + PWA + offline
W13  Feb 1–7        P3: privacy, admin console, safety path, pidgin v1
W14  Feb 8–14       P3: TTS, a11y, performance, data-saver
W15  Feb 15–21      P3: security, runbooks, drills, chaos tests, multi-contact
W16  Feb 22–28      Gate 1 — Pilot readiness review → GO for private pilot
W17–18 Mar 1–14     Pilot Wave 1: Friendly 10 (+ ongoing fixes)
W19–21 Mar 15–Apr 4 Pilot Wave 2: Cluster 30; Android internal testing
W22–24 Apr 5–25     Pilot Wave 3: Organic 50+; Android closed; V2 public-launch items
W25  Apr 26–May 2   Gate 2 — Go-public review; canary + Play staged rollout
W26–27 May 3–16     Public launch + 24/7 on-call
W28  May 17–23      Launch retro; roadmap reset
W29+ May 26+        Post-launch iteration, provider paid tier exploration
```

Calendar assumes a kickoff the first week of November; shift if you start on a different date. A winter-break slowdown in late December is real — plan for 50% capacity that week and don't schedule critical milestones there.

---

## 11. Decision and review gates

Every gate has an owner, a checklist, and a go/no-go decision made in a meeting, not over Slack.

| Gate | Date | Owner | Blocks |
|---|---|---|---|
| DG-0 Decisions | End of W1 | TL | All code past hello-world |
| DG-1 Platform ready | End of W5 | TL | Invites/jobs/brief E2E |
| DG-2 Version loop | End of W9 | TL | E2E mutual-ack and reject-change invariants |
| DG-3 Pilot ready (Gate 1) | End of W16 | TL + PD | Real users touch production |
| DG-4 Pilot Wave-1 review | End of W18 | PD | Scaling to Wave 2 |
| DG-5 Pilot Wave-2 review | End of W21 | PD | Scaling to organic |
| DG-6 Go-public (Gate 2) | End of W24 | Entire team | Public launch |
| DG-7 Launch retro | End of W28 | PD | Post-launch roadmap |

If any gate is NO-GO, stop the downstream work and fix the gate. Do not "push through and fix later" on gates 1–3; those guard the invariants that prevent the app from lying to users.

---

## 12. Team routines

- **Daily standup (15 min):** what I did, what I'm doing, blockers. Async in Slack acceptable but must contain same three points.
- **Monday planning (60 min):** pull this week's stories, confirm owners, update estimates.
- **Thursday demo (45 min):** every track shows what shipped this week to staging. Everyone attends. Invite pilot captains from W19 onward.
- **Friday retro (30 min):** what went well, what didn't, one concrete change to process next week.
- **Bug triage (daily 15 min during pilot):** new bugs categorized (S1–S4), routed, S1 gets owner immediately.
- **Security review (every 4 weeks):** OPS/BE walk through new endpoints, permissions, vendor changes.
- **Copy review (every 2 weeks):** PD reviews all new user-facing strings for clarity, tone, pidgin quality.

---

## 13. If things slip: what to cut first

If capacity is less than the 6.7 FTE assumption or a gate is late, cut in this order — never cut invariants, sync safety, or auth:

**Cut before launch (ordered, least painful first):**
1. Dark mode (tokens exist; full dark UI can wait).
2. PDF export (ship PNG plan card first; PDF v1.1).
3. Web voice input (Android voice can ship; web `getUserMedia` can be flag-gated).
4. In-app notification centre (push + email + in-job alerts are enough).
5. Multiple contact handles at launch (single phone at launch, add later; users can still change number).
6. Helper/apprentice role (v1.1; the provider can share login on their own device as a temporary workaround).
7. QR invite (v1.1).
8. Anti-coercion safety path (consult with local women's-safety org before cutting; if you cut it, ship a simpler "lock the app" setting + local resources page).
9. Recovery phrase (email recovery can serve at launch).
10. TTS read-aloud (v1.1; must ship within 6 weeks of launch because of low-literacy users).

**Cut features over cutting reliability:** every hour spent on a v1.1 feature before invariants and sync are solid is an hour that will be spent debugging in production with real users who will then leave and never return.

**Do NOT cut, even if late:**
- Immutable versions + immutability trigger.
- Ack actor = session (never request body).
- No silent consent (silence/timer/read-receipt never = agree).
- Rejected change preserving prior version.
- Hash-chained versions + visible fingerprint.
- Redacted invite preview with OTP verification before content.
- Server-rendered invite page + plan card.
- The 9 v2 Gate-1 items (V2-01…V2-07, V2-23, V2-24). These were added because they are table-stakes for the product to feel right for its intended users.
- Pilot recruitment waves (skipping pilot is launching blind).

---

## 14. Day-one checklist (kickoff day)

Things to do on the first working day of W0, in order:

1. [ ] Confirm the team roster and who is on which track; announce in #general.
2. [ ] Confirm kickoff date and the calendar above; send invites.
3. [ ] Create shared vault (1Password or similar) and collect credentials for domain, GitHub admin, Cloudflare, Neon, R2, Sentry, Firebase, Play Console, SMS, email, analytics.
4. [ ] Book the weekly recurring meetings (planning, demo, retro, daily standup).
5. [ ] Open the PR with docs/01–07 and walk the team through the product principles, the 12 invariants, and the 10-point robustness playbook in a 60-min session.
6. [ ] Open 5 starter GitHub issues for W1 (ADR log, OpenAPI v0, monorepo skeleton, tokens, fixtures) and assign owners.
7. [ ] Send calendar invites to the first 5 Wave-1 pilot candidates for interviews in W3.
8. [ ] Order reference devices (Tecno Spark Go / itel / Redmi A-series) to arrive by W5.
9. [ ] Send intro email to local counsel to start NDPA/privacy/terms review; schedule first call.
10. [ ] Post a short team-wide note: *"We're building shared memory for everyday custom work. Our north star is jobs reaching mutual acknowledgement. Our north-star anti-metric is a single user ever seeing 'we agreed' when the server didn't say so. Ship carefully."*

That's the kickoff. After that, follow the calendar.
