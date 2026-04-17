import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve, dirname } from 'node:path';
import { mkdir, rm } from 'node:fs/promises';
import { URL, fileURLToPath } from 'node:url';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const exec = promisify(execFile);

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../..');
const MIGRATIONS_DIR = resolve(REPO_ROOT, 'packages/database/drizzle');
const STORAGE_DIR =
  process.env.CAVALRY_STORAGE_LOCAL_DIR ??
  resolve(HERE, '../.cavalry-e2e-storage');

async function ensureDatabaseExists(databaseUrl: string): Promise<void> {
  const parsed = new URL(databaseUrl);
  const dbName = parsed.pathname.replace(/^\//, '');
  if (!dbName) throw new Error(`DATABASE_URL has no database name: ${databaseUrl}`);

  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = '/postgres';

  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    const res = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      dbName,
    ]);
    if (res.rowCount === 0) {
      await admin.query(`CREATE DATABASE "${dbName}"`);
      console.log(`[e2e] created database ${dbName}`);
    }
  } finally {
    await admin.end();
  }
}

export default async function globalSetup(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL must be set for e2e');

  console.log(`[e2e] preparing test database…`);
  await ensureDatabaseExists(databaseUrl);

  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
    console.log(`[e2e] migrations applied`);

    // Full reset before the suite so reruns don't leak state.
    await truncateAll(pool);
    console.log(`[e2e] database truncated`);
  } finally {
    await pool.end();
  }

  await rm(STORAGE_DIR, { recursive: true, force: true });
  await mkdir(STORAGE_DIR, { recursive: true });
  console.log(`[e2e] storage dir ready: ${STORAGE_DIR}`);

  // Touch playwright to be sure it's installed. Cheap no-op if already installed.
  if (process.env.CI && !process.env.PLAYWRIGHT_SKIP_BROWSER_INSTALL) {
    try {
      await exec('npx', ['playwright', 'install', '--with-deps', 'chromium'], {
        cwd: REPO_ROOT,
      });
    } catch (err) {
      console.warn('[e2e] playwright install failed (continuing):', err);
    }
  }
}

export async function truncateAll(pool: pg.Pool): Promise<void> {
  // Tables in dependency-safe order via CASCADE.
  const { rows } = await pool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = 'public'
       AND tablename NOT LIKE 'drizzle_%'
       AND tablename NOT LIKE '__drizzle%'`,
  );
  if (rows.length === 0) return;
  const names = rows
    .map((r: { tablename: string }) => `"${r.tablename}"`)
    .join(', ');
  await pool.query(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
}
