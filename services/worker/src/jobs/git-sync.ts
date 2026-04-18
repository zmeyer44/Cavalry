import type PgBoss from 'pg-boss';
import {
  GIT_SYNC_JOB_NAME,
  runSyncJob,
  type GitSyncJobPayload,
} from '@cavalry/git-sync';
import { logger } from '../logger';

export async function registerGitSyncWorker(boss: PgBoss): Promise<void> {
  await boss.work<GitSyncJobPayload>(
    GIT_SYNC_JOB_NAME,
    { batchSize: 1, pollingIntervalSeconds: 2 },
    async (jobs) => {
      for (const job of jobs) {
        logger.info(
          {
            jobId: job.id,
            skillRepoId: job.data.skillRepoId,
            trigger: job.data.trigger,
          },
          'git-sync job received',
        );
        const result = await runSyncJob(job.data);
        logger.info(
          {
            jobId: job.id,
            skillRepoId: job.data.skillRepoId,
            status: result.status,
            versionsPublished: result.versionsPublished,
            versionsSkipped: result.versionsSkipped,
          },
          'git-sync job complete',
        );
      }
    },
  );
  logger.info({ jobName: GIT_SYNC_JOB_NAME }, 'git-sync worker registered');
}
