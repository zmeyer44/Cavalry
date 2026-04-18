import { and, eq } from 'drizzle-orm';
import {
  getDb,
  gitInstallations,
  organizations,
} from '@cavalry/database';
import {
  createGitHubProvider,
  gitHubAppConfigFromEnv,
} from '@cavalry/git-provider';
import { emitAuditEvent } from '@cavalry/audit';
import { verifyInstallState } from '@/server/state-token';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const installationIdParam = url.searchParams.get('installation_id');
  const state = url.searchParams.get('state');
  const setupAction = url.searchParams.get('setup_action');

  if (!installationIdParam || !state) {
    return errorResponse('missing installation_id or state', 400);
  }

  const stateResult = verifyInstallState(state);
  if (!stateResult.ok) {
    return errorResponse(`invalid state: ${stateResult.reason}`, 400);
  }
  const { orgId, userId } = stateResult.value;

  const appConfig = gitHubAppConfigFromEnv();
  if (!appConfig) {
    return errorResponse('github app not configured', 503);
  }

  const provider = createGitHubProvider(appConfig);
  const externalId = installationIdParam;

  // Look up the installation via the App-level listing so we capture the
  // account login + type. We filter on the numeric id.
  let accountLogin = '';
  let accountType: 'user' | 'organization' = 'organization';
  let permissions: Record<string, unknown> = {};
  for (const installation of await provider.listInstallations()) {
    if (installation.externalId === externalId) {
      accountLogin = installation.accountLogin;
      accountType = installation.accountType;
      permissions = installation.permissions;
      break;
    }
  }

  const db = getDb();
  // Confirm the user still has access to this org before writing.
  const orgRow = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  const org = orgRow[0];
  if (!org) return errorResponse('org not found', 404);

  const existing = await db
    .select()
    .from(gitInstallations)
    .where(
      and(
        eq(gitInstallations.orgId, orgId),
        eq(gitInstallations.provider, 'github'),
        eq(gitInstallations.externalId, externalId),
      ),
    )
    .limit(1);

  let installationId: string;
  if (existing[0]) {
    installationId = existing[0].id;
    await db
      .update(gitInstallations)
      .set({
        accountLogin,
        accountType,
        permissions,
        suspendedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(gitInstallations.id, installationId));
  } else {
    const [created] = await db
      .insert(gitInstallations)
      .values({
        orgId,
        provider: 'github',
        externalId,
        accountLogin,
        accountType,
        installedBy: userId,
        permissions,
      })
      .returning();
    if (!created) return errorResponse('failed to persist installation', 500);
    installationId = created.id;

    await emitAuditEvent({
      orgId,
      actor: { type: 'user', userId },
      action: 'git_installation.created',
      resource: { type: 'git_installation', id: installationId },
      payload: { externalId, accountLogin, accountType, setupAction },
    });
  }

  return Response.redirect(
    new URL(`/${org.slug}/skill-repos/connect?installation=${installationId}`, req.url),
    302,
  );
}

function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
