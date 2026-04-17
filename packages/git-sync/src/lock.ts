import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { getDb } from '@cavalry/database';

/**
 * Postgres advisory locks are keyed by a pair of 32-bit integers. We derive
 * the pair from a sha256 of the skill_repo_id so the keyspace is evenly
 * distributed and stable.
 *
 * We use xact-level locks (pg_advisory_xact_lock) which would require a
 * transaction wrapper; for sync jobs we need the lock across multiple TX, so
 * use the session-level pg_try_advisory_lock + pg_advisory_unlock.
 */

function keyPairFor(skillRepoId: string): [number, number] {
  const digest = createHash('sha256').update(skillRepoId).digest();
  const a = digest.readInt32BE(0);
  const b = digest.readInt32BE(4);
  return [a, b];
}

/**
 * Try to acquire an advisory lock for this skill repo. Returns a release
 * function on success, or null if another worker holds the lock.
 */
export async function acquireSyncLock(
  skillRepoId: string,
): Promise<(() => Promise<void>) | null> {
  const db = getDb();
  const [a, b] = keyPairFor(skillRepoId);
  const result = await db.execute<{ acquired: boolean }>(
    sql`SELECT pg_try_advisory_lock(${a}, ${b}) AS acquired`,
  );
  const acquired = result.rows[0]?.acquired === true;
  if (!acquired) return null;
  return async () => {
    await db.execute(sql`SELECT pg_advisory_unlock(${a}, ${b})`);
  };
}
