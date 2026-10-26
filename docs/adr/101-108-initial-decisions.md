# ADR-101 — Monorepo with pnpm + Turborepo

- **Date:** 2026-10-21
- **Owner:** TL
- **Status:** Accepted

## Context
NaWeAgree ships four runtimes: web (Next.js), API (Hono on Cloudflare Workers), admin (Next.js), and Android (Kotlin/Gradle). The web, API, and admin apps share domain types, error codes, OpenAPI-generated clients, design tokens, and i18n strings. Android shares the OpenAPI contract and design tokens.

## Decision
Use a single pnpm 9 + Turborepo 2 monorepo at the repo root:
- `apps/web`, `apps/api`, `apps/admin`, `apps/android`
- `packages/domain`, `packages/contracts`, `packages/fixtures`, `packages/design-tokens`, `packages/i18n`, `packages/testkit`
- Strict TypeScript (`strict: true`, `noUncheckedIndexedAccess`, `noImplicitReturns`, `noImplicitOverride`).
- All shared code is versioned at `0.0.0` with `workspace:*`; we never publish to npm before the public launch.
- Android lives in the same repo (not a separate git repo) but builds via Gradle independently; CI runs Gradle in a separate job when `apps/android/**` changes.

## Consequences
- Single PR can ship a cross-cutting change (e.g. new error code + API + web + Android client) with one review.
- Enforces that any shared type change is reflected immediately in consumers.
- pnpm workspaces give us fast, deduplicated installs; turbo gives us remote caching later.
- Android tooling (Gradle, JDK) is not required to build web/API, and vice versa.
- Need CODEOWNERS to route Android PRs correctly (T-W0-03.2).

## Reconsider triggers
- If Android build time in CI exceeds 15 min regularly or interferes with JS pipeline caches.
- If we need to ship Android on a separate release cadence (it will — separate Play track). We can split out later via git subtree; no need now.

---

# ADR-102 — API runtime: Hono on Cloudflare Workers

- **Date:** 2026-10-21
- **Owner:** BE
- **Status:** Accepted

## Context
Need a low-latency, globally distributed API for a Nigeria-first product. Cold starts matter for MTN/Airtel users on variable networks. Must integrate cleanly with Cloudflare R2, Queues, KV, and Turnstile.

## Decision
- Public API (`apps/api`) runs on Cloudflare Workers as a Hono app.
- Persistence via Neon Postgres serverless (TCP-out from Workers via Hyperdrive in W3; fallback to HTTP fetch until then).
- BFF responsibilities (session cookies, HTML invite previews for in-app browsers) live in `apps/web` Next.js server routes, NOT in the Worker directly, to keep the Worker stateless.
- Worker runtime code MUST NOT import Node-only modules; CI catches this via Workers types.

## Consequences
- Edge latency ~50 ms to Lagos (vs ~250 ms from us-east).
- No background jobs on the Worker itself — long-running / retriable work goes through Cloudflare Queues.
- Cold-start ~0 ms for warm Workers, ~150 ms cold; acceptable.
- Strong operational coupling to Cloudflare; acceptable because we already chose Cloudflare for DNS/WAF/R2.

## Reconsider triggers
- If Neon Hyperdrive reliability drops below 99.5% we can migrate the API to Fly.io or Node on Cloudflare Workers with Node compat; Hono keeps code portable.

---

# ADR-103 — Database: Postgres (Neon), not Workers D1

- **Date:** 2026-10-21
- **Owner:** BE
- **Status:** Accepted

## Context
We need strong consistency for acknowledgements and version-bound concurrency. Every write must be serializable per job. "Silence ≠ consent" and "version-bound acks" invariants require strict ACID semantics.

## Decision
- Use **Neon Postgres** (serverless, branched per env) as primary transactional store.
- Workers D1 is explicitly **not** used: it is eventually consistent in replication and does not provide the strict serializability we need for conflict detection.
- Migrations are append-only SQL files in `apps/api/migrations/`, run in CI against staging before deploy.
- KV is used only for rate-limit counters and idempotency keys (ephemeral, ok to lose).

## Consequences
- Strong transactional guarantees for the version-bound ack loop.
- Branch-per-PR DBs trivial for testing.
- Need a connection pool/bouncer (Hyperdrive or PgBouncer).
- Higher cost than D1 at scale but negligible at WTP pilot volumes.

