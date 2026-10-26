# Neon Postgres setup

Provisioning happened outside the sandbox (Neon only allows connections from
environments that can reach the public internet; this dev sandbox is locked
down to npm/registry + GitHub). The schema is written, the Kysely client is
wired, and the API will pick up Postgres automatically as soon as
`DATABASE_URL` is resolvable.

## From a machine with internet access:

```bash
cd apps/api
# Put DATABASE_URL in .dev.vars (copy from .dev.vars.example; the production
# Neon URL is in the Cloudflare / Vercel secret stores — never commit it).
pnpm db:migrate
```

That applies `migrations/0001_init.sql` and records it in `schema_migrations`.
After restarting `wrangler dev`, the repositoryMiddleware will see
`DATABASE_URL` and route all reads/writes through Postgres instead of the
in-memory store.

## Verifying the swap

```bash
# create a plan via API; restart wrangler; GET /v1/invites/:token should still
# return the plan (it would vanish across restart in memory mode).
curl -X POST http://127.0.0.1:8787/v1/jobs -H 'content-type: application/json' \
  -d '{"title":"Persists","creatorName":"Ada"}'
```

If the plan survives a `pnpm --filter @nwa/api dev` restart, Postgres is live.

## Neon-specific notes

- We recommend the **pooled** connection string (`-pooler` host) for the API,
  since Cloudflare Workers can't hold long-lived TCP sockets. The Kysely
  dialect uses PgBouncer-compatible queries (no `SET` during session after
  connect) so this works.
- `neonConfig.webSocketConstructor = globalThis.WebSocket` is already set in
  `src/db/pg.ts` for the Workers runtime; in Node tests use the `neon()` HTTP
  client instead of the Pool if you want to avoid WebSocket dependencies.
