import { and, eq } from 'drizzle-orm';
import { getDb, memberships, organizations } from '@cavalry/database';
import { slackConfigFromEnv } from '@cavalry/slack';
import { getServerSession } from '@cavalry/auth';
import { signInstallState } from '@/server/state-token';

export const dynamic = 'force-dynamic';

/**
 * Kick off the Slack OAuth install flow. Caller must be an admin of the org
 * they want to connect. We sign a short-lived state token so the callback
 * can verify the install belongs to this user+org.
 */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const orgId = url.searchParams.get('org');
  if (!orgId) return new Response('org is required', { status: 400 });

  const config = slackConfigFromEnv();
  if (!config) {
    return new Response('slack app not configured', { status: 503 });
  }

  const session = await getServerSession(req);
  if (!session?.user) {
    return Response.redirect(new URL('/login', req.url), 302);
  }

  // Confirm membership + admin role.
  const db = getDb();
  const rows = await db
    .select({
      role: memberships.role,
      orgSlug: organizations.slug,
    })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.orgId))
    .where(
      and(
        eq(memberships.userId, session.user.id),
        eq(memberships.orgId, orgId),
      ),
    )
    .limit(1);
  const member = rows[0];
  if (!member) return new Response('not a member of this org', { status: 403 });
  if (member.role !== 'owner' && member.role !== 'admin') {
    return new Response('admin role required', { status: 403 });
  }

  const state = signInstallState({
    orgId,
    userId: session.user.id,
    nonce: cryptoRandom(),
  });

  const redirectUri = `${process.env.CAVALRY_WEB_URL ?? url.origin}/api/integrations/slack/callback`;
  const authUrl = new URL('https://slack.com/oauth/v2/authorize');
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('scope', config.scopes.join(','));
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);
  return Response.redirect(authUrl, 302);
}

function cryptoRandom(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
