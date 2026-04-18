import type PgBoss from 'pg-boss';
import { scanAndSchedule, deliverPending } from '@cavalry/audit';
import { decrypt, isEnvelope } from '@cavalry/registry-upstream';
import { logger } from '../logger';

const SCAN_JOB = 'audit-webhooks-scan';
const DELIVER_JOB = 'audit-webhooks-deliver';

/**
 * Accepts the `{ secret }` envelope written by the web app and decrypts it.
 * The integration.webhookCreate/update endpoints store secrets as encrypted
 * envelopes; this mirrors the pattern used for upstream registries.
 */
function decryptSecret(envelope: string): { secret: string } {
  if (isEnvelope(envelope)) {
    return decrypt<{ secret: string }>(envelope);
  }
  // Fall back to raw when encryption is disabled (dev/test without
  // CAVALRY_ENCRYPTION_KEY). Accepts JSON {"secret": "..."} for safety.
  try {
    const parsed = JSON.parse(envelope);
    if (typeof parsed === 'object' && parsed && typeof parsed.secret === 'string') {
      return parsed;
    }
  } catch {
    // fallthrough
  }
  return { secret: envelope };
}

export async function registerAuditWebhookWorkers(
  boss: PgBoss,
  opts: { intervalSeconds: number },
): Promise<void> {
  await boss.work(
    SCAN_JOB,
    { batchSize: 1, pollingIntervalSeconds: 5 },
    async () => {
      try {
        const result = await scanAndSchedule({ decryptSecret });
        if (result.scheduled > 0) {
          logger.info(result, 'audit-webhook scan scheduled deliveries');
        }
      } catch (err) {
        logger.error({ err }, 'audit-webhook scan failed');
        throw err;
      }
    },
  );

  await boss.work(
    DELIVER_JOB,
    { batchSize: 1, pollingIntervalSeconds: 3 },
    async () => {
      try {
        const result = await deliverPending({ decryptSecret });
        if (result.delivered + result.failed > 0) {
          logger.info(result, 'audit-webhook delivery pass complete');
        }
      } catch (err) {
        logger.error({ err }, 'audit-webhook delivery failed');
        throw err;
      }
    },
  );

  const scanCron = `*/${Math.max(1, Math.floor(opts.intervalSeconds / 60))} * * * *`;
  await boss.schedule(SCAN_JOB, scanCron);
  await boss.schedule(DELIVER_JOB, '* * * * *'); // deliver once per minute
  logger.info(
    { scanCron },
    'audit-webhook workers registered',
  );
}
