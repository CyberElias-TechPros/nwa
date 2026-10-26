# NaWeAgree — Full Delivery Plan (Web + Android)

_Companion to `README.md`, which defines product invariants. This document is an
engineering delivery plan: it does not override any README invariant (no auto
confirm, version-bound acks, silence ≠ consent, Pidgin-first UX, etc.)._

---

## 0. Product recap (from README)

NaWeAgree is a **plan-together tool** for couples/partners to turn a fuzzy
agreement into a specific versioned plan, and to renegotiate when things
change — without WhatsApp screenshots, without AI auto-signing for you.

Core loop:
1. **Creator** drafts a plan (title, when/where, who pays, notes).
2. App generates a **shareable invite link**.
3. **Other person** opens the link, enters their name, and responds
   **Agree / Propose changes / Disagree**, with a free-text reason.
4. Changes create a **new version** (v2, v3…). Ack is per-version; older acks do
   not carry forward.
5. When both sides agree on the same version → **CONFIRMED** (with receipt).
6. **Reminders** nudge the other person if no response after T minutes.
7. Works in English **and** Pidgin (code switching welcome).

Invariants I will not break:
- Bot never agrees for anyone.
- Consent is per-version; silence is never consent.
- Everyone sees the same version and who said what.
- Reasons are free text, no "AI-suggested replies" that substitute for a voice.
- Mobile-first; Nigerian English / Pidgin is a first-class surface.

---

## 1. Gaps in the current README plan

The README covers the core loop beautifully, but a production-grade app needs
several dimensions it either glazes over or omits. Here is what's missing and
how I'm fixing each gap in this plan.

