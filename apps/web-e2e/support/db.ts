import pg from 'pg';
import { truncateAll } from './global-setup';

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set for e2e helpers');
    }
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 4,
    });
  }
  return pool;
}

export async function resetDatabase(): Promise<void> {
  await truncateAll(getPool());
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
