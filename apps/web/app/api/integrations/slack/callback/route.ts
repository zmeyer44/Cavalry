import { and, eq } from 'drizzle-orm';
import {
  getDb,
  organizations,
  slackIntegrations,
} from '@cavalry/database';
import { exchangeOAuthCode, slackConfigFromEnv } from '@cavalry/slack';
import { encrypt } from '@cavalry/registry-upstream';
import { emitAuditEvent } from '@cavalry/audit';
import { verifyInstallState } from '@/server/state-token';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) {
    return new Response('code and state required', { status: 400 });
  }

  const stateResult = verifyInstallState(state);
  if (!stateResult.ok) {
    return new Response(`invalid state: ${stateResult.reason}`, { status: 400 });
  }

  const config = slackConfigFromEnv();
  if (!config) return new Response('slack app not configured', { status: 503 });

  const redirectUri = `${process.env.CAVALRY_WEB_URL ?? url.origin}/api/integrations/slack/callback`;
  const exchange = await exchangeOAuthCode({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    code,
    redirectUri,
  });

  if (!exchange.ok || !exchange.access_token || !exchange.team) {
    return new Response(`slack oauth failed: ${exchange.error ?? 'unknown'}`, {
      status: 400,
    });
  }

  const db = getDb();
  const [org] = await db
    .select({ id: organizations.id, slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.id, stateResult.value.orgId))
    .limit(1);
  if (!org) return new Response('org not found', { status: 404 });

  const encryptedToken = encrypt({ token: exchange.access_token }) as unknown as string;

  const existing = await db
    .select()
    .from(slackIntegrations)
    .where(
      and(
        eq(slackIntegrations.orgId, org.id),
        eq(slackIntegrations.teamId, exchange.team.id),
      ),
    )
    .limit(1);

  let integrationId: string;
  if (existing[0]) {
    integrationId = existing[0].id;
    await db
      .update(slackIntegrations)
      .set({
        botToken: encryptedToken,
        botUserId: exchange.bot_user_id ?? null,
        teamName: exchange.team.name,
        enabled: true,
        updatedAt: new Date(),
      })
      .where(eq(slackIntegrations.id, integrationId));
  } else {
    const [created] = await db
      .insert(slackIntegrations)
      .values({
        orgId: org.id,
        teamId: exchange.team.id,
        teamName: exchange.team.name,
        botToken: encryptedToken,
        botUserId: exchange.bot_user_id ?? null,
        installedBy: stateResult.value.userId,
      })
      .returning({ id: slackIntegrations.id });
    if (!created) return new Response('failed to persist slack', { status: 500 });
    integrationId = created.id;
  }

  await emitAuditEvent({
    orgId: org.id,
    actor: { type: 'user', userId: stateResult.value.userId },
    action: 'integration.slack.installed',
    resource: { type: 'slack_integration', id: integrationId },
    payload: {
      teamId: exchange.team.id,
      teamName: exchange.team.name,
    },
  });

  return Response.redirect(
    new URL(`/${org.slug}/settings/integrations?slack=connected`, req.url),
    302,
  );
}
