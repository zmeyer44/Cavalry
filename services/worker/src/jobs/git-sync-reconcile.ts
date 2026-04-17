import type PgBoss from 'pg-boss';
import { reconcileStaleRepos, GIT_SYNC_JOB_NAME } from '@cavalry/git-sync';
import { logger } from '../logger';

const JOB_NAME = 'git-sync-reconcile';

export async function registerReconcileWorker(
  boss: PgBoss,
  opts: { intervalSeconds: number },
): Promise<void> {
  await boss.work(
    JOB_NAME,
    { batchSize: 1, pollingIntervalSeconds: 5 },
    async () => {
      try {
        const result = await reconcileStaleRepos({
          staleAfterSeconds: opts.intervalSeconds,
          enqueue: (payload) => boss.send(GIT_SYNC_JOB_NAME, payload),
        });
        logger.info(result, 'reconcile run complete');
      } catch (err) {
        logger.error({ err }, 'reconcile run failed');
        throw err;
      }
    },
  );

  // pg-boss schedule takes a cron expression. Convert interval seconds to the
  // closest cron expression we can; minimum granularity is 1 minute.
  const intervalMinutes = Math.max(1, Math.floor(opts.intervalSeconds / 60));
  const cron = `*/${intervalMinutes} * * * *`;
  await boss.schedule(JOB_NAME, cron);
  logger.info({ cron }, 'reconcile schedule registered');
}
