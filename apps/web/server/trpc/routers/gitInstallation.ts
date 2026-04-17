import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { gitInstallations } from '@cavalry/database';
import { emitAuditEvent } from '@cavalry/audit';
import { router, orgProcedure, adminProcedure } from '../trpc';
import { signInstallState } from '../../state-token';

function publicView(row: typeof gitInstallations.$inferSelect) {
  return {
    id: row.id,
    provider: row.provider as 'github' | 'gitlab' | 'bitbucket',
    externalId: row.externalId,
    accountLogin: row.accountLogin,
    accountType: row.accountType as 'user' | 'organization',
    suspendedAt: row.suspendedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const gitInstallationRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(gitInstallations)
      .where(eq(gitInstallations.orgId, ctx.org.id))
      .orderBy(desc(gitInstallations.createdAt));
    return rows.map(publicView);
  }),

  get: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(gitInstallations)
        .where(
          and(
            eq(gitInstallations.id, input.id),
            eq(gitInstallations.orgId, ctx.org.id),
          ),
        )
        .limit(1);
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      return publicView(row);
    }),

  remove: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(gitInstallations)
        .where(
          and(
            eq(gitInstallations.id, input.id),
            eq(gitInstallations.orgId, ctx.org.id),
          ),
        )
        .limit(1);
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });

      await ctx.db
        .delete(gitInstallations)
        .where(eq(gitInstallations.id, input.id));

      await emitAuditEvent({
        orgId: ctx.org.id,
        actor: { type: 'user', userId: ctx.user.id },
        action: 'git_installation.removed',
        resource: { type: 'git_installation', id: input.id },
        payload: { reason: 'user_initiated' },
      });
      return { ok: true };
    }),

  /**
   * Build the GitHub App install URL with a signed state token. The UI
   * sends the user to this URL; GitHub redirects back to our callback.
   */
  startGitHubInstall: adminProcedure
    .input(z.object({ appSlug: z.string().min(1).max(64).optional() }))
    .mutation(async ({ ctx, input }) => {
      const nonce = cryptoRandom();
      const state = signInstallState({
        orgId: ctx.org.id,
        userId: ctx.user.id,
        nonce,
      });
      const appSlug = input.appSlug ?? process.env.CAVALRY_GITHUB_APP_SLUG;
      if (!appSlug) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'CAVALRY_GITHUB_APP_SLUG is not configured',
        });
      }
      const url = `https://github.com/apps/${encodeURIComponent(appSlug)}/installations/new?state=${encodeURIComponent(state)}`;
      return { url };
    }),
});

function cryptoRandom(): string {
  // 16 bytes of entropy, hex-encoded.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
