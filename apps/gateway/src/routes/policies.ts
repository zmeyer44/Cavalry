import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import { policies } from '@cavalry/database';
import { requireToken } from '../auth';

export const policiesRouter = new Hono();
policiesRouter.use('*', requireToken);

/**
 * GET /v1/policies
 *
 * Read-only projection of policies for the caller's org. Used by `cavalry
 * policy list`. Intentionally does NOT leak `config` — patterns and ranges
 * can contain sensitive business logic. For details, callers use the web UI.
 */
policiesRouter.get('/v1/policies', async (c) => {
  const auth = c.get('auth');
  const rows = await auth.db
    .select({
      id: policies.id,
      name: policies.name,
      type: policies.type,
      scopeType: policies.scopeType,
      scopeId: policies.scopeId,
      priority: policies.priority,
      enabled: policies.enabled,
    })
    .from(policies)
    .where(eq(policies.orgId, auth.orgId))
    .orderBy(desc(policies.priority), desc(policies.createdAt));

  return c.json({ policies: rows });
});
