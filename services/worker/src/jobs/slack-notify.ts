import type PgBoss from 'pg-boss';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import {
  approvals,
  getDb,
  installs,
  organizations,
  policies,
  policyEvaluations,
  slackIntegrations,
} from '@cavalry/database';
import {
  approvalRequestBlocks,
  postMessage,
  slackConfigFromEnv,
} from '@cavalry/slack';
import { decrypt, isEnvelope } from '@cavalry/registry-upstream';
import { logger } from '../logger';
import { signInstallStateForOrg } from '../state-token';

const JOB_NAME = 'slack-approval-notify';

/**
 * Scan for pending approvals that haven't been posted to Slack yet and
 * deliver a block-kit message to the org's configured channel. Runs every
 * minute; the check is cheap because we filter on slack_message_ts IS NULL.
 */
export async function registerSlackNotifyWorker(boss: PgBoss): Promise<void> {
  const slackConfig = slackConfigFromEnv();
  if (!slackConfig) {
    logger.info('slack app not configured — skipping slack worker');
    return;
  }

  await boss.work(
    JOB_NAME,
    { batchSize: 1, pollingIntervalSeconds: 5 },
    async () => {
      try {
        const result = await runOnce();
        if (result.posted > 0) logger.info(result, 'slack approval notify pass');
      } catch (err) {
        logger.error({ err }, 'slack approval notify failed');
        throw err;
      }
    },
  );
  await boss.schedule(JOB_NAME, '* * * * *');
  logger.info('slack-notify worker registered');
}

async function runOnce(): Promise<{ posted: number; skipped: number }> {
  const db = getDb();
  // Find approvals waiting to be posted. We already filter out decided ones
  // so a one-off missed post (slack down) gets retried until we succeed or
  // the approval is decided some other way.
  const pending = await db
    .select({
      approvalId: approvals.id,
      orgId: approvals.orgId,
      installId: approvals.installId,
      status: approvals.status,
      skillRef: installs.skillRef,
      requesterId: approvals.requestedBy,
      createdAt: approvals.createdAt,
    })
    .from(approvals)
    .innerJoin(installs, eq(installs.id, approvals.installId))
    .where(
      and(
        eq(approvals.status, 'pending'),
        isNull(approvals.slackMessageTs),
      ),
    )
    .limit(25);

  if (pending.length === 0) return { posted: 0, skipped: 0 };

  const orgIds = Array.from(new Set(pending.map((p) => p.orgId)));
  const integrations = await db
    .select()
    .from(slackIntegrations)
    .where(
      and(
        inArray(slackIntegrations.orgId, orgIds),
        eq(slackIntegrations.enabled, true),
      ),
    );
  const integrationByOrg = new Map<
    string,
    typeof slackIntegrations.$inferSelect
  >();
  for (const i of integrations) integrationByOrg.set(i.orgId, i);

  const orgs = await db
    .select({ id: organizations.id, slug: organizations.slug })
    .from(organizations)
    .where(inArray(organizations.id, orgIds));
  const orgSlugById = new Map(orgs.map((o) => [o.id, o.slug] as const));

  let posted = 0;
  let skipped = 0;

  for (const p of pending) {
    const integration = integrationByOrg.get(p.orgId);
    if (!integration || !integration.defaultChannelId) {
      skipped += 1;
      continue;
    }
    // Fetch the policy name that triggered this approval.
    const evalRow = await db
      .select({ policyName: policies.name, reason: policyEvaluations.reason })
      .from(policyEvaluations)
      .innerJoin(policies, eq(policies.id, policyEvaluations.policyId))
      .where(
        and(
          eq(policyEvaluations.installId, p.installId),
          eq(policyEvaluations.result, 'require_approval'),
        ),
      )
      .limit(1);
    const policyName = evalRow[0]?.policyName ?? '(policy)';
    const reason = evalRow[0]?.reason ?? 'approval required';

    const orgSlug = orgSlugById.get(p.orgId) ?? p.orgId;
    const webUrl =
      process.env.CAVALRY_WEB_URL ?? 'http://localhost:3000';
    const stateToken = signInstallStateForOrg({
      orgId: p.orgId,
      userId: p.requesterId ?? 'slack',
      nonce: `slack-${p.approvalId}`,
    });

    const blocks = approvalRequestBlocks({
      approvalId: p.approvalId,
      skillRef: p.skillRef,
      policyName,
      reason,
      requesterEmail: null,
      orgSlug,
      webUrl,
      stateToken,
    });

    const token = decryptBotToken(integration.botToken);
    const res = await postMessage({
      token,
      channel: integration.defaultChannelId,
      text: `Approval required: ${p.skillRef}`,
      blocks,
    });

    if (!res.ok || !res.ts) {
      logger.warn(
        { err: res.error, approvalId: p.approvalId },
        'slack postMessage failed',
      );
      skipped += 1;
      continue;
    }

    await db
      .update(approvals)
      .set({
        slackTeamId: integration.teamId,
        slackChannelId: res.channel ?? integration.defaultChannelId,
        slackMessageTs: res.ts,
      })
      .where(eq(approvals.id, p.approvalId));
    posted += 1;
  }

  return { posted, skipped };
}

function decryptBotToken(envelope: string): string {
  if (isEnvelope(envelope)) return decrypt<{ token: string }>(envelope).token;
  try {
    const parsed = JSON.parse(envelope);
    if (typeof parsed === 'object' && parsed && typeof parsed.token === 'string') {
      return parsed.token;
    }
  } catch {
    // fallthrough
  }
  return envelope;
}