## Reconsider triggers
- If Neon serverless driver latency from Workers > 200 ms p95 to EU region, reconsider hosting on Fly.io with a regional replica.

---

# ADR-104 — Auth: phone-first OTP magic links, no passwords

- **Date:** 2026-10-21
- **Owner:** BE
- **Status:** Accepted

## Decision
- Phone number (E.164) is the primary identifier for both customer and provider.
- Authentication via 6-digit OTP via SMS (Termii, with Twilio fallback) for first-time sign-in on the same device; subsequent sign-ins use a session cookie bound to the device.
- Invite links carry a short-lived, single-use token; opening an invite link on a device that has never seen the phone number triggers OTP before granting access.
- No passwords, no email-first signup, no OAuth social login in v1.

## Consequences
- Matches how users actually talk to their tailors/carpenters (via phone).
- Must handle SIM swap risk: session binding is per-device (cookie + device fingerprint), not just phone number.
- Nigeria SSN/ID not required; privacy-first.
- SMS deliverability is a known failure mode; we provide device-code fallback (T-W6-05).

---

# ADR-105 — Invite flow: three surfaces (in-app browser, web preview, native)

- **Date:** 2026-10-21
- **Owner:** WEB/AN
- **Status:** Accepted

## Decision
- Invite links (`https://naweagree.app/j/<token>`) serve a **server-rendered HTML preview** (Next.js on the web app) regardless of user agent. This preview shows the current version of the plan in plain language plus two big CTAs: "Open in NaWeAgree" (deep link / Play Store fallback) and "View in browser" (web PWA).
- In-app browsers (WhatsApp/FBM/Instagram/Opera Mini) get the HTML preview only; they can read and tap actions but the final ack is re-confirmed in a real browser or native app (anti-fake-ack).
- Native Android app registers the same https deep link via App Links (verified assetlinks.json) so clicks launch directly into the app if installed.
- All share surfaces point at the same canonical https URL — no custom scheme (`nwa://`).

## Consequences
- No broken "your browser can't open this link" experience.
- Server-rendered preview gives scrapers/social a useful preview (Twitter/WhatsApp link unfurler sees real content).
- Assetlinks.json verification step is required (added to W3 deploy checklist).

---

# ADR-106 — Versioning model: append-only JobVersion + per-version fields

- **Date:** 2026-10-21
- **Owner:** BE
- **Status:** Accepted

## Decision
See docs/01 §6 for full rationale. A job is a chain of immutable `JobVersion` rows, each with its own set of fields (material/price/date/notes). Acks always target a specific `version_id`. The server rejects acks against a non-current version with `VERSION_SUPERSEDED` (409). Silence never creates an ack and never advances the version.

This is the single most important product invariant.

## Consequences
- Full audit history for free; disputes resolved by reading the chain.
- Offline acks are safe: they are either accepted (if the version is still current) or rejected with the new version attached.
- Implementations (web, Android, API) MUST NOT do silent retries that mutate state — all retries carry an idempotency key.

---

# ADR-107 — Error envelope

- **Date:** 2026-10-21
- **Owner:** BE
- **Status:** Accepted

## Decision
Every non-2xx response is shaped as:
```json
{ "error": { "code": "<ErrorCode>", "message": "<human-safe, PII-free>", "requestId": "...", "retryable": false, "fields": {...}, "details": {...} } }
```
- `ErrorCode` is a closed string enum shared across TS + Kotlin.
- `message` never contains raw user input, phone numbers, or stack traces.
- Every response includes `x-request-id`.

## Consequences
- Clients have a single error-handling path.
- The message string is safe to show in a toast in English; localized messages are rendered client-side from the code.

---

# ADR-108 — No AI auto-confirm; AI is assistive only

- **Date:** 2026-10-21
- **Owner:** PD/TL
- **Status:** Accepted (product invariant)

## Decision
Per README invariant and doc 04 robustness rule R-10: AI output (transcription, summarization, draft change requests) is **never** applied to the plan without an explicit, version-bound, per-party human tap. AI suggestions are previews. If AI is unavailable, the manual path must work just as well.

Gate: AI features ship only after a 500-sample blind evaluation (doc 08 W29+) shows <5% material misrecall against gold human transcripts.

## Consequences
- Avoids the worst product risk (putting words in someone's mouth).
- Slower AI rollout; acceptable.
