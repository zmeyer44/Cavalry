import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getDb() {
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
  return drizzle(pool, { schema, casing: 'snake_case' });
}

export type Database = ReturnType<typeof getDb>;
export type DbTransaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export async function withTransaction<T>(
  fn: (tx: DbTransaction) => Promise<T>,
): Promise<T> {
  return getDb().transaction(fn);
}
