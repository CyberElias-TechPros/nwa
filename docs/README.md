# NaWeAgree — Application Delivery Plan Set

**Status:** Planning baseline for implementation. Not validated by user research, legal review, security audit, or a production pilot.
**Date:** 21 October 2026
**Source of truth for product intent:** [`../README.md`](../README.md) (the consolidated NaWeAgree planning bundle).
**Scope of this plan set:** how to design, build, test, ship, operate, and improve NaWeAgree as (a) a web application and (b) an Android application, on one shared backend and one shared domain model.

---

## 1. What this plan set is

The existing README is a strong *product* plan: thesis, discovery, PRD, rulebook, UX, security, QA, research, GTM, and a frontend prototype blueprint. It is not an *engineering delivery* plan:

- It defines a PWA but never defines an Android client.
- It names candidate technologies but has no repository layout, API schema, migration plan, or CI/CD design.
- It has acceptance criteria but no estimates, sequencing, staffing, SLOs, or launch gates tied to dates.
- It leaves 8 critical technical decisions open (auth, guest access, DB boundary, AI vendor, voice retention, notification channels, offline scope, retention).
- It assumes a prototype, not an operated product with on-call, backups, disaster recovery, and a support console.

This plan set closes those gaps. It is deliberately opinionated: every open question gets a **recommended default** so implementation can start, with the evidence needed to overturn it recorded next to the decision.

## 2. Document map

| Document | Purpose | Primary audience |
|---|---|---|
| [`01-master-app-plan.md`](./01-master-app-plan.md) | Product boundary, platform strategy, architecture, domain/data model, API and sync contract, auth, AI, security, operations, cost, team, timeline, risks, gates | Everyone; engineering leadership |
| [`02-web-app-plan.md`](./02-web-app-plan.md) | Web/PWA implementation plan: stack, routes, state, offline, share target, accessibility, performance, security, testing, deploy, sprints | Web engineers, design, QA |
| [`03-android-app-plan.md`](./03-android-app-plan.md) | Native Android plan: why native, modules, Room/WorkManager offline engine, FCM, camera/voice, security, performance, Play release, sprints | Android engineers, QA, release |
| [`04-gap-analysis-and-improvements.md`](./04-gap-analysis-and-improvements.md) | 45 gaps in the current plan, severity, fix, acceptance; robustness playbook; 20 product improvements ranked by impact | Product, engineering, founders |
| [`05-engineering-backlog.md`](./05-engineering-backlog.md) | Epics, stories, acceptance criteria, estimates, dependencies, milestones, staffing, cost model, launch checklist, traceability | Delivery leads, PM |
| [`06-excellence-audit.md`](./06-excellence-audit.md) | Cross-functional deep audit (psychology, cultural realism, provider economics, growth, fraud, accessibility, local tech reality); 37 prioritized v2 improvements; revised pilot recruitment; additional product principles | Product, engineering, founders, research |
| [`07-implementation-roadmap.md`](./07-implementation-roadmap.md) | Week-by-week execution plan W0→W28+: phases, deliverables, owners, exit criteria, Android parallel track, pilot waves, launch sequence, go/no-go gates, what to cut if you slip | Engineering leads, PM, founders |
| [`08-ultra-granular-todo.md`](./08-ultra-granular-todo.md) | Checkable, track-by-track task list for every week (W0–W28+), with status, owners, purpose, connects-to, done-when criteria, standing release checklists, on-call cheat sheet, severity definitions, and definition-of-done | Every engineer, TL, QA — daily driver |

Read in this order: `README` → `01` → (`02` and `03` in parallel) → `04` → `05` → `06` → `07` → `08`.

Use `08-ultra-granular-todo.md` as the daily source of truth. Every PR references a T-ID; every new task discovered during the build is appended to it (not tracked in Slack).

## 3. Non-negotiable product constraints (carried from the README)

These constrain every technical choice below. Any deviation requires an ADR plus privacy, security, and legal review.

1. AI never publishes, confirms, or materially changes a shared version without a human action.
2. An acknowledgement is bound to one immutable version and one authenticated participant.
3. Silence, timers, delivery receipts, and failure to object are never consent.
4. A rejected or pending change never erases the last mutually acknowledged version.
5. A participant's identity is never taken from a request body.
6. Private drafts are never leaked to the other participant, AI context, notifications, exports, or analytics.
7. Original wording is preserved when normalisation could change meaning.
8. The product never infers price, date, quantity, measurement, quality, identity, consent, liability, or dispute outcome as fact.
9. Manual, non-AI, and non-app paths always remain available.
10. Nothing is described as a legally enforceable contract without jurisdiction-specific legal review.
11. Support and admins cannot edit acknowledgements or rewrite history.
12. No public ranking, scoring, verification, or labelling of participants in MVP.

