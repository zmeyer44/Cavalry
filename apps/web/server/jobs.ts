import PgBoss from 'pg-boss';
import {
  GIT_SYNC_JOB_NAME,
  type GitSyncJobPayload,
} from '@cavalry/git-sync';

/**
 * Lazy singleton pg-boss connection used by the web app to enqueue jobs.
 * We never call boss.work() here — consumption lives in services/worker.
 */
let bossPromise: Promise<PgBoss> | null = null;

function getBoss(): Promise<PgBoss> {
  if (!bossPromise) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is not set');
    const boss = new PgBoss({ connectionString });
    boss.on('error', (err) => {
      console.error('[web][pg-boss] error', err);
    });
    bossPromise = boss.start().then(() => boss);
  }
  return bossPromise;
}

export async function enqueueGitSync(payload: GitSyncJobPayload): Promise<string | null> {
  const boss = await getBoss();
  return boss.send(GIT_SYNC_JOB_NAME, payload);
}
