import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index';

const { Pool } = pg;

let pool: pg.Pool | null = null;

function ensurePool(): pg.Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 10_000,
    });
  }
  return pool;
}

export function getDb() {
  return drizzle(ensurePool(), { schema, casing: 'snake_case' });
}

/**
 * Returns the underlying pg Pool. Use this when a feature needs a dedicated
 * connection across multiple queries — notably advisory locks, which are
 * session-scoped and must acquire + release on the same client.
 */
export function getPool(): pg.Pool {
  return ensurePool();
}

export type Database = ReturnType<typeof getDb>;
export type DbTransaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export async function withTransaction<T>(
  fn: (tx: DbTransaction) => Promise<T>,
): Promise<T> {
  return getDb().transaction(fn);
}
