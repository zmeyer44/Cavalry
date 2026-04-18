import { createHash } from 'node:crypto';
import { getPool } from '@cavalry/database';

/**
 * Postgres advisory locks are session-scoped — `pg_try_advisory_lock` and
 * `pg_advisory_unlock` MUST run on the same underlying connection. With a
 * connection pool, acquiring via `db.execute()` and releasing via another
 * `db.execute()` can easily land on different clients, leaving the lock
 * permanently held and blocking every future sync for that repo.
 *
 * To avoid that, we lease a dedicated pg client from the pool for the
 * lifetime of the lock. Acquire + release happen on the same client; the
 * client is returned to the pool as part of release.
 */

function keyPairFor(skillRepoId: string): [number, number] {
  const digest = createHash('sha256').update(skillRepoId).digest();
  const a = digest.readInt32BE(0);
  const b = digest.readInt32BE(4);
  return [a, b];
}

/**
 * Try to acquire a session-level advisory lock for this skill repo. Returns a
 * release function on success, or null if another worker holds the lock.
 * The release function always returns the underlying connection to the pool,
 * even when the unlock query fails.
 */
export async function acquireSyncLock(
  skillRepoId: string,
): Promise<(() => Promise<void>) | null> {
  const [a, b] = keyPairFor(skillRepoId);
  const client = await getPool().connect();
  try {
    const result = await client.query<{ acquired: boolean }>(
      'SELECT pg_try_advisory_lock($1, $2) AS acquired',
      [a, b],
    );
    const acquired = result.rows[0]?.acquired === true;
    if (!acquired) {
      client.release();
      return null;
    }
  } catch (err) {
    client.release(err instanceof Error ? err : new Error(String(err)));
    throw err;
  }

  return async () => {
    try {
      await client.query('SELECT pg_advisory_unlock($1, $2)', [a, b]);
    } finally {
      client.release();
    }
  };
}