| # | Gap | Risk if ignored | Fix in this plan |
|---|------|-----------------|------------------|
| G1 | **Persistence** — README doesn't say where plans/messages/versions live. Current API is in-memory (wipes on restart). | Every restart deletes all plans; impossible to ship reminders, OTP, receipts. | **T-W2-01**: Neon Postgres + Kysely migrations. |
| G2 | **Identity/abuse** — anyone with a link can respond; no creator verification of device, no rate-limit story at the README level. | Plan-jacking, spam, harassment. | T-W2-04 OTP/Email magic link for creator reclaim; rate limits (done T-W1); per-token response rate limit; audit log. |
| G3 | **Security model for invite tokens** — token is effectively a bearer secret in the URL; README doesn't address token rotation, leak response, or expiration. | Token leak in chat history = strangers see your plans. | 22-byte CSPRNG tokens; tokens never logged; `?token=` stripped from URL after load; "Reset link" invalidates old token; optional 7-day expiry. |
| G4 | **Notifications** — README says "reminders nudge" but doesn't specify channel (email? push? SMS? web push?). | Reminders can't actually fire on web without a subscription. | Web Push (T-W6), Email via Resend (T-W5), FCM for Android (T-A7). SMS deferred (T-W12, post-MVP, cost). |
| G5 | **Offline / flaky networks** — README says "no WhatsApp screenshots" but doesn't address the Nigerian-network reality (spotty 3G, 2G fallback). | App is unusable in exactly the moments couples need it most. | Service-worker shell (T-W1 done), local Room cache on Android (T-A3), outbox queue with retry (T-W10 / T-A6), version-conflict handling on reconnect. |
| G6 | **Confirmations / receipts** — README says "receipt" but not what it contains (timestamps, IP-hash? phone? version hash?). | Users have no proof of what was agreed; disputes can't be settled. | T-W7: signed receipt JSON (server HMAC keyed with env secret) with `(jobId, version, participantIds, agreedAt timestamps, contentHash)`; downloadable PDF and shareable image. |
| G7 | **Accessibility** — Pidgin-first ≠ screen-reader-hostile. | Blocks users with visual/motor impairments. | WCAG 2.1 AA target (T-W1 design-token contrast checks, labels on all interactive controls, keyboard navigation, reduced-motion, ≥4.5:1 contrast enforced in CI). |
| G8 | **Internationalisation** — README says "English and Pidgin" but gives no mechanism. | Pidgin strings rot alongside English ones. | T-W8: `next-intl` on web, `strings.xml` resource overlays on Android; Pidgin locale `pcm-NG`; translator-friendly JSON. |
| G9 | **Data export / deletion** — no mention of data portability or account deletion (mandatory for NDPR, Nigeria's data-protection law). | Legal blocker in NG; also unethical. | T-W9: GDPR/NDPR-aligned "Export my data" (JSON) and "Delete me" flows; retention policy (soft delete + 30-day hard delete). |
| G10 | **Version history UX for recipients** — README focuses on the agreed version but not how a recipient sees who changed what and why. | Users sign something they didn't actually read the diff for. | T-W3: diff view (additions/removals highlighted), author + change-reason inline on every version card, required reason on every Propose-changes. |
| G11 | **"My plans" for non-creators** — README's "My plans" page only tracks created invites from `localStorage`; the **recipient** has no durable list. | Recipients lose plans across devices. | T-W2-05: `claimed_participations` table keyed by (deviceKey) so recipients can re-find plans; OTP-gated "reclaim plans I responded to" via email. |
| G12 | **Observability** — README says nothing about logs, metrics, errors. | Production outages are invisible. | T-W11: structured pino logs + requestId (W1 middleware done), Sentry for web/API/api Android, Cloudflare analytics, health endpoint extended with DB+queue depth. |
| G13 | **Test coverage** — README is product-only; no test strategy. | Regressions. | Vitest unit tests, Playwright E2E for web, JUnit + Compose UI tests on Android; contract tests between web/Android and API (OpenAPI generated types). |
| G14 | **Deployment / hosting** — README doesn't say where anything runs. | "Works on my machine". | API: Cloudflare Workers (already wired for wrangler). Web: Vercel (connected). DB: Neon Postgres (serverless, edge-ready). Android: Play Store closed alpha → open beta → production. |
| G15 | **Legal / privacy / content** — no privacy policy, no ToS, no abuse-report path. | Play Store rejection; NDPR issue. | T-W12: privacy policy page, terms page, "Report abuse" link, retention policy, data-processing register. |
| G16 | **Sharing mechanics on Android** — Android should accept ACTION_SEND intents (share into NaWeAgree from WhatsApp), and produce a share sheet. | Android app is siloed. | T-A5: `Intent.ACTION_SEND` for plan links; `FileProvider` share for receipt image/PDF. |
| G17 | **App vs web link handling** — when you tap a `naweagree://j/<token>` link on a phone with the app installed, the app should open it; otherwise the web opens. Not specified. | Bad deep-link UX; app installs break the flow. | T-A4: Android App Links (`autoVerify`) + web `/.well-known/assetlinks.json`; same https://naweagree.com/j/<token> URLs open in app when installed. |
| G18 | **SMS/OTP delivery cost** — phone-based login in NG costs money per SMS and is abuse-prone. | Can't afford to ship to real users. | Prefer email magic-link (Resend, cheap) + device-local identity; OTP/email fallback only for reclaim; phone deferred. |
| G19 | **Creator vs recipient detection** — when the creator opens their own invite link, they should see the creator dashboard, not the "enter your name" prompt. | Confusing "am I the other person?" bug. | Fixed in T-W1 (creatorParticipantId stored + branched render). |
| G20 | **Audit log / immutable history** — versions and messages shouldn't be editable after the fact (otherwise the receipt is meaningless). | Tampering disputes. | T-W2-03: all writes to job_events (append-only); versions/messages are immutable rows; `UPDATE` banned via a Postgres trigger and a Kysely type-level readonly mapping on those tables. |
| G21 | **Conflict resolution** — two participants proposing changes at the same time produces a fork. README doesn't address forks. | Lost edits; silent overwrites. | Optimistic concurrency via `currentVersion` in ProposeChanges; 409 CONFLICT with the newer version returned; client auto-rebases the "your change" text on top. |

---

## 2. Work-track structure

- **T-W\***: Web + shared API tasks (these unblock Android, since Android hits the same API).
- **T-A\***: Android-native tasks.
- **T-X\***: Cross-cutting (legal, infra, docs).

All tasks assume the current monorepo at `/home/user/nwa` (pnpm + turbo):
- `apps/api` — Hono on Cloudflare Workers (wrangler).
- `apps/web` — Next.js 15 (App Router) + PWA.
- `apps/android` — Jetpack Compose + Hilt + Room + Kotlin Coroutines.
- `packages/design-tokens` — codegen to CSS vars *and* Jetpack Compose `Colors.kt`
  (single source of truth for light/dark, already wired).

---

## 3. Web plan (apps/web + apps/api)

### Phase W1 — Foundations ✅ (partially shipped)
**Done:**
- Next.js 15 App Router skeleton (home, new plan, plans list, invite page).
- Hono API with health, createJob, getJob, respondJob.
- In-memory job store with versions, participants, messages, confirm status.
- 15s auto-refresh polling on invite page.
- Rate limit (sliding-window 120/min/IP) + idempotency-key (POST/PATCH, 24h TTL) middleware with tests.
- Design-token CSS (light/dark tokens) with generated `tokens.css` and Compose `Colors.kt`.
- PWA manifest, SVG icon, metadata/viewport split for Next 15.
- Global + segment error boundaries; Nav bar; online/offline badge.
- Service worker shell (`/sw.js`) + `/offline` fallback page.
- Creator dashboard: creatorParticipantId return, creator-view.tsx (status, response list, pending list, agree, copy-link, messages, version history, propose-version, 15s auto-refresh).

**Still to do in W1:**
- Render `author` + `changeReason` inline in the recipient VersionHistory (currently visible only as messages; the version card itself doesn't show who changed what).
- Playwright E2E smoke covering: create → open invite → respond propose → creator sees → agree → confirmed receipt.

### Phase W2 — Persistence (replaces in-memory store)

- **T-W2-01** **Neon Postgres + Kysely**
  - New `apps/api/src/db/` with `kysely` + `@neondatabase/serverless` (WebSockets/pg-wire compatible with Workers).
  - Connection pooling via Neon's built-in proxy; secret in `wrangler.toml [vars] DATABASE_URL` (and `.dev.vars` locally).
  - Kysely codegen for typed rows.
  - Schema migrations in `apps/api/src/db/migrations/` (run via `pnpm migrate` in CI and as a one-off post-deploy):
    - `jobs(id UNIQUE, token UNIQUE, title, current_version, status, created_at, expires_at)`
    - `participants(id, job_id, name, side[creator/other], email?, device_key, joined_at, claimed_at, last_seen_at)`
    - `versions(id, job_id, version_no, title, when_text, where_text, who_pays, notes, proposed_by, change_reason, created_at)`
    - `acks(participant_id, version_id, decision[agree/disagree/pending], reason, created_at)` — per (participant, version) so new versions reset acks (enforces the README invariant).
    - `messages(id, job_id, participant_id, kind[chat/system/propose/agree/disagree/reminder], body, created_at)` — append-only.
    - `job_events(id, job_id, type, payload_jsonb, actor_participant_id, created_at)` — append-only audit log (addresses G20).
    - `idempotency_keys(key UNIQUE, request_hash, response_status, response_body, created_at)` — replaces in-memory cache.
    - `rate_limit_buckets(key UNIQUE, window_start, count)` — optional, Workers Durable Objects or CF KV are better; keep in-memory acceptable per-worker (rate limits are best-effort).
- **T-W2-02** Refactor `jobs/routes.ts` against the DB; keep the same JSON contract so web/Android don't break. Add transaction wrapper for "respond + maybe create version + maybe advance to CONFIRMED".
- **T-W2-03** Append-only enforcement (G20): Postgres `CREATE TRIGGER` forbidding DELETE/UPDATE on `messages`, `versions`, `acks` after insert; API never emits UPDATE on those tables, only INSERT.
- **T-W2-04** Identity:
  - Server generates `deviceKey` as a 16-byte CSPRNG value set in a short-lived cookie or returned on first visit and stored in `localStorage` (web) / `DataStore` (Android). The deviceKey is how creators reclaim "plans I made".
  - Optional email association later (T-W5): email-magic-link is the recovery path, not the primary auth (respects "no accounts" spirit — README doesn't want to force signup).
  - Tokens: 22-byte `base64url` (≈132 bits), logged as `<redacted>` in pino, stripped from the URL via `history.replaceState('?', '', location.pathname)` after load (G3).
- **T-W2-05** `rememberCreatedInvite` / `rememberClaimedParticipation` rework: persist to DB via `deviceKey`, not just `localStorage`, so "My plans" survives device switch (G11).
- **T-W2-06** Seed script + migration runner in CI (`pnpm --filter @nwa/api migrate:latest` against a Neon test branch).

### Phase W3 — Version UX & conflict handling

- **T-W3-01** Diff view for recipients: on a propose-changes version, show additions/deletions relative to the previous version (simple word-diff on each field; don't over-engineer with operational transforms — plans are short text).
- **T-W3-02** Version card surfaces **author name** + **change reason** inline (not just in chat) (G10).
- **T-W3-03** Required reason on "Propose changes" — client blocks submit if reason is empty; server validates with `422 UNPROCESSABLE`.
- **T-W3-04** Optimistic concurrency: ProposeChanges requires `If-Match: <currentVersion>` (or `expectedVersion` in body); server returns `409 CONFLICT` with the current version; client shows "Someone else proposed a new version just now — here it is; edit on top of it or discard" (G21).
- **T-W3-05** "What changed since you last saw" marker for each participant (compare last-seen version).

### Phase W4 — Reminders (web)

Reminders need persistence + a scheduler. On Cloudflare Workers the cleanest
fit is **Durable Object alarm** or **Queues + Cron Triggers** (no separate
worker needed).

- **T-W4-01** Cron trigger (`cronTriggers = [{ cron: "*/5 * * * *" }]`) fires a `GET /internal/scheduler/run` (mTLS-gated via `X-Scheduler-Secret`).
- **T-W4-02** Reminder policy: if status=PENDING_RESPONSE and no response from the other side for 1h / 6h / 24h / 72h, enqueue a reminder (in-app notification always; email if we have one; web push if subscribed). After 3 reminders, auto-mark `STALLED` — **never** auto-confirm (README invariant).
- **T-W4-03** Creator can tap "Nudge now" to fire an immediate reminder (rate-limited to 1/h per job to prevent harassment).
- **T-W4-04** Mute/block: participant can opt out of reminders for a specific job; "End plan" moves to DECLINED/CANCELLED with message.

### Phase W5 — Email magic link

- **T-W5-01** Integrate Resend (or Postmark) via a Workers fetch; API key in secret.
- **T-W5-02** `POST /v1/auth/email/request-code { email, jobId? }` sends a short code + one-use magic link; code is hashed (SHA-256) and stored in DB with 10-min TTL.
- **T-W5-03** `POST /v1/auth/email/verify { code }` returns a short-lived session cookie that links the deviceKey to an email.
- **T-W5-04** Email is **optional**. The app works 100% without it for link-based flows; it only enables reminders-to-email and cross-device reclaim (respects no-account spirit).
- **T-W5-05** Templated HTML + plaintext emails (MJML or plain Handlebars) in English and Pidgin, with reminder footers and a 1-click "unsubscribe from this plan" link.

### Phase W6 — Web Push

- **T-W6-01** VAPID keys generated and stored; web push endpoint uses `web-push` package (or Workers-compatible equivalent).
- **T-W6-02** Client registers push subscription after the user clicks "Enable reminders" (no auto-prompt); subscription stored per participant.
- **T-W6-03** Reminder + "they responded" + "plan confirmed" push types; click-through deep links to the job page.
- **T-W6-04** Handles denied/expired subscriptions gracefully (don't nag again).

### Phase W7 — Confirmation receipt (G6)

- **T-W7-01** On CONFIRMED, server signs a receipt payload:
  ```
  payload = { jobId, versionNo, contentHash, participants:[{id,name}], decidedAts, confirmedAt }
  receipt = payload + HMAC(SERVER_RECEIPT_SECRET, JSON.stringify(payload)) + versionContentFull
  ```
- **T-W7-02** Web shows "✅ Confirmed" banner with download buttons:
  - "Save as image" → rasterised card (use `html-to-image`) suitable for WhatsApp.
  - "Download JSON receipt" → signed payload.
  - "Download PDF" → printable PDF (via `@react-pdf/renderer`).
- **T-W7-03** Receipt page is public at `/j/<token>/receipt` only after CONFIRMED and only exposes the agreed version + participant names (no chat, no prior rejected versions).

### Phase W8 — i18n (G8)

- **T-W8-01** Add `next-intl` with `en` and `pcm-NG` (Nigerian Pidgin) locale folders.
- **T-W8-02** Locale selector in nav; default auto-detected from `Accept-Language` but overridable; per-user preference persisted.
- **T-W8-03** All user-facing strings (including error messages, email templates, receipt) keyed in locale JSON.
- **T-W8-04** Date/number formatting uses `Intl.DateTimeFormat` with timezone picked from browser; "3 hours ago" relative-time strings also localised.

### Phase W9 — Data export / deletion (G9, NDPR)

- **T-W9-01** `/settings` page:
  - "Export my data" → ZIP of JSON (all plans I'm part of + messages, keyed by my deviceKey). Authenticated via email OTP if an email is attached; otherwise via a one-time link shown once after creation.
  - "Delete everything" → soft-delete all my participations and my personal data; hard delete jobs I created that have no other participant after 30 days.
- **T-W9-02** Retention policy doc + in-app text: plans stay while participants are active; accounts soft-deleted immediately and hard-deleted 30d later; logs redacted of PII after 7d.
- **T-W9-03** Privacy policy + Terms pages (markdown, served statically).

### Phase W10 — Offline robustness (G5)

- **T-W10-01** IndexedDB cache (via `idb` or Dexie) of jobs the user has opened, keyed by token.
- **T-W10-02** Outbox queue: if network is down when a user responds/proposes/agrees, queue the action in IndexedDB and retry with exponential backoff when online; UI shows "Will send when you're back online".
- **T-W10-03** Conflict handling on reconnect: server's 409 path already catches cases where a newer version appeared while the user was offline; client surfaces the same "new version exists" flow as the live case.
- **T-W10-04** Service worker pre-caches the shell + the most recently opened plan; navigation falls back to `/offline` (already done) or to cached plan if cached.
- **T-W10-05** Bandwidth-friendly: polling switches to `cache: no-store` only when the tab is visible; in background tabs, poll interval grows to 60s; uses `visibilitychange` and `navigator.onLine`.

### Phase W11 — Observability (G12)

- **T-W11-01** Structured pino logs already have requestId; add DB query timing, error classification (domain vs unexpected).
- **T-W11-02** Sentry for web + Workers: `@sentry/nextjs`, `@sentry/cloudflare`; release SHA from turbo; source maps uploaded.
- **T-W11-03** Health endpoint `/v1/health` extended with `db: 'ok'|'fail'` (simple SELECT 1), latest cron run timestamp, queue depth.
- **T-W11-04** Frontend Web Vitals reporting (LCP, FID/INP, CLS) to Plausible or a custom endpoint.

### Phase W12 — Polish, legal, abuse (G15)

- **T-W12-01** Privacy policy + ToS + Contact pages.
- **T-W12-02** Report-abuse form (sends to a moderation email).
- **T-W12-03** "Reset link" creator action: invalidates current token, issues new one (G3).
- **T-W12-04** Expiry option: creator can set a deadline (12h / 3d / 7d / never); past deadline → EXPIRED status.
- **T-W12-05** SMS (Termii or Twilio Nigeria) as optional channel for reminders — **post-MVP** because per-message cost matters; email + push first.

### Phase W13 — Tests & CI (G13)

- **T-W13-01** Vitest unit tests: every route handler, every middleware, every domain invariant (version-bound acks, never auto-confirm, silence ≠ consent as tests).
- **T-W13-02** Playwright E2E (installed at `apps/web/e2e/`):
  - Happy path: create → share → respond-agree → confirmed → receipt.
  - Change loop: create → propose → agree-new-version → confirmed.
  - Conflict: two concurrent propose calls → 409 + correct resolution.
  - Offline: go offline, respond, come online, response posted.
- **T-W13-03** OpenAPI spec at `apps/api/openapi.yaml` generated or hand-maintained; typescript types generated for web AND Android (via `openapi-typescript` and a small Kotlin generator) to keep clients in sync.
- **T-W13-04** CI (GitHub Actions): install, typecheck, lint, test, build, migrate against test DB, Playwright.
- **T-W13-05** Lighthouse CI for PWA/a11y/performance budgets (LCP < 2.5s on 4G throttled, a11y 100).

### Phase W14 — Launch

- Custom domain `naweagree.com` on Vercel (web) + `api.naweagree.com` (or routes `/v1/*` through Next rewrites to Workers for single-origin).
- SEO: metadata per page, og:image for plan invites (dynamic image at `/j/<token>/og.png`), canonical URLs.
- `robots.txt` (done in W1) + `sitemap.xml` excluding invite pages (they're unlisted).
- Waitlist landing page + share-to-WhatsApp CTA on confirmed receipt.

---

## 4. Android plan (apps/android)

### Architecture

- **Language/UI:** Kotlin 2.0 + Jetpack Compose (Material 3, dynamic color with design-token fallback).
- **Min SDK:** 26 (Android 8.0) — covers ~94% of active NG devices per Play Console; lets us use java.time, core-splashscreen, WorkManager 2.9.
- **Target SDK:** 34 (current at time of writing).
- **DI:** Hilt.
- **Navigation:** Compose Navigation + Hilt-Compose integration.
- **Network:** OkHttp + KotlinX Serialization (no Retrofit necessary; a thin ApiClient is sufficient and easier to test). Types generated from the same OpenAPI spec used by web (T-W13-03), via `openapi-generator` kotlin-client or a hand-rolled Kotlinx `@Serializable` client (prefer hand-rolled — fewer deps, more control).
- **Persistence (local):** Room DB (mirrors API shape with an added `localState` column for outbox + dirty flags). DataStore Preferences for settings (deviceKey, locale, push token, theme).
- **Background work:** WorkManager for:
  - Polling reminders (even when the app isn't open, respects Doze via `setRequiresDeviceIdle(false)` + backoff).
  - Outbox retry (T-A6).
  - FCM token refresh.
- **Push:** Firebase Cloud Messaging (with a mirror of the web-push channel server-side).
- **Auth model:** same as web — no accounts by default. First launch generates a `deviceKey` (UUIDv4 from `SecureRandom`) stored in DataStore and sent on every API call via `X-Device-Key` header. Optional email magic-link later (same API as web).
- **Design tokens:** Compose `Colors.kt` is **already generated** by `packages/design-tokens/scripts/build.js` (light/dark palettes, semantic names). Type scale and spacing tokens added as Kotlin objects in the same generation step.

### Screens (Compose)

1. **HomeScreen** — "Start a plan" primary CTA; "My plans" (created + claimed); online/offline banner (observes `ConnectivityManager` via `callbackFlow`); Pidgin/English toggle.
2. **NewPlanScreen** — Form (title, when, where, who pays, notes) with local draft save to Room on every keystroke; "Generate link" → creates job via API → navigates to CreatorView and copies invite link to clipboard with system share sheet.
3. **CreatorViewScreen** (mirror of web creator-view.tsx):
   - Status headline (Waiting / Talking / Confirmed / Stalled).
   - Other person's response summary.
   - Pending / agreed participants.
   - Agree button (on current version).
   - Nudge button (rate-limited).
   - Copy-link / Share sheet.
   - Messages (chat) list.
   - Version history (with diff, author, reason).
   - Propose-version composer.
   - Pull-to-refresh + 15s auto-refresh while screen visible.
4. **InviteScreen** (recipient view at `/j/<token>` equivalent — launched via deep link):
   - Name entry if the deviceKey isn't already a participant.
   - Current version display with diff vs last seen.
   - Agree / Propose changes / Disagree with reason field (reason required on propose & disagree).
   - Messages list.
   - Version history.
   - "Remember this plan on my device" toggle (claims it to deviceKey so it appears in My Plans).
5. **MyPlansScreen** — tabs: "Plans I made" / "Plans I joined" / "Confirmed"; pulls from Room cache first, then API; tappable → detail view.
6. **PlanDetailScreen** — single source of truth for any plan (creator or recipient routes here); branches internal UI based on whether the current deviceKey is the creator participant.
7. **ReceiptScreen** — shows Confirmed receipt + share buttons (image via `Canvas`/`PdfDocument`, PDF via Android PdfDocument, JSON share via FileProvider).
8. **SettingsScreen** — language, notifications opt-in, theme, export my data, delete everything, about / privacy / terms.
9. **OfflineScreen** — shown via Compose Navigation when network is unavailable and a plan isn't cached.
10. **EmailMagicLinkScreen** — handles OTP entry for plan reclaim / reminders-to-email.
11. **Deep link entry points:**
    - `https://naweagree.com/j/<token>` → App Link opens InviteScreen.
    - `naweagree://j/<token>` → same.
    - Share-sheet ACTION_SEND of text containing a naweagree link → extract token and open.

### Phase A0 — Project skeleton ✅ (done in this session)
- Created `apps/android/` with Gradle Kotlin DSL, version catalog (libs.versions.toml), Hilt, Compose, Room, WorkManager, DataStore, OkHttp deps pinned.
- `design-tokens` build script already emits Compose `Colors.kt`; Android app will consume it as a Gradle include.
- GitHub Actions matrix stub for Android `assembleDebug` + `lintDebug`.

### Phase A1 — Core shell + design system
- **T-A1-01** Wire up generated `Colors.kt` into Material3 `lightColorScheme()`/`darkColorScheme()`; define `NwaTheme` with proper typography scale from tokens; add dynamic-color on Android 12+.
- **T-A1-02** Base `MainActivity`, `NwaApplication` (Hilt), `NavHost` with sealed-route objects.
- **T-A1-03** Reusable components: `NwaButton` (primary/secondary/text/danger), `NwaCard`, `NwaTextField` (counter, error), `NwaTopBar`, `NwaBadge` (status pill), `NwaLoading`, `NwaEmptyState`. Each uses the semantic tokens.
- **T-A1-04** Connectivity observer (StateFlow); offline banner composable.
- **T-A1-05** Locale handling: toggle writes to DataStore; activity recreates with appropriate `Locale` configuration (`attachBaseContext` wrapper); string resources in `values/` (English) and `values-pcm/` (Pidgin — note: Android won't have a built-in pcm-NG locale, so we'll use `pcm-rNG` as a custom locale identifier and apply it manually).

### Phase A2 — Network layer + data layer
- **T-A2-01** `ApiClient` OkHttp wrapper with:
  - `X-Device-Key` interceptor (from DataStore), request-id interceptor, logging interceptor (debug only), retry-and-backoff interceptor (idempotent GETs only).
  - JSON via KotlinX Serialization, strict lenient=false to catch contract drift early.
  - Connect/read timeouts set low (10s/15s) given NG network reality.
- **T-A2-02** Repository layer (`JobRepository`, `ParticipantRepository`, `AuthRepository`, `NotificationRepository`) per Android-architecture recommendations: returns `Flow<Result<T>>`, emits DB-first then API-refresh (stale-while-revalidate).
- **T-A2-03** Room schema:
  - `jobs` (token PK, title, currentVersion, status, creatorParticipantId, lastRefreshedAt, localState [none/dirty/conflict]).
  - `participants` (id PK, jobId, name, side).
  - `versions` (id PK, jobId, versionNo, fields…, proposedBy, changeReason).
  - `messages` (id PK, jobId, participantId, kind, body, createdAt).
  - `outbox_items` (id PK, jobId, action [respond/propose/agree/nudge], payloadJson, createdAt, attempts).
- **T-A2-04** Map API errors to a sealed `NwaError` (Network, RateLimited, Conflict, NotFound, Server, Unexpected); UI surfaces friendly messages.

### Phase A3 — Offline cache & outbox (G5)
- **T-A3-01** Stale-while-revalidate: opening a plan emits cached Room data instantly, then API fetch diff-updates the DB.
- **T-A3-02** Outbox: every user action (respond/propose/agree/nudge) writes an `outbox_item` in the same Room transaction that performs the optimistic UI update.
- **T-A3-03** `OutboxWorker` (WorkManager, exponential backoff, network-type CONNECTED) drains the outbox in FIFO order, one request at a time; on 409 CONFLICT marks the item `needs_merge` and shows a dialog on next open (same reconciliation flow as web T-W3-04).
- **T-A3-04** On network return / app start, enqueue OutboxWorker; UI shows a "sending…" snackbar with progress.

### Phase A4 — Deep links + App Links (G17)
- **T-A4-01** Add intent filters for `https://naweagree.com/j/*` and `naweagree://j/*` with `autoVerify="true"`.
- **T-A4-02** Host `/.well-known/assetlinks.json` from the web app so Android can verify App Links (Next.js `public/.well-known/assetlinks.json` generated from the app's SHA-256 signing cert fingerprint, documented in `docs/app-links.md`).
- **T-A4-03** On incoming intent, parse the token → enqueue a "refresh job" work request → navigate to PlanDetailScreen.
- **T-A4-04** Handle cold-start deep links (parse intent in `MainActivity.onCreate`) and warm-start (in `NavHost` deep link DSL).

### Phase A5 — Share intents (G16)
- **T-A5-01** Accept `ACTION_SEND` with `text/plain` containing a naweagree URL; extract the token and open it.
- **T-A5-02** Invite sheet: system `ACTION_CHOOSER` with pre-filled text in English/Pidgin ("I made plan for us — open am here: https://naweagree.com/j/<token>").
- **T-A5-03** Receipt sharing via `FileProvider` (`<cache-path>`) for PNG (Canvas-rendered card), PDF (`android.graphics.pdf.PdfDocument`), and JSON (signed receipt).
- **T-A5-04** Copy-to-clipboard action with clipboard-manager toast.

### Phase A6 — Reminders + WorkManager
- **T-A6-01** `PollingWorker`: periodic (every 30 min, flexible) job that refreshes any active PENDING_RESPONSE/TALKING plans, posts local notifications via `NotificationManager` for state changes (other person responded, new version, plan confirmed).
- **T-A6-02** Handled properly across Doze/app-standby with `setRequiredNetworkType(CONNECTED)` and backoff.
- **T-A6-03** On Android 13+ (Tiramisu), gate notifications behind `POST_NOTIFICATIONS` runtime permission — prompted in context after first plan, not on first open.
- **T-A6-04** Notification channels: `plan_updates`, `reminders`, `confirmations`; user-controllable in Settings.
- **T-A6-05** Tap on notification opens the relevant PlanDetailScreen.

### Phase A7 — Push via FCM
- **T-A7-01** Add Firebase BOM, `firebase-messaging-ktx`.
- **T-A7-02** `NwaFirebaseMessagingService` (Hilt-injected) that:
  - Persists the FCM token in DataStore and syncs to server (`POST /v1/device/fcm`).
  - On message, upserts into Room and posts the notification via same channels as T-A6-03 (single code path).
- **T-A7-03** Server-side: when a reminder/response fires, it fan-outs to web push, email (if attached), and FCM (if token registered). All channels are best-effort — failure of one doesn't fail the event.

### Phase A8 — Email magic link + reclaim
- **T-A8-01** Email-entry screen using the same `/v1/auth/email/request-code` endpoint.
- **T-A8-02** Android App Links intercepts the magic-link URL (`https://naweagree.com/auth/verify?code=…`) and calls verify; session/email is attached to the deviceKey.
- **T-A8-03** After verification, "My plans" can pull plans across devices where this email was the creator.

### Phase A9 — Accessibility & localisation (G7/G8)
- **T-A9-01** All content descriptions (especially status badges and icon buttons); touch targets ≥48dp.
- **T-A9-02** TalkBack navigation tested end-to-end on key flows (create → respond → confirm).
- **T-A9-03** `values-pcm/strings.xml` maintained in lockstep with `values/strings.xml`; CI lint checks every `R.string.*` has a Pidgin translation (via a small node script run in turbo).
- **T-A9-04** Dark + light + dynamic color; font scale respected (no hardcoded sp sizes that don't scale); support for large text (test at 1.5x).
- **T-A9-05** Edge-to-edge support using `enableEdgeToEdge()` + insets; navbar drawn behind status bar.

### Phase A10 — Performance & battery
- **T-A10-01** Baseline Profile generated at release time (BaselineProfileRule) for cold start & navigation.
- **T-A10-02** Image vector assets only (no bitmaps) where possible; app bundle size target: <10 MB download on APK.
- **T-A10-03** R8 full mode in release; no Kotlin-reflect; Kotlinx Serialization uses generated serializers.
- **T-A10-04** Polling backoff: increase interval from 15s (foreground) to 60s (background) to 30 min (WorkManager); respect battery-saver (poll interval ≥2h when battery saver on).

### Phase A11 — Tests & QA (G13)
- **T-A11-01** Unit tests:
  - JUnit4 + Turbine for Flows; mockwebserver for OkHttp.
  - Repository tests against an in-memory Room DB.
  - Outbox retry/conflict rules.
  - Deep-link token extraction.
- **T-A11-02** Compose UI tests (`createComposeRule`):
  - New-plan form validation.
  - Invite flow (name required → actions enabled).
  - Creator view status rendering.
  - Offline banner visibility under fake connectivity.
- **T-A11-03** Contract tests: same OpenAPI-driven types as web keep the Android client in lock-step; breaking change fails CI on both sides.
- **T-A11-04** Pre-launch report on Play (Firebase Test Lab) on a matrix of low-end and high-end devices.

### Phase A12 — Release
- **T-A12-01** Play Console: closed alpha → open beta → production, Nigeria-first rollout.
- **T-A12-02** Signing: Play App Signing enabled; upload keystore kept in CI secrets (GitHub Actions), never in repo.
- **T-A12-03** Store listing: English + Pidgin copy; screenshots on light/dark themes; feature graphic; privacy policy URL (same as web).
- **T-A12-04** Content rating questionnaire filled for "Social / Communication" (NaWeAgree doesn't host UGC at scale, but it's person-to-person, so appropriate rating).
- **T-A12-05** Data safety form: we collect names, email (optional), message content, approximate IP-derived location for rate-limiting — all disclosed accurately, with NDPR/GDPR notes.
- **T-A12-06** Crash reporting via Crashlytics (opt-in prompt on first launch per Play policy).

---

## 5. Cross-cutting (T-X)

- **T-X01** — Monorepo ergonomics: turbo pipelines for `build/test/lint/typecheck`; Android added to turbo pipeline via `turbo run :app:assembleDebug` gradle invocation.
- **T-X02** — CI on GitHub Actions: matrix (web, api, android) with caching; preview deployments to Vercel on every PR.
- **T-X03** — Secrets: Cloudflare secrets, Neon URL, Resend key, VAPID keys, FCM server key, Sentry DSN all stored in GitHub Actions secrets and Vercel/Cloudflare env stores; **never** in the repo. A `.env.example` documents what's needed.
- **T-X04** — Local dev: `pnpm dev` starts API (wrangler), Web (next), and prints the URLs; Android dev runs against the local API via `adb reverse tcp:8787 tcp:8787` so `10.0.2.2`/`localhost` both work.
- **T-X05** — Design-token build runs before any platform build; CI fails if the committed `tokens.css`/`Colors.kt` drift from source (checked via a tiny `check:tokens` script).
- **T-X06** — Docs:
  - `README.md` stays product-focused;
  - `DEVELOPMENT.md` for onboarding;
  - `PRIVACY.md`, `TERMS.md`, `SECURITY.md`;
  - `docs/architecture.md`, `docs/api.md` (OpenAPI rendered), `docs/app-links.md`, `docs/data-model.png`.
- **T-X07** — Accessibility audit in CI (Lighthouse for web; Treelo/lint for Android) before every release; ≥4.5:1 contrast enforced by the design-token contrast script (already stubbed in `packages/design-tokens/scripts/check-contrast.js`).
- **T-X08** — NDPR compliance: data processing register in `docs/ndpr.md`; lawful basis = consent at plan-creation time; deletion SLA = 30 days; a named data-protection contact in the privacy page.
- **T-X09** — Abuse / harassment: report-abuse flow (T-W12-02); rate-limited nudge (T-W4-03); per-token response rate limit (max 30 responses per hour per token); server-side word-list for the most obvious harassment patterns (transparent to users — we don't scan or moderate content, just flag extreme cases for manual review).

---

## 6. Delivery order (12-week milestone view)

| Week | Web / API | Android | Cross-cutting |
|------|-----------|---------|---------------|
| 1 | **W1** finish (creator-view, E2E smoke) | A0 skeleton (done) | repo ergonomics |
| 2 | **W2** Neon/Kysely persistence, schema, identity (deviceKey), migration runner | A1 core shell + theme + nav | token-strategy doc, secrets onboarding |
| 3 | W2 finishes + W3 version diff/conflict/reasons | A2 network + repo + Room schema | OpenAPI v1 drafted |
| 4 | W3 finishes + start W4 reminders (cron + logic) | A3 offline cache + outbox | CI: web + api + android matrix green |
| 5 | W4 reminders (nudge, stalled, muting) | A4 App Links + deep links | design-token a11y enforcement (contrast check in CI) |
| 6 | W5 email magic link + W6 web push | A5 share intents | E2E Playwright for web; mockwebserver for Android |
| 7 | W7 signed receipt (image/PDF/JSON) | A6 WorkManager polling + local notifications | public `/j/<token>/og.png` dynamic OG image |
| 8 | W8 i18n (en + pcm-NG) | A7 FCM push | Pidgin strings review with a native speaker |
| 9 | W9 export/delete/NDPR; privacy+terms pages | A8 email magic link + reclaim | data processing register, privacy policy live |
| 10 | W10 IndexedDB outbox + offline hardening | A9 a11y (TalkBack, 48dp targets, font scale) | Lighthouse a11y=100 green |
| 11 | W11 observability (Sentry, health, Web Vitals) | A10 performance (baseline profile, R8, battery) | load test (k6) on API; crash reporting wired |
| 12 | W12 legal/abuse/reset-link/expiry; W13 tests complete; W14 launch prep | A11 tests + A12 Play beta rollout | closed alpha launch to ~50 Nigerian users for feedback |

Post-launch: W12 SMS (Termii), analytics, multi-plan folders, recurring plans
("every Friday"), downloadable WhatsApp-sticker receipt — all strictly after
the core loop is stable and receipts are trusted.

---

## 7. Invariants the plan enforces (and how)

| README invariant | Where it's enforced |
|------------------|---------------------|
| Bot never agrees for anyone | No code path sets `decision=agree` except a participant action; scheduler only sends reminders, never acks; tests cover this in T-W13-01. |
| Consent is per-version | `acks` is keyed by (participant, version); new version inserts new version row; old acks are not consulted when computing CONFIRMED (only current-version acks). |
| Silence ≠ consent | Status stays PENDING_RESPONSE/TALKING until both explicitly agree; scheduler marks STALLED, never CONFIRMED, after reminder exhaustion. |
| Everyone sees the same version | Server is source of truth; clients don't merge locally; optimistic concurrency (409) prevents forks from becoming invisible. |
| No AI auto-replies | No LLM calls on response paths; the only AI-adjacent work is tooling (design-token generation, type generation) — not user-facing text. |
| Pidgin-first | Both en and pcm-NG live in the same locale files/resource directories; Pidgin is a visible option in the top nav / settings, not hidden in a menu; CI blocks PRs that add a string without a Pidgin translation. |

---

## 8. Risks & mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Neon Postgres latency from Workers (cold connections) | Slow invite loads | Use Neon's pooling proxy; Kysely with tagged `sql` queries; keep reads simple; cache plan snapshots in Workers KV for 5s where safe (with SWR). |
| Email delivery to Nigerian inboxes (corporate spam filters) | Reminders don't arrive | SPF/DKIM/DMARC via Resend; keep email content plain; fallback to push + in-app; SMS only as a paid escalation post-launch. |
| Pidgin translation quality | Pidgin comes out as "Google Translate Pidgin" | Partner with at least two native speakers for review (not automated); ship strings as JSON they can PR directly. |
| FCM token churn / delivery on Chinese OEMs (Xiaomi, Tecno, Infinix) which kill background work | Android notifications don't show | Document battery-exemption opt-in in Settings; local WorkManager notifications as fallback; keep foreground polling short. |
| Token leaks via browser history / server logs | Strangers can read plans | Strip `?token=` from URL post-load (T-W2-04); never log tokens; provide reset-link (T-W12-03); short TTL option; consider optional 4-digit "access code" layer for sensitive plans (backlog). |
| Abuse/harassment via create-job spam | Cost + brand damage | Strict IP + deviceKey rate limits on create-job (5/h per IP, tightened); Cloudflare Turnstile on new-plan page if abuse spikes; report-abuse inbox. |
| NDPR compliance | Legal exposure | T-X08 data register; export/delete flows; only collect what's needed; no third-party analytics except self-hosted Plausible; clear privacy policy. |
| Monorepo build time | Dev friction | Turbo remote cache (Vercel); strict pipeline (`api^build`, `web^build`, `android^build`); Android built only when Android files change. |
| Play Store rejection | Launch delay | Early closed alpha; complete data-safety form; prompt for POST_NOTIFICATIONS and Crashlytics opt-in contextually; follow Families policy if we ever allow under-18 (post-launch decision). |

---

## 9. Definition of done for MVP (web + Android beta)

- [ ] Core loop works on web and Android: create → share → respond → propose → agree → confirmed → receipt.
- [ ] Persistence survives API restarts (Neon).
- [ ] Reminders fire via in-app, email (if attached), web push (web) / FCM (Android).
- [ ] Creator and recipient both see who changed what and why, on every version.
- [ ] Conflict (concurrent proposes) resolves cleanly with no lost edits.
- [ ] Offline: you can open a recently loaded plan and queue a response; it sends on reconnect.
- [ ] Receipt is signed and shareable as image/PDF/JSON.
- [ ] English + Pidgin complete; Pidgin reviewed by native speakers.
- [ ] Privacy policy, terms, contact, report-abuse live.
- [ ] Export/delete flows working (NDPR).
- [ ] WCAG 2.1 AA (web) + TalkBack usability (Android).
- [ ] ≥90% test coverage on API domain logic; Playwright happy-path + conflict + offline E2E on web; compose happy-path tests on Android.
- [ ] Sentry wired for web/API; Crashlytics for Android; p95 invite load < 1.5s on 4G Nigeria.
- [ ] App Links verified; share-in and share-out working; install-the-app banner on web for Android visitors.
- [ ] Closed beta with ~50 real users (Nigeria) for at least 2 weeks before public launch.

---

_Feedback welcome. Everything above is scoped so that a single engineer (plus
native-speaker translation help and design review) can ship a trustworthy
web + Android MVP inside 12 weeks._
