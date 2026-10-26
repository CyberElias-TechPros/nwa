# 02 — Web Application Plan (Next.js PWA)

**Scope:** the browser client for NaWeAgree — the public site, the job workspace, the PWA shell, the BFF, and the browser-side sync engine.
**Companion:** `01-master-app-plan.md` (domain, API, sync rules), `03-android-app-plan.md` (native client parity).
**Status:** Delivery baseline v1.0 · 21 October 2026.

---

## Contents

1. [Objectives and non-goals](#1-objectives-and-non-goals)
2. [Supported browsers and devices](#2-supported-browsers-and-devices)
3. [Stack and technology choices](#3-stack-and-technology-choices)
4. [Application architecture](#4-application-architecture)
5. [Route and screen inventory](#5-route-and-screen-inventory)
6. [Component and design-system plan](#6-component-and-design-system-plan)
7. [State management](#7-state-management)
8. [Offline, PWA, and the browser sync engine](#8-offline-pwa-and-the-browser-sync-engine)
9. [Web Share Target: intake from WhatsApp](#9-web-share-target-intake-from-whatsapp)
10. [Data layer and API client](#10-data-layer-and-api-client)
11. [Forms, validation, and autosave](#11-forms-validation-and-autosave)
12. [Authentication and session UX](#12-authentication-and-session-ux)
13. [Accessibility implementation plan](#13-accessibility-implementation-plan)
14. [Performance engineering](#14-performance-engineering)
15. [Web security](#15-web-security)
16. [Internationalization and content](#16-internationalization-and-content)
17. [Analytics and error reporting](#17-analytics-and-error-reporting)
18. [Notifications on web](#18-notifications-on-web)
19. [Testing strategy](#19-testing-strategy)
20. [Build, CI/CD, and deployment](#20-build-cicd-and-deployment)
21. [Observability](#21-observability)
22. [Sprint plan with exit criteria](#22-sprint-plan-with-exit-criteria)
23. [Definition of done and quality budget](#23-definition-of-done-and-quality-budget)
24. [Risks specific to web](#24-risks-specific-to-web)

---

## 1. Objectives and non-goals

### 1.1 Objectives

1. A first-time user on a ₦40,000 Android phone over 3G can create a job and share it in **under 3 minutes**, without installing anything.
2. A second participant can open a WhatsApp link, understand what is being shared, verify, and acknowledge a specific version — with no app store, no password, and no account setup maze.
3. The browser never shows a state the server does not hold. Offline is a visible, honest mode.
4. Content pasted or shared from WhatsApp can become a structured draft with one tap.
5. The same URLs work as a landing page, an app, and a printable record.

### 1.2 Non-goals (web)

- Feature parity with Android for background capture, long recordings, or offline media upload.
- Native-quality push reliability (that is Android's job).
- Admin console inside the user app (separate deployment, separate auth, separate origin).
- Full document editing, contracts, e-signatures, payments.
- Desktop-first density. Desktop is a supported secondary experience, not the design target.

### 1.3 Primary journeys the web must nail

| # | Journey | Success measure |
|---|---|---|
| J1 | Provider creates a job from a WhatsApp conversation and invites the customer | < 3 min, ≤ 3 taps per field, no typing of details already in the paste |
| J2 | Customer opens invite link on mobile, verifies, reviews, acknowledges | ≥ 70% of opened invites reach review screen |
| J3 | Either party proposes a change and the other responds | < 60 s to complete a response |
| J4 | Both parties check history after work starts | History reachable in ≤ 2 taps from job |
| J5 | A user on a broken connection keeps editing without losing work | Zero lost edits in chaos tests |

---

## 2. Supported browsers and devices

| Tier | Browsers | Support level |
|---|---|---|
| Tier 1 | Chrome Android ≥ 112, Samsung Internet ≥ 21, Safari iOS ≥ 16.4, Chrome/Edge desktop ≥ 112 | Full features, tested every release |
| Tier 2 | Firefox ≥ 115, Opera Mini extreme mode (read-only fallback), Android WebView ≥ 112 | Core flows, graceful degradation |
| Tier 3 | Older browsers, in-app browsers (Facebook/Instagram), UC Browser | Server-rendered read/ack path, no offline, clear banner |

Explicit handling of in-app browsers (very common when opening WhatsApp links):

- Detect via UA and feature-detect for `navigator.share`, `caches`, `indexedDB`.
- If offline APIs are missing: run in "lite mode" (no service worker, no local queue, immediate server calls, explicit "needs internet" states).
- Provide "Open in Chrome" guidance when `window.navigator.userAgent` indicates a restricted WebView.
- Never depend on `BroadcastChannel`, `Background Sync`, or `Notification` for core actions.

Device baseline for performance testing: Android Go-class device (2 GB RAM, 4 cores), 3G Fast (400 kbps, 400 ms RTT), 360×640 CSS px, 200% font scale.

---

## 3. Stack and technology choices

| Concern | Choice | Why | Alternative rejected |
|---|---|---|---|
| Framework | **Next.js 15 App Router**, React 19, TypeScript strict | RSC for fast first paint, route handlers for BFF, mature PWA story | Vite SPA (worse first load, no server boundary) |
| Styling | **CSS Modules + design tokens as CSS variables** | No runtime cost, works with RSC, no atomic-CSS lock-in | Tailwind (fine, but token-first is clearer for a11y auditing) |
| Primitives | **Radix UI primitives** (unstyled) + own styles | Accessibility behaviour for dialog/menu/tabs is hard to get right | Fully custom (a11y risk) |
| Data fetching | **TanStack Query v5** for client cache + server actions for mutations | Cache, retries, optimistic updates, offline integration | SWR (weaker mutation model) |
| Forms | **React Hook Form + Zod** (shared schemas from `packages/contracts`) | Small, uncontrolled, good a11y story, same schema as server | Formik (heavier) |
| Local persistence | **IndexedDB via `idb`** (typed wrapper) | Structured, large, transactional; used for queue + cache | localStorage (sync, 5 MB, blocking) |
| Service worker | **Serwist** (Workbox-compatible) with custom sync worker | Precaching + runtime strategies + typed routes | Hand-rolled SW (error-prone) |
| i18n | `next-intl` + ICU messages in `packages/i18n` | RSC-compatible, plural-safe | Custom (plural bugs) |
| Testing | Vitest, Testing Library, **Playwright** (multi-context), axe-core, Lighthouse CI | Two-user E2E is essential for this product | Cypress (weaker multi-origin/multi-user) |
| Error tracking | Sentry (browser + server), PII scrubbing | Source maps, release health | Console-only (unacceptable) |
| Analytics | Self-hosted, event-allowlist proxy (PostHog EU or Plausible custom events) | No content capture, EU hosting, opt-out | GA4 (data governance risk) |
| Feature flags | Own table + edge config, no client SDK secrets | Auditability, per-job kill switches | Third-party flag SDK |
| Package manager | pnpm workspaces + Turborepo | Shared packages, cached builds | npm workspaces (slower) |

No CSS-in-JS runtime, no icon fonts (inline SVG only), no third-party chat widget, no session-replay tooling (would capture content).

---

## 4. Application architecture

### 4.1 Layers

```text
app/                     route segments, layouts, RSC pages
  (marketing)/           public, static, SEO
  (auth)/                sign-in, verify, invite redemption shell
  (app)/                 authenticated shell, job workspace
  api/                   BFF route handlers (session ↔ API translation)
features/
  job/ brief/ version/ change/ question/ invite/ media/ settings/
components/
  ui/         primitives (Button, Field, Dialog…)
  domain/     JobStatusBadge, BriefField, DiffView, AckPanel…
  layout/     AppShell, MobileTabBar, PageHeader
lib/
  api/        generated client + wrapper (auth, errors, retries)
  db/         IndexedDB schema + repositories
  sync/       command queue, executor, conflict resolver
  auth/       session helpers (server-only)
  analytics/  typed event allowlist
  format/     money, dates, units (locale-aware, raw-preserving)
  flags/      feature flag resolution
messages/     en-NG.json, pcm.json
```

Rules:

- **No fetch in components.** Data comes from RSC loaders or TanStack Query hooks that call `lib/api`.
- **No business rules in the client.** Status derivation, permission checks, and conflict rules are mirrored only for UX and always re-verified by the server.
- **No secret in the client.** The API base URL is proxied through `/api/*`; the browser never sees an API key or an internal host.
- **Route handlers stay thin**: authenticate, validate, forward, map errors. Business logic lives in `services/api`.

### 4.2 Rendering strategy per route

| Route group | Strategy | Notes |
|---|---|---|
| Marketing | Static (ISR hourly) | No personalization; fast LCP; SEO |
| Auth | Static shell + client form | No PII in HTML |
| Invite preview | Server-rendered, `no-store` | Minimal metadata; redacted server-side |
| Job workspace | Server shell + client cache hydration | Skeleton from RSC, data via `/api/jobs/:id` with ETag |
| Settings | Server shell + client | |
| Error/404 | Static | |

### 4.3 BFF contract

```ts
// app/api/_proxy.ts (concept)
export async function proxy(req: Request, path: string) {
  const session = await getSession();              // httpOnly cookie
  if (!session && !isPublic(path)) return unauthorized();
  const res = await fetch(`${env.API_URL}${path}`, {
    method: req.method,
    headers: {
      authorization: `Bearer ${await mintServiceToken(session)}`, // short-lived, server-to-server
      'content-type': 'application/json',
      'idempotency-key': req.headers.get('idempotency-key') ?? crypto.randomUUID(),
      'if-match': req.headers.get('if-match') ?? '',
      'x-request-id': req.headers.get('x-request-id') ?? crypto.randomUUID(),
    },
    body: req.method === 'GET' ? undefined : await req.text(),
    signal: AbortSignal.timeout(15_000),
  });
  return new Response(res.body, { status: res.status, headers: safeHeaders(res) });
}
```

The BFF never exposes upstream error text; it maps to the shared error envelope. Service tokens are minted per request with the user's ID and a 60-second TTL, so a leaked token is short-lived and cannot be replayed.

### 4.4 Directory sketch

```text
apps/web/
├─ app/
│  ├─ (marketing)/page.tsx
│  ├─ (marketing)/how-it-works/page.tsx
│  ├─ (marketing)/privacy/page.tsx
│  ├─ (auth)/sign-in/page.tsx
│  ├─ (auth)/verify/page.tsx
│  ├─ invite/[token]/page.tsx
│  ├─ (app)/layout.tsx
│  ├─ (app)/jobs/page.tsx
│  ├─ (app)/jobs/new/page.tsx
│  ├─ (app)/jobs/[jobId]/page.tsx
│  ├─ (app)/jobs/[jobId]/brief/page.tsx
│  ├─ (app)/jobs/[jobId]/versions/[versionId]/page.tsx
│  ├─ (app)/jobs/[jobId]/changes/page.tsx
│  ├─ (app)/jobs/[jobId]/changes/[changeId]/page.tsx
│  ├─ (app)/jobs/[jobId]/questions/page.tsx
│  ├─ (app)/jobs/[jobId]/history/page.tsx
│  ├─ (app)/jobs/[jobId]/people/page.tsx
│  ├─ (app)/jobs/[jobId]/files/page.tsx
│  ├─ (app)/jobs/[jobId]/closeout/page.tsx
│  ├─ (app)/templates/page.tsx
│  ├─ (app)/settings/page.tsx
│  ├─ (app)/settings/notifications/page.tsx
│  ├─ (app)/settings/privacy/page.tsx
│  ├─ manifest.webmanifest/route.ts
│  ├─ share-target/route.ts
│  ├─ ~offline/page.tsx
│  └─ api/…
├─ features/…
├─ components/…
├─ lib/…
├─ public/icons/…
├─ sw.ts
└─ tests/{unit,integration,e2e,a11y}
```

---

## 5. Route and screen inventory

### 5.1 Public

| Route | Purpose | Key requirements |
|---|---|---|
| `/` | Landing: problem, 3-step explanation, example plan card, CTA | LCP < 2.0 s, no fake stats or testimonials |
| `/how-it-works` | Deeper explanation, acknowledgement semantics, AI transparency | Static, printable |
| `/privacy` | Plain-language privacy summary + full notice | Links to data rights |
| `/accessibility` | Conformance statement, known limitations, contact | Honest, dated |
| `/help` | FAQ: "Is this a contract?", "Do both need accounts?", "What does AI do?" | Search-free, short answers |
| `/invite/:token` | Redacted preview → verify → join | Expired/revoked/wrong-token states; no content before auth |
| `/sign-in`, `/verify` | OTP / magic link | Autofill, resend timer, no enumeration |
| `/offline` | Offline shell | Explains local-only state |
| `/*` (unknown) | 404 with recovery | No job data leaked |

### 5.2 Authenticated

| Route | Purpose | Primary actions |
|---|---|---|
| `/jobs` | Home: needs-action queue, active, recent | Create, open, filter by role/status |
| `/jobs/new` | Create: category/template, title, paste/share intake | Save draft, continue |
| `/jobs/:id` | Overview: status, current version, ack checklist, next action | Review, ask, propose change, share |
| `/jobs/:id/brief` | Editable draft / current brief by field group | Edit, mark not decided, resolve conflicts |
| `/jobs/:id/versions/:vid` | Immutable version view | Acknowledge, ask, compare |
| `/jobs/:id/changes` and `/changes/:cid` | List and diff detail | Accept, reject, question, need time |
| `/jobs/:id/questions` | Open/answered | Ask, respond, defer |
| `/jobs/:id/history` | Activity timeline with filters | Inspect, export |
| `/jobs/:id/people` | Participants, roles, invites | Invite, revoke, copy link |
| `/jobs/:id/files` | Attachments and sources | View, add, remove |
| `/jobs/:id/closeout` | Report completion / follow-up / pause / cancel | Submit own statement |
| `/templates` | Category templates | Preview fields, start |
| `/settings`, `/settings/notifications`, `/settings/privacy` | Account, devices, AI opt-out, export, delete | Manage |

### 5.3 Route behaviour rules

- Every authenticated route supports direct load, refresh, and back/forward with correct scroll restoration.
- Unknown `jobId` → 404 page with "Back to my jobs", **never** a redirect into another job.
- Unauthorized deep link → sign-in with `returnTo`, then the exact target, validated against an internal allowlist (no open redirect).
- Unsaved-changes guard on navigation away from the brief editor (dialog with Save draft / Discard / Stay).
- All consequences requiring confirmation use a dialog naming the exact version/action.
- Mobile: bottom tab bar (Jobs, Questions, Changes, History) inside a job; desktop: sidebar + content column.
- URL is the source of truth for tab/filter state (`?tab=`, `?filter=`, `?version=`), so links are shareable.

---

## 6. Component and design-system plan

### 6.1 Token pipeline

```text
packages/design-tokens/tokens.json
  → build script → apps/web/styles/tokens.css (CSS variables)
                  → apps/android/.../Theme.kt (Compose)
```

Token groups: colour (semantic only — `bg`, `surface`, `text`, `text-muted`, `primary`, `primary-hover`, `success`, `warning`, `danger`, `border`, `focus`), spacing scale (4-based), radii, typography (size/line-height/weight), elevation (borders preferred), motion durations, z-index.

Rules:

- Components consume **semantic** tokens, never raw hex.
- Every foreground/background pair is contrast-tested in CI (script reads tokens and asserts ≥ 4.5:1 for body text, ≥ 3:1 for large text and UI).
- Dark mode is a token set, not a filter; ship it after MVP but reserve the variables now.
- Status colours are always paired with a label and icon (never colour-only).

### 6.2 Component inventory

**Primitives (a11y-owned, built on Radix where interaction is complex):** Button (5 variants × 4 states), IconButton, Link, Field (label/hint/error), TextInput, Textarea (with character count), Select, RadioGroup, Checkbox, Switch, Combobox, Dialog, Sheet, Popover, Tooltip (supplementary only), Tabs, Menu, Toast/LiveRegion, InlineAlert, Badge, Skeleton, Spinner, Progress, Avatar/Initials, Pagination/LoadMore, Breadcrumbs, Accordion, SegmentedControl.

**Domain:** `JobStatusBadge`, `JobCard`, `NextActionCard`, `ParticipantRow`, `AckChecklist`, `VersionHeader`, `VersionTimeline`, `FieldGroup`, `BriefField`, `FieldStateBadge`, `SourceAttribution`, `ConflictCard`, `DiffView` (text-first before/after), `ChangeSummary`, `ResponseActions`, `QuestionCard`, `Composer`, `AttachmentCard`, `UploadProgress`, `SyncStatusBar`, `OfflineBanner`, `PlanCardPreview`, `ExportMenu`, `DangerZone`, `AiDisclosure`, `DraftSuggestionPanel`, `ReadAloudButton`.

Every component ships with:

- states: default, hover, focus-visible, active, disabled, loading, error, empty, read-only;
- keyboard behaviour documented in a comment and covered by a test;
- an a11y test asserting role/name/value;
- a Storybook-style page (internal route `/__ui` in non-prod) for visual review.

### 6.3 Status presentation (critical for comprehension)

| Domain status | UI label | Icon | Copy hint |
|---|---|---|---|
| `draft` | Private draft | pencil | "Only you can see this" |
| `invited` | Waiting for the other person | clock | "They haven't opened it yet" |
| `clarification_needed` | Some details are still open | alert | "3 things need a decision" |
| `ready_for_review` | Ready for review | eye | "Not agreed yet" |
| `partially_acknowledged` | One person has reviewed | half-circle | "Waiting for [name]" |
| `mutually_acknowledged` | Both reviewed this version | check | "You both reviewed version 3" |
| `in_progress` | Work in progress | tool | |
| `completion_review` | Reported finished | flag | "One report, waiting for the other" |
| `completed` | Finished | check-circle | |
| `paused` / `cancelled` / `archived` | Paused / Cancelled / Archived | neutral | |

Never render a green "confirmed" claim when only one party has acted. Never show a percentage-style completion.

---

## 7. State management

### 7.1 Layer ownership

| Layer | Owner | Contents | Lifetime |
|---|---|---|---|
| Server state | TanStack Query | job aggregate, versions, changes, questions, activity | While mounted + persisted snapshot for offline |
| Local draft | React Hook Form + IndexedDB persistence | unsaved field edits | Until publish or discard |
| Command queue | IndexedDB + custom store | pending offline mutations | Until server ack or user resolution |
| UI state | URL + local component state | tabs, filters, dialogs | URL survives refresh |
| Session | httpOnly cookie + `/api/me` | identity, capabilities | Server-controlled |
| Flags | server-rendered prop | enabled features | Per request |

### 7.2 Query keys and invalidation

```ts
const keys = {
  me: ['me'] as const,
  jobs: (filter: string) => ['jobs', filter] as const,
  job: (id: string) => ['job', id] as const,
  jobSlice: (id: string, slice: string) => ['job', id, slice] as const,
  versions: (id: string) => ['job', id, 'versions'] as const,
  changes: (id: string) => ['job', id, 'changes'] as const,
  activity: (id: string) => ['job', id, 'activity'] as const,
};
```

- Mutations invalidate the narrowest slice and patch the aggregate optimistically only for low-risk fields (title, question text).
- Acknowledgement, publish, and change responses **never** optimistically flip status; they show a pending state and re-fetch.
- Stale time: jobs list 30 s, job aggregate 10 s, versions 60 s, activity 15 s. `refetchOnWindowFocus` true except during editing.
- On `409 VERSION_CONFLICT`, replace the aggregate from the error `details`, keep the user's draft locally, and open the conflict sheet.

### 7.3 Error boundaries

- Route-level `error.tsx` with a recovery action and a request ID.
- Feature-level boundary around the brief editor (so a rendering bug never loses the draft).
- A global `unhandledrejection` handler that logs a scrubbed event and shows a non-blocking toast.

---

## 8. Offline, PWA, and the browser sync engine

### 8.1 What works offline

| Capability | Offline behaviour |
|---|---|
| View last opened jobs | Yes — snapshot from IndexedDB, marked "Saved copy from <time>" |
| Edit draft fields | Yes — persisted locally, queued |
| Publish version | Queued, requires connection to confirm; explicit "will publish when online" |
| Acknowledge | **Queued but never shown as confirmed**; copy: "We'll record this when you're back online" |
| Propose/respond to change | Queued with `baseVersionId`; conflict resolved on send |
| Upload attachment | Not supported offline (queue metadata only, prompt on reconnect) |
| Ask question | Queued |
| Export / plan card | Requires connection |
| Sign-in | Requires connection (OTP) |

### 8.2 Manifest

```json
{
  "name": "NaWeAgree",
  "short_name": "NaWeAgree",
  "start_url": "/jobs?source=pwa",
  "display": "standalone",
  "background_color": "#f5f7fb",
  "theme_color": "#155eef",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icons/192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "share_target": {
    "action": "/share-target",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url",
      "files": [{ "name": "media", "accept": ["image/*", "application/pdf"] }]
    }
  },
  "shortcuts": [
    { "name": "New job", "url": "/jobs/new" },
    { "name": "Needs my action", "url": "/jobs?filter=action" }
  ]
}
```

### 8.3 Service worker strategies

```ts
// sw.ts (concept — Serwist)
precache: ['/~offline', '/icons/*', '/_next/static/*']   // hashed, immutable
runtimeCaching:
  - /api/jobs/*          → NetworkOnly (never cache API responses in SW)
  - navigation requests  → NetworkFirst, 3 s timeout → /~offline
  - images (R2 signed)   → CacheFirst, 7 days, max 50 MB, 200 entries
  - fonts                → CacheFirst, 1 year, immutable
  - /_next/static        → CacheFirst, immutable
```

Deliberate decision: **API responses are never cached by the service worker.** Offline reads come from an explicit, access-controlled IndexedDB snapshot written by the app. This prevents a shared device from serving stale private data after sign-out and keeps cache invalidation predictable.

### 8.4 IndexedDB schema

```ts
// db v1
jobs:        { key: 'id', indexes: ['updatedAt', 'status'] }
jobCache:    { key: 'id', value: { jobId, aggregate, fetchedAt, jobSeq } }
drafts:      { key: 'jobId', value: { fields, rev, updatedAt, dirty } }
queue:       { key: 'commandId', indexes: ['jobId', 'createdAt', 'state'] }
outboxMeta:  { key: 'k', value: { lastSyncAt, schemaVersion } }
prefs:       { key: 'k', value: { locale, dataSaver, reducedData, readAloud } }
```

- Stores are namespaced per user (`dbName = nwa_u_<userIdHash>`), and the DB is **deleted on sign-out** (after warning if the queue is non-empty).
- `schemaVersion` migration path: on mismatch, offer "keep local work" (export queue as JSON download) or reset.
- Quota: request `navigator.storage.persist()`; on `QuotaExceededError`, evict oldest `jobCache` entries first, never `queue`.
- Use a Web Worker for encryption-at-rest if we add it (WebCrypto AES-GCM with a key derived from a session-held secret); MVP: rely on OS/browser profile isolation and short retention, and state this clearly.

### 8.5 Sync executor

```ts
type Command = {
  commandId: string;         // ULID
  jobId: string;
  type: 'draft.set' | 'version.publish' | 'ack.write' | 'change.create'
      | 'change.respond' | 'question.create' | 'closeout.report' | 'job.title';
  payload: unknown;
  baseVersionId?: string;
  createdAt: string;
  attempts: number;
  state: 'queued' | 'sending' | 'needs_user' | 'failed' | 'done';
};

async function drain(jobId: string) {
  const cmds = await queue.byJob(jobId);           // ordered by createdAt
  for (const cmd of cmds) {
    if (cmd.state !== 'queued') continue;
    const res = await sendWithIdempotency(cmd);
    if (res.ok) { await queue.complete(cmd); continue; }
    if (res.status === 409) { await queue.needsUser(cmd, res.details); break; } // halt job pipeline
    if (res.status === 401) { await queue.pauseAuth(cmd); break; }
    if (res.retryable) { await queue.backoff(cmd); break; }
    await queue.fail(cmd, res); break;
  }
}
```

Triggers: `online` event, visibility change, 30 s interval while visible, after any foreground mutation, and on service worker `message` from sync (where supported).

Concurrency: one drain per job at a time (`navigator.locks.request('sync:'+jobId)`); a global lock prevents double-drain across tabs.

### 8.6 UX of sync state

A persistent, non-intrusive `SyncStatusBar` above the job content:

| State | Text | Action |
|---|---|---|
| online, clean | hidden | — |
| local edits unsent | "Saved on this device. Sending…" | Retry |
| offline with queue | "Offline. 2 changes waiting to send." | View queue |
| needs user | "The plan changed while you were offline." | Review |
| failed permanent | "Couldn't send. <reason>" | Fix / discard |
| auth expired | "Sign in to send 1 change." | Sign in |

Rules: never use a toast as the only signal for a failed consequential action; the bar must persist until resolved.

### 8.7 Install and update

- Custom install prompt after the second visit, with a one-line benefit and dismiss-forever option. Never block the app.
- `beforeinstallprompt` captured and exposed on a settings card; iOS shows "Add to Home Screen" instructions.
- New deployment → SW `waiting` → show "Update available" (never auto-reload during editing).
- Version displayed in settings for support.

---

## 9. Web Share Target: intake from WhatsApp

This is the highest-leverage web feature for adoption (gap G-10).

### 9.1 Flow

```text
WhatsApp → Share → NaWeAgree → POST /share-target
  → store payload in IndexedDB (text, title, url, files) with 1-hour TTL
  → 303 redirect to /jobs/new?from=share
  → Create page shows "We got what you shared" card with:
      • extracted text preview (editable)
      • attached images/PDF thumbnails
      • category suggestion (client-side keyword match, labelled "suggested")
      • "Use this" / "Start blank"
  → On job creation, payload becomes an `input_artifact` and optional attachments
```

Constraints:

- Share target works only on Android Chrome (and some Chromium browsers). Detect and hide the hint elsewhere.
- Files are written to IndexedDB rather than the server until the user creates a job (privacy + avoids orphan uploads).
- Purge the share inbox on create, cancel, sign-out, or after 1 hour.
- Never auto-run AI on shared content; the user chooses.
- If the payload contains a URL only, offer to paste it as a reference; do not fetch remote pages server-side in MVP (SSRF risk).

### 9.2 Paste intake (all platforms)

On `/jobs/new` and in the brief editor, a "Paste what you already wrote" textarea with:

- client-side heuristic highlighting of amounts (`₦80k`, `80,000`), dates (`before month end`, `next Friday`), quantities, and dimensions;
- a "turn into fields" action (manual mapping without AI, deterministic regex + user confirmation), clearly labelled;
- never overwrite existing field values without confirmation.

---

## 10. Data layer and API client

### 10.1 Generated client + wrapper

```ts
// lib/api/client.ts
export async function api<T>(path: string, init: ApiInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: init.method ?? 'GET',
    headers: {
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.idempotencyKey ? { 'idempotency-key': init.idempotencyKey } : {}),
      ...(init.ifMatch ? { 'if-match': String(init.ifMatch) } : {}),
      ...(init.requestId ? { 'x-request-id': init.requestId } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    credentials: 'same-origin',
    signal: init.signal,
  });
  if (!res.ok) throw await ApiError.from(res);
  return res.status === 204 ? (undefined as T) : res.json();
}
```

`ApiError` carries `code`, `message`, `requestId`, `retryable`, `fields`, `details`, and a `userMessage(...)` mapping that is the **only** place error copy is chosen. Unknown codes fall back to a neutral message with the request ID.

### 10.2 Rules

- All mutations require an idempotency key generated at call time (ULID), reused across retries.
- `If-Match` with `jobSeq` on job-scoped writes; the queue stores `baseVersionId` for version-bound writes.
- Timeouts: 15 s default, 30 s for export/AI status, never infinite.
- Retries: only on network error or 5xx, max 3 with jitter; never on 4xx.
- Response validation in development only (`zod` parse of critical aggregates) to catch contract drift early; use generated types in production.
- Images and PDFs are loaded via short-lived signed URLs fetched at render time, not embedded in HTML.

### 10.3 Cache headers from BFF

`GET /api/jobs/:id` → `Cache-Control: private, no-store`, `ETag: "job-<seq>"`. On `If-None-Match` match, return 304 with no body. Client stores the aggregate and `jobSeq`.

---

## 11. Forms, validation, and autosave

### 11.1 Form architecture

- Each brief group is a `react-hook-form` form with a Zod schema generated from the template (field type, requiredness, enum of statuses).
- Field-level validation is instant on blur, on submit aggregated into an error summary at the top with links.
- Validation is **never** used to force field completion. "Not decided yet" is a first-class action, not an empty submission.
- Conditional fields (e.g. `price.condition`) render as sub-fields, not hidden magic.
- Money input: separate currency selector + numeric input + "or describe it" textarea; parse preview shows "≈ ₦80,000" and requires confirmation to store `amount_minor`.
- Date input: native `date` plus a "describe it instead" text field for phrases like "before month end" (stored raw, status `needs_clarification`).
- Measurements: value + unit selector + optional original phrase; no silent conversion.

### 11.2 Autosave

- Debounce 800 ms per field, flush on blur, route change, and `beforeunload`.
- Draft writes are `PUT /draft` with `If-Match: draftRev`; conflict (another tab) merges by field `updatedAt` and shows a "another tab changed this" notice.
- Status indicator per group: "Saved" / "Saving…" / "Saved on this device" / "Couldn't save — retry".
- Draft retention: 30 days inactive → purge with an email notice at 25 days (only if the draft has content).
- Never autosave into a shared version. Publishing is always explicit.

### 11.3 Unsaved changes

- `beforeunload` prompt only when there are dirty fields.
- In-app navigation uses a confirm dialog with Save draft / Discard / Stay.
- Discard keeps a recovery copy for 24 h accessible from the brief page ("Restore last discarded edit").

---

## 12. Authentication and session UX

### 12.1 Screens

| Screen | Requirements |
|---|---|
| `/sign-in` | Phone (default, `+234` prefilled) or email toggle; single primary action; no password field; rate-limit copy |
| `/sign-in` (code) | 6-box OTP with paste support, `inputmode="numeric"`, `autocomplete="one-time-code"`; resend timer 60 s; change number link |
| Magic link sent | "Check your email", resend, use phone instead |
| Passkey upgrade (post-ack) | Optional card: "Sign in faster next time" |
| Sessions | List with device label, last seen, revoke, sign out everywhere |
| Invite verify | Explains what will be shared, then OTP, then joins job |

### 12.2 Session lifecycle

- Cookie `__Host-nwa_session`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`.
- Idle timeout 30 min with a background refresh at 20 min while the tab is visible and the user is active.
- Absolute 12 h; re-auth silently if a valid refresh chain exists, otherwise prompt with `returnTo`.
- Sign-out: revoke server session, delete IndexedDB user DB, clear caches, redirect to `/`.
- Multi-tab sign-out via `BroadcastChannel('nwa-auth')` + storage event fallback.

### 12.3 Security UX

- New device sign-in triggers an email/SMS notice (no job content).
- OTP errors are generic ("That code didn't work") and never reveal whether the number exists.
- Export and deletion require re-OTP within 5 minutes.
- A "shared device" toggle on the sign-in screen shortens the session to 15 minutes and disables persistence.

---

## 13. Accessibility implementation plan

### 13.1 Standards and target

WCAG 2.2 AA for all P0 flows. This is a release gate, not a backlog item.

### 13.2 Implementation rules

- One `<main>`, one `<h1>`; heading levels never skipped.
- Landmarks: `header`, `nav` (labelled), `main`, `aside` for the status/sync bar if persistent.
- Focus management: route change focuses the `h1` (with `tabIndex={-1}`), dialogs trap focus and restore to the trigger, sheets close on Escape.
- Skip link to main content.
- All interactive elements are native `button`/`a`; no `div` with `onClick`.
- Icons inside buttons carry `aria-hidden` when accompanied by text; icon-only buttons have `aria-label`.
- Status badges are text + icon; `aria-label` reads the meaning, e.g. "Status: both reviewed version 3".
- The diff view is a table with `caption`, column headers "Before"/"After", and text markers "Added"/"Removed" — never colour or strikethrough alone.
- Live regions: `aria-live="polite"` for save/sync, `role="status"` for toasts, `role="alert"` only for validation summaries and blocking errors.
- Form errors: `aria-invalid`, `aria-describedby` pointing to the message, error summary at top with in-page links.
- Reduced motion: honour `prefers-reduced-motion`, no parallax, no auto-advancing carousels.
- Minimum target 44×44 CSS px; 8 px spacing between adjacent targets.
- Text resizing to 200% without loss of content or function; layout at 320 px with 400% zoom reflows.
- `lang` attribute per locale; `dir` prepared for future RTL (not needed for launch languages but tokens should not assume LTR).
- Read-aloud button on the plan summary uses `SpeechSynthesis` when available, with a visible "read aloud" label and stop control; hidden when unsupported.

### 13.3 Testing protocol per release

1. axe-core automated scan on every route (CI, zero serious/critical).
2. Keyboard-only walkthrough of J1–J4 (documented checklist).
3. NVDA + Chrome on Windows: create job, review, acknowledge.
4. TalkBack + Chrome on Android: invite acceptance, acknowledge.
5. VoiceOver + Safari iOS: review and change response.
6. 200% zoom and 320 px width visual check.
7. Windows High Contrast Mode and `forced-colors` CSS check.
8. Cognitive walkthrough with a low-literacy proxy: read-aloud and short copy.

### 13.4 Known accessibility risks

- Diff tables on narrow screens → stack into definition lists under 480 px.
- OTP six-box inputs can be hostile to screen readers → use a single input with `autocomplete="one-time-code"` and visual segmentation via CSS, not six fields.
- Toasts that disappear → keep a persistent status bar for anything consequential.
- Signed image URLs that fail → provide a text alternative and retry action.

---

## 14. Performance engineering

### 14.1 Budgets (enforced in CI)

| Metric | Budget (mobile, 4G, mid-tier) |
|---|---|
| First-load JS (app shell route) | ≤ 180 KB gzipped |
| Marketing LCP | ≤ 2.0 s |
| App LCP | ≤ 2.5 s |
| INP | ≤ 200 ms p75 |
| CLS | ≤ 0.1 |
| TTI | ≤ 3.5 s |
| Route chunk delta | ≤ 60 KB per new route |
| Fonts | ≤ 2 files, `font-display: swap`, subset Latin + ₦ |
| Images | AVIF/WebP, explicit dimensions, lazy below fold |

Lighthouse CI fails the build on regression beyond 5% of any budget. Bundle analysis posted on every PR that changes the client.

### 14.2 Techniques

- RSC for data-heavy shells; client components only where interaction exists (`'use client'` at leaves, not layouts).
- Route-level code splitting by default; heavy features (diff viewer, PDF export, image cropper) dynamically imported on interaction.
- `next/font` with a variable system stack fallback to avoid layout shift; no icon font.
- Prefetch on hover/focus for job links; `prefetch={false}` for history and files.
- Images: `next/image` with a custom loader that signs R2 URLs server-side and sets `sizes`; no original-size images in lists.
- Skeletons match final layout to avoid CLS; avoid full-page spinners.
- Virtualise activity/history lists over 50 items; paginate at 20.
- Debounce search/filter; no client-side sorting of unbounded lists.
- Service worker precaches only the shell; no cache-first HTML.
- Third parties: none in the critical path; analytics loaded after `requestIdleCallback` and blocked when `Save-Data` is on.

### 14.3 Measurement

- Real-user monitoring via `web-vitals` → analytics (p75 per route, device class, connection type).
- Synthetic Lighthouse on staging per PR + weekly on production.
- A device lab run before each release on: Android Go 2 GB (Chrome), iPhone SE 2 (Safari), mid Android (Samsung Internet), desktop.
- Slow-network profile in Playwright (`CDP: Network.emulateNetworkConditions`) as part of E2E.

---

## 15. Web security

### 15.1 Headers

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-<per-request>';
  style-src 'self' 'nonce-<per-request>'; img-src 'self' blob: data: https://media.naweagree.app;
  connect-src 'self' https://api.naweagree.app; font-src 'self'; frame-ancestors 'none';
  form-action 'self'; base-uri 'none'; object-src 'none'; upgrade-insecure-requests
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(self), microphone=(self), geolocation=(), payment=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

`frame-ancestors 'none'` is deliberate: the app must not be embedded (prevents clickjacking and protects against a hostile wrapper). The platform preview iframe used during development must be served with this exception only in non-production.

### 15.2 Controls

- CSRF: `SameSite=Lax` + double-submit token on all non-GET BFF routes + `Origin` check against an allowlist.
- XSS: no `dangerouslySetInnerHTML` except sanitised markdown for static help content; user text always rendered as text; URL fields validated to `https:` only.
- Open redirect: `returnTo` must match `^/[a-z0-9\-/\[\]]*$` and not start with `//`.
- File uploads go directly to R2 with server-chosen keys; the browser cannot overwrite an object key; MIME and size re-verified.
- Signed URL lifetime 5 minutes, bound to the authenticated session (server checks membership at signing time).
- Dependency policy: `pnpm audit` + Dependabot; no new dependency with a postinstall script; monthly review of transitive size/security.
- Secrets: server-only env; a CI check greps the client bundle for known secret patterns and `API_URL` internals.
- Content Security: no third-party scripts in the authenticated app; marketing pages may add analytics with a documented exception.
- Logging: never log request bodies for job routes; redact `authorization`, `cookie`, `set-cookie`.

### 15.3 Privacy in the browser

- No localStorage of job content (IndexedDB only, cleared on sign-out).
- No content in analytics, error messages, or URL query strings (job IDs only).
- `Referrer-Policy: no-referrer` prevents job URLs leaking to third parties.
- Signed media URLs are not stored in the service worker cache longer than the URL lifetime.
- A visible "using a shared device?" option shortens sessions and disables persistence.

---

## 16. Internationalization and content

### 16.1 Setup

- `next-intl` with message catalogues in `packages/i18n/messages/{en-NG,pcm}.json`.
- Locale routing: `/` (en-NG default) and `?lang=pcm` toggle in MVP; `/pcm` prefix later. Locale stored on the user profile, not only the URL.
- ICU only: `{count, plural, one {# detail} other {# details}}`; no string concatenation, no `toLocaleString` on stored values without showing the raw value too.
- Dates: `Intl.DateTimeFormat` with explicit timezone; ambiguous stored phrases show as-is plus "not a fixed date".
- Money: `Intl.NumberFormat` with the job currency; if currency unknown, show the raw phrase and a "currency not decided" badge. Never assume NGN from a locale.
- Numbers/units: display original + converted only when the user asks, with both visible.

### 16.2 Copy rules

- Grade-6 reading level; short sentences; active voice.
- Prefer local, plain phrasing: "The other person", "Not decided yet", "What changed".
- Avoid "contract", "binding", "verified", "guaranteed", "escrow", "dispute resolution", "AI-powered".
- Always explain consequences before the action: "Both of you must review before this counts as agreed."
- Errors: what happened, what to do, and a reference code. Never blame the user.
- Pidgin copy must be authored/reviewed by native speakers, not machine-translated; keep a term glossary so "plan", "review", "change" stay consistent.

### 16.3 Translation workflow

1. Source strings in `en-NG.json` with context comments and max-length hints.
2. Export to a review sheet; native reviewer edits; back-translation check for money/date/consent strings.
3. Automated check: no missing keys, no ICU syntax errors, no line longer than 90 chars where layout constrains it.
4. Screenshot review in both locales for every UI change that adds copy.
5. Pseudo-locale (`en-XA`) build in CI to catch truncation and hard-coded strings.

---

## 17. Analytics and error reporting

### 17.1 Implementation

- A typed `track(event, props)` function with a **closed allowlist** of event names and property keys; unknown keys are dropped in development with an error and stripped in production.
- No autocapture, no session replay, no text or file names, no free-text properties.
- Opt-out respected via a first-party cookie and a settings toggle; no analytics before consent in jurisdictions requiring it.
- Sent to a first-party endpoint (`/api/e`) that validates the allowlist server-side before forwarding — prevents SDK drift.

### 17.2 Error reporting

- Sentry with `beforeSend` scrubbing: drop `body`, `query_string` values for job routes, `cookie`, `authorization`, and any string matching money/phone/email patterns.
- Release tagging with `version` + `commit`; source maps uploaded privately.
- Breadcrumbs limited to route changes and API status codes (no payloads).
- Sampling: 100% of errors, 5% of transactions.

---

## 18. Notifications on web

- Web Push only where supported and permission granted; ask **after** a meaningful action (first published version), never on first load.
- Permission UI explains exactly what will be sent and offers "email instead".
- Push payload contains `{type, jobId, eventId}` only; content is fetched after auth. This prevents lock-screen leakage.
- A `push` handler shows a generic notification when the app is closed: "NaWeAgree: update on a shared plan".
- Click → focus/open `/${locale}/jobs/:id?event=…`; if signed out, sign in and resume.
- Fallback: in-app notification centre + email. Never claim push was delivered when the browser rejected it.
- iOS Safari: Web Push requires an installed PWA (16.4+); detect and show email guidance.

---

## 19. Testing strategy

### 19.1 Levels

| Level | Tool | Coverage target | Examples |
|---|---|---|---|
| Unit | Vitest | 85% on `lib/`, `features/*/logic` | status label mapping, diff computation, money formatting, queue ordering |
| Component | Testing Library + vitest-axe | All `components/ui` and key domain components | Field error wiring, dialog focus trap, badge a11y name |
| Contract | Vitest + fixtures from `packages/fixtures` | 100% of endpoints used | Envelope parsing, error code mapping, conflict payloads |
| Integration | Vitest + MSW | Server actions, BFF proxy | 401 redirect, 409 handling, idempotency replay |
| E2E | Playwright (2 browser contexts) | All P0 journeys | Two users acknowledge the same version; stale ack rejected |
| Offline | Playwright + CDP network emulation | Queue and conflict paths | Offline ack queued, version superseded, user prompted |
| Accessibility | axe + manual checklist | Zero serious/critical | Every route |
| Visual | Playwright screenshots | Core components × 2 locales × 3 viewports | Status badges, diff view |
| Performance | Lighthouse CI + Playwright metrics | Budgets | Per-route |
| Security | ZAP baseline in staging + manual review | No medium+ findings | Auth, invite, upload |

### 19.2 Two-user E2E fixtures

Playwright uses two isolated contexts (`customer`, `provider`) with seeded users and a job. The invite token is read from the test inbox (Mailpit) rather than a database shortcut, so the real flow is tested. OTP codes are read from Mailpit/SMS stub logs.

### 19.3 Critical test cases (must be automated)

1. Provider publishes v1; customer acknowledges; status becomes mutually acknowledged **only after both**.
2. Customer acknowledges v1 in tab A; provider publishes v2 in tab B; tab A's ack is rejected with `VERSION_SUPERSEDED` and no false state is shown.
3. Rejecting a change leaves the last mutually acknowledged version current (verified via API and UI).
4. A non-participant cannot read a job by guessing an ID (404, no title leak).
5. Withdrawing an acknowledgement creates a new event and does not delete the original.
6. Offline acknowledgement is never rendered as confirmed; on reconnect it either succeeds for the current version or is discarded with a prompt.
7. Duplicate publish with the same idempotency key creates exactly one version.
8. Export includes all versions and acknowledgements, and never includes the other party's private draft.
9. Deleting an account anonymises but preserves the other party's record.
10. 200% zoom, 320 px width, and keyboard-only completion of the acknowledgement flow.

### 19.4 Test data

Synthetic fixtures only; generated names/addresses/amounts; no production data in development. Fixtures live in `packages/fixtures/seed/*.json` and are shared with Android and the API tests.

---

## 20. Build, CI/CD, and deployment

### 20.1 Pipelines

```yaml
pr:
  - pnpm install --frozen-lockfile
  - turbo run lint typecheck test:unit
  - openapi drift check (packages/contracts)
  - i18n key parity + ICU compile
  - build (with bundle budget)
  - playwright smoke (chromium, 2 users)
  - axe scan on 6 routes
  - lighthouse-ci (mobile preset)
  - pnpm audit --prod + secret scan
  - preview deploy (Vercel preview or Workers preview)
  - comment with budget + a11y deltas
main:
  - full E2E (chromium, webkit)
  - contract tests against staging API
  - staging deploy + smoke + synthetic invariant job
release:
  - tag → production deploy (immutable build id)
  - canary 5% via edge split on cookie hash
  - 30-min observation (error rate, LCP, conflict rate)
  - 25% → 100%, each gated on SLO
  - automatic rollback if error rate > 1% or LCP p75 > 3 s
```

### 20.2 Environments and config

`local`, `preview`, `staging`, `prod`. Config validated at build and boot with Zod; missing `API_URL` fails the build. No runtime config fetch that could be tampered with.

### 20.3 Feature flags

Server-evaluated flags passed as props; no flag values trusted from the client for security decisions. Flags: `ai_extraction`, `share_target`, `plan_card_image`, `sms_fallback`, `passkeys`, `read_aloud`, `dark_mode`.

### 20.4 Caching and rollout

- Static assets: immutable, 1-year cache, hashed filenames.
- HTML: `no-cache` with ETag.
- API: `no-store` for authenticated data.
- Service worker version tied to build ID; on deploy, `skipWaiting` only after user confirmation.
- Rollback: previous deployment is immutable and promoted by alias switch; DB migrations are forward-compatible for at least one release.

---

## 21. Observability

| Signal | Tool | Alert |
|---|---|---|
| JS errors | Sentry | Error rate > 0.5% of sessions or new issue in P0 flow |
| Web vitals | Analytics + dashboard | LCP p75 > 2.5 s for 3 consecutive hours |
| BFF latency/5xx | Platform logs + OTel | p95 > 700 ms or 5xx > 1% |
| Sync failures | Custom event counters | conflict rate > 5% of acks, queue age > 10 min |
| Auth failures | Server metrics | OTP verify failure spike > 3× baseline |
| Service worker install failures | Custom event | > 2% of first visits |
| Synthetic journey | Cron (Playwright) every 10 min | Any step failure |

Dashboards: (1) acquisition + invite funnel, (2) job lifecycle, (3) sync health, (4) performance, (5) errors. Each has an owner and a "what to do" link to a runbook.

---

## 22. Sprint plan with exit criteria

Assumes 1.5 web engineers + designer + backend available.

| Sprint | Weeks | Scope | Exit criteria |
|---|---|---|---|
| W0 | 1 | Scaffold, tokens, primitives, AppShell, routing, CI, Sentry, flags, fixtures, contract client | Landing + empty jobs page deploy to preview; budgets and axe pass |
| W1 | 2 | Auth: sign-in, OTP, magic link, session, sign-out, device list | Two users sign in; session revocation works; no enumeration |
| W2 | 3 | Jobs list/create, templates, paste intake, draft autosave, IndexedDB v1 | Create and edit a draft offline; reload preserves it |
| W3 | 4 | Brief editor, field states, conflicts, publish version | Publish v1; immutable; server rejects stale publish |
| W4 | 5 | Invite flow: create, copy, preview page, verify, redeem, people page | Full invite journey on Android Chrome; expired/revoked states |
| W5 | 6 | Version view, acknowledgement, withdraw, ack checklist, overview next action | Two-user ack with correct status transitions; a11y pass |
| W6 | 7 | Change list/detail, diff view, responses, conflict sheet | Reject preserves prior version; conflict UI tested |
| W7 | 8 | Questions, activity/history, filters, closeout, pause/cancel/archive | All P0 screens reachable; empty/error states |
| W8 | 9 | Sync engine v2: queue UI, conflict resolution, multi-tab locks, auth pause | Chaos tests: offline ack, superseded version, duplicate submit |
| W9 | 10 | Media upload, signed URLs, scan states, export JSON/PDF, plan card image | Export and card verified; no public object access |
| W10 | 11 | Settings, privacy controls, deletion flow, AI opt-out, notifications prefs | Deletion e2e; AI path blocked when opted out |
| W11 | 12 | PWA: manifest, SW, install, offline shell, share target | Installable; share target works on Android Chrome |
| W12 | 13 | Accessibility remediation, performance pass, i18n (pcm), copy review | Zero serious axe issues; budgets met; both locales reviewed |
| W13 | 14 | Hardening: load test, security review, error copy, runbooks, feature flags | All Gate 1 criteria in `01` §23 met |

---

## 23. Definition of done and quality budget

A web change is done when:

- It is keyboard-completable and passes axe with zero serious/critical.
- It works at 360 px, 320 px zoomed, and desktop.
- Loading, empty, error, offline, and stale states exist.
- Errors are actionable and include a request ID.
- No new third-party script; no content in analytics.
- Unit + integration tests cover the logic; E2E covers the journey if it is P0.
- Bundle budget respected; Lighthouse stable.
- Strings are in the catalogue, ICU-valid, and reviewed in every shipped locale.
- It degrades gracefully in Tier 2/3 browsers (no white screen).
- Docs updated: route, flag, event, error code.

Quality budget for launch: crash-free sessions ≥ 99.5%, JS error rate < 0.5%, ack conflict rate < 3%, sync failure rate < 1%, p75 LCP < 2.5 s, zero S1/S2 bugs open.

---

## 24. Risks specific to web

| Risk | Impact | Mitigation |
|---|---|---|
| IndexedDB eviction on low-storage devices | Draft loss | `storage.persist()`, small cache, warn when storage is constrained, autosave to server when online |
| Service worker staleness mixing old JS with new API | Broken flows | Version-check on load, `waiting` update prompt, contract tests, min-supported-version header |
| In-app browsers blocking cookies/storage | Broken invite flow | Feature detection + lite mode, "open in Chrome" guidance, server-rendered ack path |
| Long-lived cookie sessions on shared devices | Privacy | Short idle timeout, shared-device mode, sign-out clears IndexedDB, device list |
| Push unreliability leads to missed changes | Missed changes | Email/SMS fallback for critical events, in-app badge, "needs your action" list |
| Large JS from rich diff/PDF features | Slow on 3G | Dynamic import on interaction, text-first diff, server-side PDF |
| CSP nonce complexity with RSC | Bugs or weakened policy | Nonce via middleware, tested in staging; no `unsafe-inline` |
| Copy drift between web and Android | Confusing product | Shared ICU catalogues in `packages/i18n`, screenshot parity review |
| Analytics creep | Privacy incident | Allowlist, server-side validation, CI scan, quarterly review |
