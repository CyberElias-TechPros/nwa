# Deliverables shipped (post-merge of PR #1)

Working branch: `arena/b1bedb4e-nwa` (based on `main` @ `7a02b2d`).
Everything in this document builds (`pnpm build`, 9/9 packages), type-checks
(`pnpm typecheck`, 0 errors), lints (`pnpm lint`, 0 errors — one intentional
Next.js font warning because we load fonts via `<link>` for sandbox egress),
and passes tests (`pnpm test`, 50/50 across 10 files).

## API (`apps/api`) — Hono / Cloudflare Workers

- **Signed receipts (T-W6, gap G6).** `src/modules/receipts/`
  - `GET /v1/jobs/:id/receipt` → signed JSON receipt (only available once
    mutually acknowledged; participant must be on the plan).
  - `GET /v1/jobs/:id/receipt.txt` → human-readable plaintext receipt with
    signature footer (WhatsApp / screenshot friendly).
  - `POST /v1/receipts/verify` → verifies an uploaded receipt against HMAC key.
  - HMAC-SHA-256 (`HS256`) with per-environment `RECEIPT_SECRET`; dev fallback
    secret is flagged `"dev": true` so it can never be mistaken for a
    production signature. Canonical JSON (sorted keys), `kid` for key
    rotation, tamper detection tested.
- **Abuse reporting (gap G27).** `src/modules/abuse/routes.ts`
  - `POST /v1/abuse/report` — structured report with reason enum, free-text
    description, optional job ID/link, optional contact. Returns a tracking
    id a human can follow up on. Memory adapter persists; Postgres adapter
    has a clear "needs migration" stub.
- **NDPR / GDPR privacy requests (gap G29).** `src/modules/privacy/routes.ts`
  - `POST /v1/privacy/requests` — `export` or `delete`. Synchronous in the
    memory adapter (export is immediately `ready`, delete anonymises names
    and unbinds device keys); async-ready interface for Postgres/Workers.
  - `GET /v1/privacy/requests` — list your own requests (bound to device key).
  - `GET /v1/privacy/requests/:id` — download an export as JSON attachment.
- **`/v1/ready`** now reports the active storage backend (`memory` vs
  `postgres`), receipt-secret status (`configured` vs `dev-secret`), queue
  status, scheduler cadence, and product limits (max plan length, invite
  TTL, nudge/stalled thresholds).
- **Repository port (`src/db/repository.ts`)** extended with `backend` tag,
  abuse and privacy methods, and matching memory / pg adapters.
- **Tests** added for receipts (canonicalisation, sign+verify round trip,
  tamper detection, mutual-ack gated download, non-participant blocked,
  TXT receipt), abuse, and privacy — 39 API tests up from 30.

## Web (`apps/web`) — Next.js 15 App Router

