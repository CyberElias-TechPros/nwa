# 04 — Gap Analysis & Robustness Improvements

**Purpose:** identify what the existing README plan misses, why it matters, what this plan set does to close each gap, and a prioritised set of product improvements that make NaWeAgree more robust, trustworthy, and productive.
**Method:** read the README end-to-end (10 parts, 4,716 lines) and asked of each section: *what would a team actually need to build, ship, and operate this, that is not specified, is under-specified, or assumes a benign world?*
**Date:** 21 October 2026.

---

## Contents

1. [How to read this document](#1-how-to-read-this-document)
2. [Gap catalogue (45 gaps)](#2-gap-catalogue-45-gaps)
   - [A. Product and UX gaps](#a-product-and-ux-gaps)
   - [B. Android/mobile gaps](#b-androidmobile-gaps)
   - [C. Backend and data gaps](#c-backend-and-data-gaps)
   - [D. Sync/offline/state gaps](#d-syncofflinestate-gaps)
   - [E. Security, privacy, trust gaps](#e-security-privacy-trust-gaps)
   - [F. Operations, reliability, and delivery gaps](#f-operations-reliability-and-delivery-gaps)
   - [G. Testing, QA, process gaps](#g-testing-qa-process-gaps)
3. [Robustness playbook](#3-robustness-playbook)
4. [Top 20 product improvements ranked](#4-top-20-product-improvements-ranked)
5. [Decisions this plan makes that the README leaves open](#5-decisions-this-plan-makes-that-the-readme-leaves-open)

---

## 1. How to read this document

Each gap entry is:

- **ID** (G-01, G-02…): cross-referenced from other docs.
- **Severity:** Blocker / High / Medium / Low. A Blocker gap prevents launch; High will cause user harm or product failure; Medium degrades quality; Low is polish.
- **Status in README:** Missing / Under-specified / Assumed / Contradictory.
- **What's missing:** concrete engineering/product problem.
- **Fix:** where in `01`, `02`, or `03` the gap is closed.
- **Acceptance:** how we know the fix is real.

---

## 2. Gap catalogue (45 gaps)

### A. Product and UX gaps

| ID | Severity | Status | What's missing | Fix | Acceptance |
|---|---|---|---|---|---|
| G-A1 | Blocker | Missing | **No Android client at all.** The plan assumes a PWA only, but the target user base in Nigeria is Android-first; PWA background sync and push are unreliable on low-end devices and OEM browsers. | `03` entire document; native Kotlin+Compose app sequenced after web; optional TWA bridge | Native Android app in closed testing at W18 with sync/push/camera/voice |
| G-A2 | High | Under-specified | **Second-participant friction is the #1 adoption killer.** The README names invites but doesn't design the counterparty experience for someone who may not want the app. | `01` §10.2 (guest verification + redacted preview), `01` §17 plan-card, `02` §9 share target, `03` §16 share intent | ≥ 70% of opened invites reach review screen in pilot |
| G-A3 | High | Missing | **Shareable read-only plan card.** If the counterparty will not install, there must be a trusted artifact they can keep and view outside the app (e.g. a signed image/PDF that can be sent in WhatsApp). Today the plan only lives inside a login. | `01` §17 plan card (image/PDF, short fingerprint, not legal), `02` §9 / `03` §12.6 export | Plan card generation works offline-fallback; every acknowledged version can produce a card |
| G-A4 | High | Under-specified | **What to do when someone just won't acknowledge.** Field reality: many jobs start with verbal agreement. | `01` §5.2 `work_started_without_ack` flag with explicit non-consent warning; UI does not treat this as mutual ack; prompt for acknowledgement without nagging | UI labels state honestly; no false agreement state ever appears |
| G-A5 | High | Missing | **Multi-party work is common but deferred.** Even a 2-person job often has a helper (apprentice, family member). MVP needs at least an observer/helper role to avoid users sharing accounts. | `01` §5.3 helper role (read + respond-only, no ack); scoped in permission matrix | Helper can be invited, sees shared content, can ask questions, cannot acknowledge or materially change |
| G-A6 | Medium | Under-specified | **"Why am I seeing this?" transparency.** Users need a plain-language explanation of every state transition, what each party did, and what their next action is. | `02` §6.3 status copy, `03` §12 status semantics, per-event human sentences | Every timeline event has a one-sentence explanation + who/when |
| G-A7 | Medium | Under-specified | **Nigerian Pidgin is required, not optional.** Code-switching is how many users talk. Only English is specified. | `01` D-15, `02` §16, `03` §19; `en-NG` + `pcm` at launch | Pidgin copy reviewed by native speakers and used on every P0 screen |
| G-A8 | Medium | Missing | **Read-aloud / voice summary.** Low-literacy and hands-busy users need to hear the plan, not just read it. | Web Speech in `02` §13, TTS in `03` §18.3; "Read it back" summary mode on overview | Every shared version can be played with stop/pause and highlighted text |
| G-A9 | Medium | Missing | **Low-data / data-saver mode.** Users on expensive data will not upload photos or run AI without an explicit mode. | `01` §18.3, `02` §14 (lazy images, data-saver flag), `03` §20 worker constraints; default to text-only on 2G detection | Data-saver reduces per-job traffic > 70% |
| G-A10 | Low | Under-specified | **After-job value.** The README stops at completion; users need a way to find the plan later ("what did we agree about my dress?"). | Search (title + field text, client-side first), archive categories, job tags, and `job_passport` export (P2) | User can find any past completed job by searching text |

### B. Android/mobile gaps

| ID | Severity | Status | What's missing | Fix | Acceptance |
|---|---|---|---|---|---|
| G-B1 | Blocker | Missing | Entire native client. (See G-A1.) | `03` | Closed testing by W18 |
| G-B2 | High | Missing | **Push reliability story.** Web Push is unreliable on many OEMs (Xiaomi, Tecno, Infinix, Gionee, Huawei). | FCM data messages with local rendering (`03` §17); SMS fallback for 2 critical events (`01` §13); battery-opt-in guidance; OEM "auto-start" helper | p95 push delivery within 60 s on device-lab Tier-1 phones |
| G-B3 | High | Missing | **Receiving content from WhatsApp.** The only way data enters the app at first is by pasting; native `ACTION_SEND` and Web Share Target are required. | `02` §9, `03` §16; intake persists and survives process death | Sharing text/image from WhatsApp creates a draft in ≤ 2 taps |
| G-B4 | High | Missing | **Voice note reliability and consent.** Web `getUserMedia` is inconsistent for voice on cheap Android; native `MediaRecorder` + consent + retention is needed. | `03` §15.2; default 7-day audio deletion; retention opt-in | Voice notes capture, play back, transcribe (if enabled) and are deleted by default |
| G-B5 | High | Missing | **Reliable background work through reboots/Doze.** | WorkManager offline engine (`03` §9) with constraints, retries, and foreground uploads | Pending acknowledgement survives reboot and flaky networks |
| G-B6 | Medium | Missing | **Encrypted local storage** for job content; the README mentions "encrypt where platform allows" without specifying. | SQLCipher + EncryptedSharedPreferences + Keystore app lock (`03` §21.2); `FLAG_SECURE` for sensitive screens; `allowBackup=false` | Pen test verifies at-rest data is not extractable from debug/rooted devices |
| G-B7 | Medium | Missing | **Minimal APK budget.** Low-end users abandon large installs. | R8, ABI splits, WebP assets, no WebView except policies, size gate in CI (`03` §20/24) | AAB download ≤ 8 MB, APK ≤ 12 MB |
| G-B8 | Medium | Under-specified | **Shared-device / cybercafé flows.** README mentions them but no UX is designed. | Web quick sign-out / shared-device mode (`02` §12.3); Android app lock (`03` §14.4); explicit cache clearing; session list | User on a shared device can sign out without leaving recoverable data |
| G-B9 | Medium | Missing | **In-app-browser handling.** Links opened inside WhatsApp/Facebook often have restricted cookie/storage. | Feature detection + lite mode + "open in Chrome" guidance (`02` §2/§8) | Invite links do not blank-screen in Facebook/WhatsApp in-app browsers |

### C. Backend and data gaps

| ID | Severity | Status | What's missing | Fix | Acceptance |
|---|---|---|---|---|---|
| G-C1 | Blocker | Open | **Auth method is undecided.** Cannot implement invites, sessions, recovery, or Android security without this. | Phone OTP primary + email + passkey upgrade (`01` D-07, §10) | Sign-in works; no enumeration; revocation tested |
| G-C2 | Blocker | Missing | **Concrete API contract.** The README gives an illustrative outline but no OpenAPI, error envelope, idempotency, pagination, rate-limit, or CORS design. | `01` §8 full catalogue + envelope + OpenAPI generation; generated TS + Kotlin clients | CI drift check; endpoints used by both clients are spec-generated |
| G-C3 | Blocker | Missing | **Template/schema versioning.** If a template changes, old "confirmed" versions must still render correctly. | `01` §7.2: versions store `schema_version`, `template_version`, and a snapshot of labels/field metadata; N-1 readers for 12 months | Old versions render as they were acknowledged; no "missing field" errors |
| G-C4 | High | Missing | **Transaction model for publish/ack.** Without a transactional outbox you risk double-sends and state drift. | `01` §3.3 ADR-103: transactional outbox + idempotent handlers (`01` §8.4, §8.7) | Load + chaos tests show zero duplicate acks or missed notifications |
| G-C5 | High | Under-specified | **Data integrity constraints** (immutable versions, unique acks, job-scoped FKs). README names entities but not constraints. | `01` §6.2 constraints + immutability trigger + composite FKs; tests in CI | Direct SQL update/delete on versions fails; cross-job ID substitution tests pass |
| G-C6 | High | Under-specified | **Deletion when one party deletes their account.** The README lists deletion but not the participant-conflict resolution. | `01` §6.3 / §14.4: tombstone + anonymise, keep the other party's record, UI explains this before confirmation | Deleting your account doesn't erase the other person's acknowledged history |
| G-C7 | High | Missing | **Idempotency and replay protection** — the README mentions idempotency keys but not enforcement or client behaviour. | Idempotency store 24 h (`01` §8.4); client-generated keys (`02` §10, `03` §8.4); duplicate `commandId` returns original result | Duplicate retries do not create extra versions/acks |
| G-C8 | Medium | Under-specified | **Rate limits are listed conceptually but not implemented.** | `01` §8.6 numeric table; Redis/KV token bucket; 429 with Retry-After | OTP, invite, upload, and AI calls cannot be brute-forced |
| G-C9 | Medium | Missing | **Choice of database.** README suggests D1/CF Workers but the invariants require complex transactions. | PostgreSQL (Neon) decision (`01` D-16, ADR-110) with justification | All critical write paths run inside single transactions |
| G-C10 | Medium | Missing | **Money/date/unit normalisation rules.** README says preserve originals but doesn't specify when a normalised value is allowed. | `01` §5.4: raw always preserved; parsed amount/date only after human confirmation; unit conversions explicit and reversible | No auto-parsed "₦80k" without explicit user accept |
| G-C11 | Medium | Under-specified | **Administrator access model.** README says "admins cannot edit acknowledgements" but doesn't define what they can do. | Break-glass audited access + support role without content access by default (`01` §19) | No endpoint can edit/ack; admin access requires reason + TTL + audit |
| G-C12 | Low | Missing | **File scanning implementation.** README says scan but not how. | Worker with ClamAV (or vendor) before sharing; state exposed to UI; blocked files quarantined (`01` §12) | Malware test file (EICAR) is blocked; pending state shown |

### D. Sync/offline/state gaps

| ID | Severity | Status | What's missing | Fix | Acceptance |
|---|---|---|---|---|---|
| G-D1 | Blocker | One paragraph | **Offline and conflict semantics are the hardest engineering risk** and are barely specified. The product can lie to users ("both agreed!") if this is wrong. | `01` §9 sync protocol (command outbox, job_seq, per-job ordering, rules for ack.version.superseded, no silent wins); web and Android engines (`02` §8, `03` §9) | Chaos test suite: offline ack + version supersede never produces false "mutually acknowledged" |
| G-D2 | High | Missing | **Stale-write protection** — two users editing the same brief can overwrite each other. | Optimistic concurrency via `If-Match: jobSeq` and `baseVersionId` (`01` §8.4, §9.3); 409 returns fresh aggregate | Two users writing concurrently see conflict resolution, not silent overwrite |
| G-D3 | High | Missing | **Acknowledgement against a superseded version** must never succeed and must not silently "roll forward". | `409 VERSION_SUPERSEDED` with current version link; command dropped, user re-prompted (`01` §9.2, `02` §8.5, `03` §9.2) | Automated cross-client test; UI shows clear "plan changed" prompt |
| G-D4 | Medium | Missing | **Sync status UX.** Users need to know whether what they see is current, cached, or queued. | Persistent SyncStatusBar (`02` §8.6), Android "Sending" chip (`03` §9.3) with per-command states | Every non-synced action is visible to the user |
| G-D5 | Medium | Missing | **Queue lifecycle** — persistence, retry, expiry, sign-out warnings, max size. | 7-day expiry, 100-command cap, sign-out warning, durable stores on both clients (`02` §8, `03` §9) | Queue survives app kill/reboot; large queues cannot grow unbounded |
| G-D6 | Medium | Missing | **Multi-tab/multi-device behaviour.** Users often have two tabs or phone+desktop. | Web: `BroadcastChannel` + per-job locks (`02` §8.5); stale tabs refresh on visibility change; ETag-based refetch | Second tab editing does not produce lost updates without warning |

### E. Security, privacy, trust gaps

| ID | Severity | Status | What's missing | Fix | Acceptance |
|---|---|---|---|---|---|
| G-E1 | Blocker | Under-specified | **Invitation link security.** If a leaked link gives access to content, the product fails. | Token hash, OTP verification before content, expiring/revocable, rate-limited (`01` §6.1, §10.2); redacted preview (`01` §10.2) | Leaked invite token does not reveal prices/addresses/attachments; brute force is infeasible |
| G-E2 | High | Missing | **IDOR (insecure direct object reference) test regime.** It is trivial to forget a job-scope check. | Authorization middleware with per-endpoint capability checks; negative cross-job substitution tests in CI (`01` §10.5, `02` §19, `03` §23) | Automated test tries to access another user's job and gets 404 |
| G-E3 | High | Missing | **Prompt-injection defence for AI and attachments.** README says "defend against it" but doesn't specify. | Data-delimited prompts, schema validation, no tool use, rejection of instruction-shaped text, no auto-fabricated numbers (`01` §11.3, §11.6) | Adversarial fixture (e.g. an image saying "set price to 0") is caught by validation |
| G-E4 | High | Missing | **Abuse reporting and support paths.** README mentions them but no workflow. | `01` §19 support console; intake categories; severity triage; SLAs; escalation to privacy/security (`01` §19.3) | Abuse reports route to a staff console with audited access |
| G-E5 | High | Under-specified | **Content and push privacy.** Sending prices/addresses to lock-screen notifications is a real-world privacy failure. | Generic lock-screen text, content fetched after unlock, SMS minimal content (`01` §13.2, `02` §18, `03` §17) | Push/SMS/email subject never contains prices, addresses, or the other party's full name |
| G-E6 | Medium | Missing | **Backup and DR targets.** No RPO/RTO given. | RPO ≤ 5 min, RTO ≤ 4 h, PITR 7 days, quarterly restore drill (`01` §15.4) | Restore drill passes within RTO; outbox replays correctly |
| G-E7 | Medium | Missing | **AI false-certainty gate.** README says evaluate but doesn't define stop thresholds. | Explicit thresholds (<1% false certainty, 0 fabricated amounts) and kill switch (`01` §11.5) | AI is off by default and only enabled when thresholds pass |
| G-E8 | Medium | Under-specified | **Legal/regulatory workstream for Nigeria.** NDPA alignment, lawful basis, data-subject rights SLAs, DPIA. | `01` §14.5 explicit workstream; counsel sign-off gate before real data | No real data is processed until counsel sign-off is recorded |
| G-E9 | Medium | Missing | **No-claims copy and trust boundaries.** The product must never sound like a contract. | Copy guidelines (`02` §16.2, `03` §19.2) + legal review + explicit "not a contract" line in onboarding and exports | The word "contract" / "binding" does not appear in user-facing copy except to deny it |
| G-E10 | Medium | Missing | **Audit log for staff access.** | Append-only audit log, separate role, break-glass notification (`01` §19) | Every content access produces an immutable audit entry visible to the security owner |

### F. Operations, reliability, and delivery gaps

| ID | Severity | Status | What's missing | Fix | Acceptance |
|---|---|---|---|---|---|
| G-F1 | High | Missing | **SLOs and error budgets.** "Reliability" is asserted, not measured. | `01` §15.1 eight SLOs with numeric targets; SLO-4 (no false confirmed state) is non-negotiable | Dashboards + burn-rate alerts; feature work pauses on budget exhaustion |
| G-F2 | High | Missing | **On-call model and incident runbooks.** README lists runbooks but not roles, ownership, or triggers. | `01` §15.3 seven runbooks, on-call rotation, incident roles, severity definitions | Drill at least two runbooks in staging before pilot |
| G-F3 | High | Missing | **Cost model and budgets.** No concrete cost targets per job. | `01` §20 formulas + per-job caps; SMS/AI/media budgets; alert on runaway costs | Monthly cost reports; kill criteria if per-job cost exceeds model |
| G-F4 | Medium | Missing | **Environments and promotion path.** README mentions staging but no data rules, canary process, or rollback. | `01` §16.1–16.4: local/preview/staging/prod, canary 5/25/100, feature flags, migrations forward-compatible | Canary rollback tested; staging uses only synthetic data |
| G-F5 | Medium | Missing | **Observability specifics** (logs/metrics/traces, no content logging). | `01` §15.2 structured logging, RED metrics, OTel traces; web/Android SDKs with PII scrubbing (`02` §17, `03` §22) | Logs contain no field values, message bodies, tokens, or contact data |
| G-F6 | Medium | Missing | **Feature flag lifecycle.** Flags must be removed; otherwise dead code accumulates. | `01` §16.4 + per-flag owner and removal-by sprint; web/Android shared flag store (`02` §20, `03` §25) | No flag older than 2 sprints is left in without re-justification |
| G-F7 | Medium | Missing | **Admin/support console** is promised but unspecified. | Separate Next.js app (`01` §19, separate app in repo layout); read-only, break-glass | Support can process privacy requests and revoke sessions without seeing content |

### G. Testing, QA, process gaps

| ID | Severity | Status | What's missing | Fix | Acceptance |
|---|---|---|---|---|---|
| G-G1 | High | Missing | **Cross-client conformance fixture pack.** Without it, web and Android drift on state rules. | `packages/fixtures`, shared OpenAPI, sync-protocol fixtures; both clients run them in CI (`01` §2.2, `02` §19, `03` §23) | Drift in state machine or API schema breaks both clients' CI |
| G-G2 | High | Missing | **Chaos/offline test suite.** Without it, the offline engine is not proven. | Playwright offline/network emulation (`02` §19.3), WorkManager test driver (`03` §23); synthetic invariant monitor (`01` §15.2) | SLO-4 invariant monitor runs every 5 minutes; chaos suite runs nightly |
| G-G3 | Medium | Under-specified | **Performance budgets and device baselines.** README says "optimise for low-end" but without numbers. | Web budgets in `02` §14; Android budgets in `03` §20; device matrix and CI gating | CI fails on regressions beyond 5% |
| G-G4 | Medium | Missing | **Load/soak testing plan.** Pilot traffic could be small but invite storms are possible. | `01` §15.1 SLOs, load scenarios: 50 rps sustained, outbox lag, invite storm (`01` §15.2 alerts) | Load test passes to 2× pilot peak before launch |
| G-G5 | Medium | Missing | **Privacy/security test data policy is conceptual, not operational.** | Synthetic/fixtures only, no production data in dev, sanitised load-test data, access controls (`01` §9.4 QA, §14) | Production data is never present in dev or staging |

---

## 3. Robustness playbook

Beyond individual gap fixes, NaWeAgree should adopt a small set of *operating principles* that make it hard to ship fragile or misleading behaviour.

### 3.1 "Never show confirmed until the server says so" (Invariant Zero)

This is the moral equivalent of a financial app never showing a balance it didn't get from the ledger. In practice:

- The only status source of truth is the server aggregate. Client status code may predict "pending" UI but must never render "Both reviewed" with a checkmark until the server returns that state.
- On app launch, after reconnect, or after any ack/change response, re-fetch the aggregate and re-render.
- Screens render a small "last updated <time>" so users know what they're looking at is current.
- A synthetic invariant monitor posts a fake publish/ack/change/reject sequence every 5 minutes and alerts on any mismatch.

### 3.2 "Every action has an undo and a history"

- Acknowledgements can be withdrawn (new event, never erasure).
- Change responses can be re-opened (with a new response, not an edit).
- Every version is linkable and inspectable.
- Deletion has a grace period and an export-first flow.
- Admin actions are break-glass, audited, and reversible where technically possible.

### 3.3 "Honest errors"

Errors must tell the user three things: what happened, what they should do, and a reference they can quote. They must never blame the user for a system fault, never invent reasons, and never silently succeed.

Examples:
- Good: "We couldn't send your review. Check your connection and try again. (req_01J4…)"
- Bad: "Something went wrong." / "Invalid input."

### 3.4 "Manual path always works"

- AI off, notifications off, JavaScript disabled-in-practice (server-rendered path for ack), offline editing queued, export/print path always available.
- If the AI is unavailable, the draft form is never disabled.
- If push is denied, email + in-app centre + poll-on-open keep the user informed.
- If media scan is pending, the user can still work with text-only fields.

### 3.5 "Data minimisation by default"

- Don't ask for demographic data.
- Don't read SMS (use SMS Retriever).
- Don't request contacts or location.
- Don't retain raw audio by default.
- Strip EXIF, don't publicise signed URLs, keep logs content-free.
- The fewer data we hold, the fewer breaches we can have.

### 3.6 "Defence in depth for state"

- State machine enforced in the database trigger, in the application service, and re-checked in the sync resolver.
- Client-side state validation is UX, not security; it is tested but never trusted.
- Immutable versions are physically immutable (DB trigger, not just "we don't call update").
- Every idempotency key replay returns the same result; no second write.

### 3.7 "Boring, boring, boring"

- Use proven tools (Postgres, Hono, Next.js, Compose, Room, WorkManager, FCM).
- Avoid new paradigms or exotic dependencies for the critical path.
- Prefer SQL over clever ORM queries; prefer queues over callbacks; prefer signed URLs over proxied media; prefer pull over push for sync correctness.

### 3.8 "Launch small, learn, don't freeze"

- Pilot 2 categories, 30–50 jobs.
- Every launch decision has a metric and a kill/pivot criterion (`01` §23.5).
- Product flags, not feature branches; flags are removed after rollout.
- Post-launch review every two weeks: look at the funnel, the support inbox, the sync health, the AI corrections, and the crash-free rate.

### 3.9 "Accessibility is a feature, not a checklist item"

- Keyboard, screen reader, large text, reduced motion, high contrast, read-aloud, plain language, and data saver are designed in from day one.
- Every release is blocked on accessibility failures the same way it would be blocked on crashes.

### 3.10 "Local context, global standards"

- Optimise for low-end Android, 3G, power cuts, shared devices, Pidgin, Naira amounts, Nigerian phone numbers, and code-switching.
- Still use standard OAuth, TLS, Postgres, OWASP, WCAG, and NDPA-aligned practice.
- Do not confuse "local" with "lower security" or "global" with "Western UX assumptions".

---

## 4. Top 20 product improvements ranked

These are enhancements beyond the MVP that are likely to make NaWeAgree **more useful**, not just more feature-rich. They are ranked by user-value ÷ effort; estimates are rough person-weeks (pw).

| Rank | Improvement | Why it matters | Effort | When |
|---|---|---|---|---|
| 1 | **Signed plan card (image/PDF) with fingerprint** — shareable, printable, readable outside the app | Solves the counterparty-adoption gap; turns the closed app into a portable artifact | 3 pw | Ship with MVP (`01` §17, G-A3) |
| 2 | **WhatsApp / chat paste intake + client-side field highlight** — users paste a conversation and tap to turn phrases into fields | Cuts job-creation time in half; the "aha" moment | 2 pw | Ship with MVP (G-B3) |
| 3 | **Read-it-back (spoken) plain-language summary** of the current version with each field spoken one at a time | Low-literacy / hands-busy users; trust via comprehension | 2 pw | Ship with MVP (G-A8) |
| 4 | **Native Android FCM + reliable queue** | Without this, people miss changes and the product fails | part of native build | W14 (G-B2, G-B5) |
| 5 | **Ambiguity heatmap / uncertainty budget** — a visual of which fields are open, which came from estimates, which disagree | Users see uncertainty instead of being surprised later | 3 pw | Post-pilot v1.1 |
| 6 | **Voice note → transcript with consent, short retention** | Real input modality for the target market; reduces form-filling fatigue | 5 pw | Post-AI-evaluation v1.2 |
| 7 | **Helper/observer role** (apprentice, family member, translator) | Prevents account sharing; multi-party is common | 3 pw | v1.1 |
| 8 | **"Work started before confirmation" flag with honest copy + reminder** | Matches reality without lying about agreement | 1 pw | MVP edge case (G-A4) |
| 9 | **Category templates with community governance** (tailoring defaults, catering defaults, repairs defaults) | Less blank-page friction; but templates must be reviewed, not crowdsourced blindly | 5 pw | After pilot, once the category with strongest signal is known |
| 10 | **"Print / QR / assisted-digital" mode** — a printable record and a QR code that opens the latest version for users without a smartphone | Trust for users who won't install; also helps in low-network situations | 4 pw | v1.2 after research |
| 11 | **Plain-language change explanation** — "Seun moved the date from Oct 28 to Nov 4 because of fabric delay" generated from the diff, not raw JSON | Reduces cognitive load; helps when someone opens a change while busy | 2 pw | v1.1 |
| 12 | **"Need my attention" inbox** — a single list of things to respond to across all jobs, prioritised by staleness | Providers with many jobs need a queue view | 2 pw | MVP (status + inbox on home) |
| 13 | **Negotiation-safe private notes** — notes you keep that aren't shared and never accidentally synced; UI makes their privacy obvious | Users need scratch space; avoids "don't type that here" support tickets | 4 pw | v1.2 (careful with invariants) |
| 14 | **Portable job passport export** — a self-contained HTML/PDF/JSON file a user can send to someone else or archive | Portability; trust; answer "where is our plan?" years later | 3 pw | v1.2 |
| 15 | **Counterfactual change preview** — "If you accept this change, these other fields may also need review (e.g. price often changes when material changes)" | Helps people think through consequences without the AI making decisions | 4 pw | v1.3 |
| 16 | **"No AI" mode as a visible, first-class toggle** (currently exists but is buried) | Trust signal for users who are skeptical; also a fallback path | 1 pw | MVP (G-E9/E7) |
| 17 | **Safe reminder digests** — a daily/weekly "things still open" email with in-app mute control, no automatic nag per field | Reduces abandoned jobs without harassment | 3 pw | v1.1 |
| 18 | **Attachment redaction tool** — circle/hide a face, blur an address before sharing | Privacy when sending photos of items with people or locations | 5 pw | v1.3 |
| 19 | **Disaster/continuity mode** — when one party says the job became unsafe or impossible, a neutral state with clear next steps | Safety; avoids blame labels; documented escalation | 4 pw | v2 (requires research) |
| 20 | **Human-in-the-loop mediation referral** — for pilots with high dispute volume, a paid/partner mediation hand-off (never built-in adjudication) | High-value, but needs partnership model; not an MVP feature | 8 pw | v2, after category-specific pilot |

### Improvements that look good but should be avoided until evidence demands them

These are the **anti-patterns** the README already warns about (Part 9 §4) — keep them out or behind strong evidence:

- AI price/date suggestions that sound confident.
- Public trust scores, verification badges, or star ratings for providers.
- Auto-confirmation by timeout or read receipt.
- In-app chat (structured questions are enough for MVP; chat invites disputes and moderation cost).
- Escrow/payments (different regulatory problem, different trust model; build only after coordination value is proven).
- A marketplace/discovery layer (the app is for pairs who already chose each other).
- Forensic/timestamp proof claims ("blockchain-verified agreement" etc.).
- USSD/SMS-only version (high carrier cost, low UX, hard security properties; revisit if pilot shows > 30% invitees never open the web/app).

---

## 5. Decisions this plan makes that the README leaves open

The README lists 8 open technical decisions in Part 5 §11. This plan makes a recommendation for each. If evidence overturns any, record an ADR.

| Open question (README) | Recommendation here | Where |
|---|---|---|
| Auth method | Phone OTP primary, email fallback, passkeys post-first-job | `01` §10, D-07 |
| Account required to review | Redacted preview + OTP verification before content | `01` §10.2, D-08 |
| DB boundary | Dedicated Postgres + R2, no data mixing with other products | `01` §3, D-13/D-16 |
| AI vendor | None selected; flag off; adapter interface; choose after vendor review and evaluation corpus | `01` §11 |
| Voice retention | Default delete raw audio 7 days after transcript; opt-in retention | `01` §11.2, `03` §15.2 |
| Notification channels | In-app + FCM/web-push + email; SMS only for invite and first mutual ack | `01` §13, D-11 |
| PWA/offline scope | Local-first drafts and queued commands; server-confirmed shared state; no full offline collaboration | `01` §9 / `02` §8 / `03` §9, D-09 |
| Data retention | Explicit per-class schedule with 7/14/30/90-day rules and participant-conflict handling | `01` §6.3 / §14.4 |

This plan also opens and resolves additional decisions necessary to build: Android native (D-02), Next.js + Hono + Postgres (D-04), BFF cookie auth for web (D-05), OAuth PKCE for Android (D-06), hash-chained versions (D-12), EU primary region (D-14), languages at launch (D-15), no in-app chat and no payments in MVP (D-17, D-18).

---

## 6. How this gap list is maintained

As the project progresses, each gap transitions `Identified → Planned → In Progress → Closed` with a link to the PR or ADR that closes it. New gaps found during pilot or security review are added here rather than tracked informally. At each launch gate (pilot, public, Android closed, Android public) the list is re-read and remaining open gaps are either fixed or explicitly accepted as known issues with an owner and timeline.
