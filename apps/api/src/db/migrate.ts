/**
 * Standalone migration runner. Called via `pnpm --filter @nwa/api migrate`.
 *
 * Reads DATABASE_URL from env, connects directly via @neondatabase/serverless,
 * runs the SQL files in src/db/migrations/ in order. Idempotent — tracks
 * applied migrations in the `schema_migrations` table.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from '@neondatabase/serverless';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL not set. Nothing to migrate.');
    console.error('Set DATABASE_URL to a Neon Postgres connection string and retry.');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    const { rows: applied } = await pool.query<{ name: string }>('SELECT name FROM schema_migrations ORDER BY name');
    const appliedSet = new Set(applied.map((r) => r.name));

    const migrationsDir = fileURLToPath(new URL('./migrations', import.meta.url));
    const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  skip ${file} (already applied)`);
        continue;
      }
      const sql = await readFile(join(migrationsDir, file), 'utf8');
      console.log(`  applying ${file} …`);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
      console.log(`  ✓ ${file}`);
    }
    console.log('All migrations applied.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
