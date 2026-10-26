# DB layer (T-W2-01)

This directory holds persistence for NaWeAgree. The API routes depend on the
`JobRepository` interface in `repository.ts` — never directly on a storage
backend.

## Backends

| Backend | File | When used |
|---|---|---|
| In-memory | `memory.ts` | Default (no config). Data lives per Worker isolate and is lost on restart. |
| Postgres (Neon) | `pg.ts` | When `DATABASE_URL` is set in the environment. Loaded lazily so the app can still boot without a DB. |

`factory.ts` provides `repositoryMiddleware()` which Hono mounts in
`src/index.ts`; every route reads the active repo via `c.get('repo')`.

## Schema

`schema.ts` holds the Kysely type definitions. The actual tables are created
by the SQL migrations in `migrations/`. `0001_init.sql` is the base schema
(all tables, indices, FKs, and append-only triggers).

Append-only enforcement (gap G20 from PLAN.md): the triggers
`nwa_*_append_only` on `versions`, `acks`, `change_requests`, `job_events`
block `UPDATE` and non-cascade `DELETE` from application code so receipts
stay trustworthy. `DELETE CASCADE` from a parent job is allowed (so
GDPR/NDPR hard-delete works).

## Migrations

```bash
# run all pending migrations against DATABASE_URL
pnpm --filter @nwa/api db:migrate
```

The migration runner records applied files in `schema_migrations` and is
idempotent. Migrations must be additive after merging — no edits to
already-applied migrations.

## Next steps for the Postgres backend

`pg.ts` currently returns a repository whose methods throw `not yet
implemented`. The implementation work is:

1. Map each `JobRepository` method to Kysely queries, running the
   "mutate + re-read + recompute job status" logic inside a single SQL
   transaction so two concurrent `acknowledge` calls can't race.
2. Keep invariants enforced in tests (version-bound acks, silence ≠
   consent, never auto-confirm).
3. Add a "reset test DB" helper for Vitest that issues TRUNCATE against
   the tables inside a transaction, instead of relying on in-memory state.
4. Wire idempotency-key storage to the `idempotency_keys` table once the
   basic job methods work.