## 4. Platform decisions at a glance

| ID | Decision | Recommendation | Rationale | Revisit trigger |
|---|---|---|---|---|
| D-01 | Web client | **Next.js (App Router) + TypeScript PWA**, mobile-first, installable | One codebase, instant distribution, SEO for landing, share-target integration on Android | Never for MVP |
| D-02 | Android client | **Kotlin + Jetpack Compose native**, offline-first; **TWA wrapper only as a 2-week interim** if Play Store presence is needed before native ships | Reliable background sync, low-end performance, camera/voice/share intents, encrypted local DB, Play-quality notifications | Native cost exceeds 1.5× estimate and usage is web-dominant |
| D-03 | Shared logic | **Server-authoritative domain**; clients are renderers. Shared OpenAPI client, shared design tokens, shared i18n copy, shared conformance fixtures (not shared business rules) | Prevents web/Android drift on invariants such as acknowledgement binding | Never |
| D-04 | Backend | **Modular monolith**: Hono (TypeScript) on Cloudflare Workers + **PostgreSQL** (Neon) + R2 object storage + Queues | Transactional integrity for version+ack writes; low ops; portable SQL; Workers for cheap edge auth/rate limiting | Sustained > 50 rps or queue backlog SLO breach |
| D-05 | Web↔API auth | **BFF**: httpOnly, SameSite=Lax session cookie on the web origin; Next.js route handlers proxy to API. No access tokens in browser JS | XSS-resistant, no CORS/CSRF sprawl, offline data cache contains no credentials | Never for web |
| D-06 | Android↔API auth | **OAuth 2.1 Authorization Code + PKCE**, short-lived access token (15 min), rotating refresh token (60 days), device-bound, stored in Keystore-backed storage | Standard, testable, revocable per device | Never |
| D-07 | Primary identity | **Phone-first OTP** (SMS with WhatsApp fallback) + email magic link; **passkeys** as opt-in upgrade after first successful job | Phone is the real identity in Nigerian custom-work commerce; email alone excludes users | OTP delivery cost or fraud exceeds threshold |
| D-08 | Invitation model | **Tokenised invite + verified lightweight account**. Guest can view a *redacted preview* before verification; must verify control of a phone/email before viewing full shared content or acknowledging | Balances friction with the invariant that acknowledgement is authenticated | Pilot shows > 40% invite drop-off at verification |
| D-09 | Offline scope | **Local-first drafts and read cache; server-confirmed shared state.** Outbox for acknowledgements and change responses; never optimistically show "confirmed" | Keeps invariants intact while supporting intermittent networks | Full offline collaboration becomes a validated need |
| D-10 | AI | **Optional, review-first, provider-agnostic adapter**; ship MVP with manual entry + deterministic demo fixtures; enable extraction behind a flag after evaluation thresholds are met | AI is not required to prove the core loop | Evaluation gates pass and vendor DPA signed |
| D-11 | Notifications | In-app + **FCM/Web Push** + email; **SMS fallback** for invite and acknowledgement events only; WhatsApp Business templates only with explicit opt-in | Reliability without per-message cost explosion or privacy leaks | Channel data from pilot |
| D-12 | Versioning | Immutable `job_versions` with canonical-JSON SHA-256 digest and hash-chain pointer; template `schema_version` stored per version | Tamper-evident history without legal claims | Never |
| D-13 | Data boundary | **Dedicated database and object-storage bucket**, separate from any other product (e.g. CEA Academy). No shared tables, auth, or analytics property | README explicitly forbids mixing data | Never |
| D-14 | Hosting regions | API/DB primary in **EU (or nearest compliant region)**, R2 with explicit jurisdiction; document transfer basis | Latency to Nigeria is acceptable; vendor compliance is easier to evidence | NDPC guidance or latency data says otherwise |
| D-15 | Languages at launch | English (en-NG) first; **Nigerian Pidgin** second; Yoruba, Hausa, Igbo after translation QA | Code-switching is core to the problem; launch scope must stay testable | Translation QA capacity |

## 5. Recommended delivery shape