- **New pages (all on-brand with design-system v2):**
  - `/r/verify` — receipt-verification UI (paste JSON → signature check →
    shows plan title / version / mutual-ack timestamp or a clear "not
    recognised" error).
  - `/privacy/requests` — NDPR self-service (export / delete, lists your
    requests, downloads exports as JSON, talks to API via BFF proxy).
  - `/safety/report` — abuse-report form (reason radio group, description,
    optional job link, optional contact; success state with reference id).
- **BFF proxy** (`next.config.mjs` rewrites) so the browser never needs CORS
  against the API directly: `/api/proxy/:path*` → `http://127.0.0.1:8787/:path*`
  (dev) / production API (set `NWA_API_URL`).
- **Outbox queue (T-W10, gap G19).** `src/lib/outbox.ts` + `use-outbox.ts`:
  queues non-GET requests in `localStorage` when offline, replies
  exponential-backoff, Idempotency-Key header, drops 4xx (permanent failures)
  with a console warning, drains on `online` event and shortly after page
  load. `OutboxBanner` (mounted in `layout.tsx`) shows "You're offline" /
  "Sending N saved responses" sticky banner.
- **Accessibility:** skip-to-content link (`.skip-link`), focus-visible
  outlines on buttons already in design system, 48px touch targets preserved.
- **Not-found and error pages** upgraded from plain text to full design-system
  treatments with contextual CTAs.
- **Footer** expanded with links to Verify Receipt, Your Data (NDPR), and
  Report Abuse. Safety page now shows a direct "Report a problem" CTA.
- **Offline page** redesigned with clear "what works offline" list.
- **CSS utilities** added: `.display-title`, `.eyebrow`, `.lead`, `.btn-primary`,
  `.btn-danger`, `.btn.link`, `.offline-banner`, `.skip-link`, `code` styling.
- **i18n (`packages/i18n/locales/*.json`)** expanded from 15 to 73 keys each,
  covering all new pages, statuses, CTAs, and NDPR/abuse/principles copy in
  both English-NG and Pidgin. Keys are verified to match 1:1 by a new web
  test (`i18n.test.ts`).
- **Build result:** 17 routes (was 16), first-load JS ≤ 117 kB, shared
  chunk ≤ 100 kB. All 17 routes smoke-test 200.

## Android (`apps/android`) — Kotlin + Jetpack Compose + Hilt

Existing T3 auth scaffold (DeviceKeyStore, OkHttp interceptor, App Links,
Hilt NetworkModule, MainActivity deep-link routing) preserved and extended
with runnable Compose UI stubs for W6/W9 screens:

- `NwaTheme` using auto-generated `NwaColors` from `packages/design-tokens`
  (burnt-orange primary, ankara-inspired palette, light + dark schemes).
- Multi-screen NavHost with bottom tabs (My plans / Start plan / Settings)
  and FAB, deep-link handling for `https://naweagree.app/j/<token>` (and
  `.com` / `www.` variants — matches the autoVerify intent filter in the
  manifest).
- **Plan list** (`PlanListScreen`) with offline banner, empty state, status
  chips, FAB to start a new plan, and click-through to plan detail.
- **Plan detail** (`PlanDetailScreen`) — version card, people list with
  reviewed/awaiting chips, "What we agreed" fields, response buttons
  (Agree / Question / Need time / Disagree), receipt download (enabled
  when mutually acknowledged), reset invite and share actions.
- **Settings** tabs expose Verify receipt, Privacy (NDPR export/delete),
  and Report abuse screens, plus an Offline screen stub.
- Added `material-icons-extended` dependency; colors.xml rewritten to match
  design tokens; themes.xml updated with brand status bar.
- Note: I did not run `./gradlew assembleDebug` — no Android SDK is present
  in this sandbox. The code is written against the existing Compose BOM
  / navigation-compose / Hilt versions in `build.gradle.kts` and should
  compile cleanly once the SDK is available.

## Admin (`apps/admin`) — Next.js

The placeholder admin page is now a W15 trust-and-safety dashboard
documenting health, abuse, NDPR, receipts, scheduler, and rate-limit
endpoints plus the production wiring checklist (Neon, RECEIPT_SECRET,
SCHEDULER_SECRET, cron 09:00 UTC, Resend/FCM deferred until vendor keys).

## Docs

- `docs/09-deliverables.md` (this file) is a per-module changelog of what
  shipped in this batch.

## Remaining backlog (external dependencies required)

These are intentionally *not* done because each needs a secret or outbound
networking that this sandbox cannot provide. Everything else on the
W5–W12 solo-executable list in `docs/08-ultra-granular-todo.md` is either
shipped or stubbed at a level that unblocks follow-up work.

- **Email magic link (W5):** needs Resend API key + sending domain.
- **FCM push (W7):** needs Firebase project + `google-services.json`.
- **Postgres migrations for abuse/privacy (W9):** needs Neon egress (the
  pg adapter is already wired and falls back cleanly to memory).
- **Play Store upload (W12):** needs Play developer account + signing keys.
- **OG image PNG (marketing polish):** the SVG icon is done; a PNG export
  is a design-asset step.
- **Sentry / analytics:** needs DSN tokens.
