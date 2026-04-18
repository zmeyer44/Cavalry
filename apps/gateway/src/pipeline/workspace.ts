import { and, eq } from 'drizzle-orm';
import { workspaces, type Database } from '@cavalry/database';
import { logger } from '../logger';

/**
 * The `x-cavalry-workspace` header is caller-supplied, so we must verify it
 * identifies a workspace that belongs to the authenticated org. Without this
 * check a token could claim any workspace id — attributing installs to
 * workspaces the token has no business writing to AND making any
 * workspace-scoped policy apply based on unverified caller assertion.
 *
 * Returns the validated workspace id on success, or null if the header was
 * absent OR references a workspace in a different org. Unknown / cross-org
 * claims are silently dropped to `null` rather than erroring; a malformed
 * header is not worth failing the install over.
 */
export async function resolveWorkspaceHeader(params: {
  db: Database;
  orgId: string;
  header: string | null;
}): Promise<string | null> {
  const raw = params.header?.trim();
  if (!raw) return null;

  const rows = await params.db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(
      and(eq(workspaces.id, raw), eq(workspaces.orgId, params.orgId)),
    )
    .limit(1);

  if (rows[0]) return rows[0].id;

  logger.warn(
    { orgId: params.orgId, claimed: raw },
    'dropped x-cavalry-workspace header: workspace not found in this org',
  );
  return null;
}
