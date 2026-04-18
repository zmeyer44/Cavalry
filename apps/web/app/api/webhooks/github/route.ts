import { and, eq } from 'drizzle-orm';
import {
  getDb,
  gitInstallations,
  skillRepos,
  webhookDeliveries,
} from '@cavalry/database';
import {
  createGitHubProvider,
  gitHubAppConfigFromEnv,
} from '@cavalry/git-provider';
import { emitAuditEvent } from '@cavalry/audit';
import { enqueueGitSync } from '@/server/jobs';

export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  const appConfig = gitHubAppConfigFromEnv();
  if (!appConfig) {
    return json({ error: 'github app not configured' }, 503);
  }

  const provider = createGitHubProvider(appConfig);
  const rawBody = Buffer.from(await req.arrayBuffer());
  const verification = await provider.verifyWebhookSignature(req.headers, rawBody);
  if (!verification.ok) {
    return new Response(verification.reason, { status: verification.status });
  }

  const { deliveryId, eventType, payload } = verification;

  // Idempotency: drop duplicate deliveries.
  const db = getDb();
  try {
    await db.insert(webhookDeliveries).values({
      provider: 'github',
      deliveryId,
      eventType,
    });
  } catch {
    // Unique violation → duplicate delivery.
    return json({ ok: true, duplicate: true }, 200);
  }

  switch (eventType) {
    case 'ping':
      return json({ ok: true }, 200);

    case 'installation':
    case 'installation_repositories':
      await handleInstallationEvent(payload);
      return json({ ok: true }, 200);

    case 'push':
    case 'create':
    case 'delete':
      await handleRepoEvent(payload, deliveryId);
      return json({ ok: true }, 200);

    default:
      // Unknown event types are a success from the provider's perspective;
      // we just ignore them.
      return json({ ok: true, ignored: eventType }, 200);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function handleInstallationEvent(payload: Record<string, unknown>): Promise<void> {
  const action = payload.action as string | undefined;
  const installation = payload.installation as
    | {
        id?: number;
        account?: { login?: string; type?: string };
        suspended_at?: string | null;
        permissions?: Record<string, unknown>;
      }
    | undefined;
  if (!installation?.id) return;

  const db = getDb();
  const externalId = String(installation.id);

  if (action === 'deleted') {
    const rows = await db
      .select()
      .from(gitInstallations)
      .where(
        and(
          eq(gitInstallations.provider, 'github'),
          eq(gitInstallations.externalId, externalId),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) return;
    await emitAuditEvent({
      orgId: row.orgId,
      actor: { type: 'system' },
      action: 'git_installation.removed',
      resource: { type: 'git_installation', id: row.id },
      payload: { reason: 'provider_deleted' },
    });
    await db.delete(gitInstallations).where(eq(gitInstallations.id, row.id));
    return;
  }

  if (action === 'suspend' || action === 'unsuspend') {
    await db
      .update(gitInstallations)
      .set({
        suspendedAt: action === 'suspend' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(gitInstallations.provider, 'github'),
          eq(gitInstallations.externalId, externalId),
        ),
      );
    return;
  }

  // created / new_permissions_accepted / etc. — no-op here. The connect flow
  // (install callback) is the authoritative write path for new installations.
}

async function handleRepoEvent(
  payload: Record<string, unknown>,
  deliveryId: string,
): Promise<void> {
  const repoObj = payload.repository as
    | { full_name?: string; name?: string; owner?: { login?: string }; default_branch?: string }
    | undefined;
  const installation = payload.installation as { id?: number } | undefined;
  if (!repoObj?.name || !repoObj.owner?.login || !installation?.id) return;

  const db = getDb();
  const externalId = String(installation.id);
  const repos = await db
    .select()
    .from(skillRepos)
    .innerJoin(
      gitInstallations,
      eq(gitInstallations.id, skillRepos.gitInstallationId),
    )
    .where(
      and(
        eq(skillRepos.provider, 'github'),
        eq(gitInstallations.externalId, externalId),
        eq(skillRepos.owner, repoObj.owner.login),
        eq(skillRepos.repo, repoObj.name),
        eq(skillRepos.enabled, true),
      ),
    );

  if (repos.length === 0) return;

  const ref = (payload.ref as string | undefined) ?? undefined;
  for (const { skill_repos: repo } of repos) {
    await enqueueGitSync({
      skillRepoId: repo.id,
      trigger: 'webhook',
      triggerRef: ref ?? deliveryId,
    });
  }
}
