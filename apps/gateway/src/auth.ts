import { createMiddleware } from 'hono/factory';
import { and, eq, isNull } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import {
  apiTokens,
  organizations,
  getDb,
  type Database,
} from '@cavalry/database';

export interface AuthContext {
  db: Database;
  orgId: string;
  orgSlug: string;
  tokenId: string;
  userId: string | null;
  scopes: string[];
}

declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export const requireToken = createMiddleware(async (c, next) => {
  const header = c.req.header('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return c.json(
      {
        type: 'https://cavalry.sh/errors/unauthorized',
        title: 'unauthorized',
        status: 401,
        detail: 'Missing Bearer token',
      },
      401,
    );
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    return c.json({ title: 'unauthorized', status: 401, detail: 'Empty Bearer token' }, 401);
  }

  const db = getDb();
  const hash = hashToken(token);
  const [row] = await db
    .select({
      tokenId: apiTokens.id,
      userId: apiTokens.userId,
      scopes: apiTokens.scopes,
      expiresAt: apiTokens.expiresAt,
      orgId: organizations.id,
      orgSlug: organizations.slug,
    })
    .from(apiTokens)
    .innerJoin(organizations, eq(apiTokens.orgId, organizations.id))
    .where(and(eq(apiTokens.tokenHash, hash), isNull(apiTokens.revokedAt)))
    .limit(1);

  if (!row) {
    return c.json({ title: 'unauthorized', status: 401, detail: 'Invalid token' }, 401);
  }
  if (row.expiresAt && row.expiresAt < new Date()) {
    return c.json({ title: 'unauthorized', status: 401, detail: 'Token expired' }, 401);
  }

  // Best-effort update; don't block the request
  db.update(apiTokens).set({ lastUsedAt: new Date() }).where(eq(apiTokens.id, row.tokenId)).catch(() => {});

  c.set('auth', {
    db,
    orgId: row.orgId,
    orgSlug: row.orgSlug,
    tokenId: row.tokenId,
    userId: row.userId,
    scopes: row.scopes,
  });
  await next();
});

export function requireScope(scope: string) {
  return createMiddleware(async (c, next) => {
    const auth = c.get('auth');
    if (!auth.scopes.includes(scope)) {
      return c.json(
        {
          title: 'forbidden',
          status: 403,
          detail: `Token missing required scope: ${scope}`,
        },
        403,
      );
    }
    await next();
  });
}

export { hashToken };