```text
Phase 0  Decisions + contracts + threat model                2 weeks
Phase 1  Web foundation, auth, jobs, participants            4 weeks
Phase 2  Immutable versions, acknowledgement, state machine  3 weeks
Phase 3  Change requests, diffs, closeout, notifications     2 weeks
Phase 4  Media, export/share card, privacy lifecycle         3 weeks
Phase 5  Pilot hardening, accessibility, load, security      3 weeks
Phase 6  Android native client (starts W6, overlaps)         10 weeks
Phase 7  Pilot (2 categories, 30–50 jobs), then public launch 6–8 weeks
```

Total to a hardened web pilot: **~17 weeks** with the assumed team. Android native to Play closed testing: **~12 weeks from its start**, ~week 18 overall. Full details and confidence ranges in `05-engineering-backlog.md`.

## 6. Top gaps found in the current README (full list in `04`)

| # | Gap | Why it blocks delivery | Fix in this plan set |
|---|---|---|---|
| G-01 | No Android strategy at all | Half the target users are Android-first; PWA install and background sync are unreliable on low-end devices | Native Compose plan, phased after web; TWA bridge if needed |
| G-02 | Offline conflict semantics are one paragraph | The hardest engineering risk in the product is silently showing stale or falsely confirmed state | Explicit command/outbox protocol with `job_seq`, idempotency, and re-review rules (§9 of `01`) |
| G-03 | Auth left open, yet invitation UX depends on it | Cannot design invite, guest, recovery, or device security without it | Phone OTP + magic link + passkey upgrade; guest verification model (D-07/D-08) |
| G-04 | No template/schema versioning for historical versions | A template edit would make old "confirmed" versions render incorrectly or not at all | Version stores `schema_version` + immutable field snapshot; renderer is schema-aware |
| G-05 | No OpenAPI contract, error envelope, or pagination details | Web and Android will diverge; contract tests impossible | Full contract conventions and endpoint catalogue (§8 of `01`) |
| G-06 | No support/admin console design | Privacy requests, abuse, and incident response are promised but unbuildable | Read-only, audited admin console with break-glass access (§19 of `01`) |
| G-07 | No SLOs, RTO/RPO, or on-call model | "Reliability" is asserted, not operable | SLO table, error budgets, backup/restore targets, runbooks (§15) |
| G-08 | No cost model, staffing, or estimates | Cannot decide whether to build or how long | Cost formula, team plan, epic estimates (`05`) |
| G-09 | Retention/deletion matrix has no implementation path | Deletion promises will be false in practice | Deletion orchestration, tombstones, backup expiry policy, participant-conflict rules (§14) |
| G-10 | No way to share a plan to someone who will not install anything | Adoption dies at the second participant | Signed read-only plan card (image/PDF) + WhatsApp share target (§17 of `01`, §9 of `02`) |

## 7. How to use this plan

1. **Run Phase 0 as a decision sprint.** Resolve D-01…D-15 in an ADR log. Do not start schema work before G-03, G-04, and G-05 are closed.
2. **Freeze the API contract and sync protocol first.** Both clients generate from the same OpenAPI and validate against the same fixture pack.
3. **Build the invariant tests before the UI.** Version immutability, acknowledgement binding, authorization, and idempotency are cheaper to get right at the start.
4. **Ship a manual-entry web pilot before enabling AI.** This isolates product signal from model quality.
5. **Treat Android as a first-class client with its own release cadence**, not a wrapper afterthought.
6. **Update this plan set when a decision changes.** Each doc has a decision log; the README stays the product source of truth.

## 8. Conventions used in these docs

- **MUST / SHOULD / MAY** follow RFC 2119 intent.
- **ID prefixes:** `D-` decision, `G-` gap, `E-` epic, `S-` story, `T-` task, `ADR-` architecture decision, `SLO-` service objective, `R-` risk.
- **Estimates** are person-days (pd) for a mid-level engineer familiar with the stack, excluding review latency. They are ranges, not commitments.
- **Status labels:** `DECIDED` (start now), `PROVISIONAL` (start, but evidence may change it), `OPEN` (do not build the dependent piece yet).
- All user-facing strings are examples, not approved copy. Legal and localization review required.

## 9. What is explicitly out of scope for this plan set

- Payments, escrow, marketplace discovery, public ratings, dispute adjudication, contract generation, and identity verification.
- Claims of legal enforceability.
- Production use of real participant data before the Phase 0 privacy/security review.
- Final brand, pricing, or market sizing. Those remain in the README's research plan.
