/**
 * Pick the active repository backend based on environment and bind it to
 * Hono's `Context` so route handlers get the right one per-request.
 *
 * Priority:
 *   1. If DATABASE_URL is set → Postgres (Neon) via Kysely.
 *   2. Otherwise → in-memory store (dev / tests / boot without a DB).
 */
import type { Context, MiddlewareHandler } from 'hono';
import { createMemoryRepository } from './memory.js';
import type { JobRepository } from './repository.js';

export type Bindings = {
  DATABASE_URL?: string;
  RECEIPT_SECRET?: string;
  EMAIL_API_KEY?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  SCHEDULER_SECRET?: string;
};

export type Env = {
  Variables: { repo: JobRepository; deviceKey: string };
  Bindings: Bindings;
};

export type AppContext = Context<Env>;

/**
 * Singleton per worker isolate. Cloudflare Workers creates one isolate per
 * process; this is fine for memory mode (state lives per isolate) and for
 * Postgres mode (pool is per-isolate too, which is what Neon recommends).
 */
let _memory: JobRepository | null = null;
let _pg: Promise<(JobRepository & { db?: unknown; pool?: unknown }) | null> | null = null;

function getMemoryRepo(): JobRepository {
  if (!_memory) _memory = createMemoryRepository();
  return _memory;
}

async function getPgRepo(databaseUrl: string): Promise<JobRepository | null> {
  if (!_pg) {
    _pg = (async () => {
      try {
        const { createPgRepository } = await import('./pg.js');
        const repo = createPgRepository(databaseUrl);
        // Probe connectivity — Neon is unreachable in some dev sandboxes; if
        // the probe fails we fall back to memory rather than erroring on the
        // first user request. On success the pool stays warm for queries.
        await sqlProbe(repo);
        console.log('[db] Postgres (Neon) connected.');
        return repo;
      } catch (err) {
        console.warn('[db] falling back to memory — Postgres probe failed:', (err as Error).message);
        _pg = null; // allow retry on next cold start
        return null;
      }
    })();
  }
  return _pg;
}

async function sqlProbe(repo: JobRepository): Promise<void> {
  // Reach into the Kysely instance for a raw SELECT 1 probe using a direct
  // connection from the pool. Importing { sql } from kysely is avoided here
  // because Miniflare / ESM resolution for dynamic imports is finicky; we
  // acquire a client and issue a simple query.
  const pool = (repo as unknown as { pool?: { connect: () => Promise<{ query: (q: string) => Promise<unknown>; release: () => void }> } }).pool;
  if (!pool) throw new Error('pg repo has no pool handle');
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}

/**
 * Hono middleware that attaches `ctx.var.repo`. Imported & mounted in
 * `src/index.ts`.
 */
export function repositoryMiddleware(): MiddlewareHandler<Env> {
  return async (c, next) => {
    const env = (c.env ?? {}) as Partial<Bindings>;
    const databaseUrl = env.DATABASE_URL;
    if (databaseUrl) {
      const pg = await getPgRepo(databaseUrl);
      if (pg) {
        c.set('repo', pg);
        return next();
      }
    }
    c.set('repo', getMemoryRepo());
    return next();
  };
}

/** Direct accessor for scripts (e.g. migrations, tests) outside Hono. */
export async function createRepository(env: Bindings): Promise<JobRepository> {
  if (env.DATABASE_URL) {
    const pg = await getPgRepo(env.DATABASE_URL);
    if (pg) return pg;
  }
  return getMemoryRepo();
}

/** Test-only: reset the in-memory singleton (bindings + revoked tokens + store). */
export async function resetMemoryRepo(): Promise<void> {
  if (_memory) {
    await _memory.__reset();
    _memory = null;
  }
  const { __resetStore } = await import('../modules/jobs/store.js');
  __resetStore();
}
