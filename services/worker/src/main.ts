import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: resolve(here, '../../../.env') });

import PgBoss from 'pg-boss';
import { loadConfig } from './config';
import { logger } from './logger';
import { registerGitSyncWorker } from './jobs/git-sync';
import { registerReconcileWorker } from './jobs/git-sync-reconcile';
import { registerAuditWebhookWorkers } from './jobs/audit-webhooks';
import { registerSlackNotifyWorker } from './jobs/slack-notify';

async function main(): Promise<void> {
  const config = loadConfig();
  const boss = new PgBoss({ connectionString: config.databaseUrl });

  boss.on('error', (err) => {
    logger.error({ err }, 'pg-boss error');
  });

  await boss.start();
  logger.info('pg-boss started');

  await registerGitSyncWorker(boss);
  await registerReconcileWorker(boss, {
    intervalSeconds: config.reconcileIntervalSeconds,
  });
  await registerAuditWebhookWorkers(boss, {
    intervalSeconds: Math.min(config.reconcileIntervalSeconds, 60),
  });
  await registerSlackNotifyWorker(boss);

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down');
    try {
      await boss.stop({ graceful: true, timeout: 15_000 });
    } catch (err) {
      logger.error({ err }, 'error during shutdown');
    }
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  logger.info(
    { reconcileIntervalSeconds: config.reconcileIntervalSeconds },
    'worker ready',
  );
}

main().catch((err) => {
  logger.error({ err }, 'worker failed to start');
  process.exit(1);
});
