# NaWeAgree — monorepo scaffold

This repository contains the full planning documents (see `docs/README.md`)
plus an initial pnpm/turbo monorepo scaffold for the web + API + admin apps
and the shared TS packages. The Android app lives under `apps/android/` as a
Kotlin/Gradle Compose project that you build from Android Studio on a dev
machine (this CI only installs Node).

## Layout

```
apps/
  web/      Next.js 15 PWA (customer-facing web + share preview + invite shell)
  api/      Hono on Cloudflare Workers (public API)
  admin/    Next.js admin console (trust & safety, feature flags, SAR/delete)
  android/  Native Android (Kotlin + Compose + Room + WorkManager + Hilt)
packages/
  domain/       @nwa/domain       — shared types, DomainError, ErrorCode
  contracts/    @nwa/contracts    — error serialization, OpenAPI constants
  fixtures/     @nwa/fixtures     — shared FakeClock, conformance scenarios
  testkit/      @nwa/testkit      — test helpers for apps (re-exports fixtures)
  design-tokens/ @nwa/design-tokens — color/space/type tokens
  i18n/         @nwa/i18n         — locale JSON (en-NG, pcm) + parity validator
docs/                            — full 8-doc planning set (see docs/README.md)
```

## Prereqs

- Node 20+ (see `.nvmrc`)
- pnpm 9.12.0 (`corepack enable && corepack prepare pnpm@9.12.0 --activate`)
- Android: Android Studio Hedgehog+, JDK 17, Android SDK 35.

## Common commands

```bash
pnpm install
pnpm dev         # turbo: start api (8787) + web (3000) + admin (3001)
pnpm typecheck
pnpm test
pnpm build
pnpm lint
```

## What works today (W0 scaffold)

- `/v1/health` and `/v1/ready` on the Hono API with strict error envelope +
  request IDs.
- Root Next.js marketing page with a prototype warning, i18n strings wired
  in, and a live API health pill when the API is running.
- Shared domain types, error codes, fixtures, design tokens, i18n parity
  check.
- GitHub Actions CI (lint → typecheck → test → build) under `.github/workflows/ci.yml`.

See `docs/08-ultra-granular-todo.md` for the week-by-week task list that
turns this scaffold into the v1 product.
