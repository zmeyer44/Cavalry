import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { apiTokens } from '@cavalry/database';
import { emitAuditEvent } from '@cavalry/audit';
import { router, orgProcedure, adminProcedure } from '../trpc';
import { generateApiToken } from '@/server/tokens';

const VALID_SCOPES = ['skills:read', 'skills:write', 'skills:install'] as const;

export const tokenRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: apiTokens.id,
        name: apiTokens.name,
        prefix: apiTokens.prefix,
        scopes: apiTokens.scopes,
        expiresAt: apiTokens.expiresAt,
        lastUsedAt: apiTokens.lastUsedAt,
        revokedAt: apiTokens.revokedAt,
        createdAt: apiTokens.createdAt,
      })
      .from(apiTokens)
      .where(eq(apiTokens.orgId, ctx.org.id))
      .orderBy(desc(apiTokens.createdAt));
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        scopes: z.array(z.enum(VALID_SCOPES)).default([]),
        expiresAt: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { token, prefix, hash } = generateApiToken();
      const created = await ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(apiTokens)
          .values({
            orgId: ctx.org.id,
            userId: ctx.user.id,
            name: input.name,
            tokenHash: hash,
            prefix,
            scopes: input.scopes,
            expiresAt: input.expiresAt,
          })
          .returning();
        if (!row) throw new Error('failed to create token');

        await emitAuditEvent({
          orgId: ctx.org.id,
          actor: { type: 'user', userId: ctx.user.id },
          action: 'token.created',
          resource: { type: 'api_token', id: row.id },
          payload: { name: input.name, scopes: input.scopes, prefix },
          request: { ip: ctx.ip ?? undefined, userAgent: ctx.headers.get('user-agent') ?? undefined },
          tx,
        });
        return row;
      });

      return {
        id: created.id,
        name: created.name,
        prefix,
        token,
        scopes: input.scopes,
      };
    }),

  revoke: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .select()
          .from(apiTokens)
          .where(
            and(
              eq(apiTokens.id, input.id),
              eq(apiTokens.orgId, ctx.org.id),
              isNull(apiTokens.revokedAt),
            ),
          )
          .limit(1);
        if (!row) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Token not found or already revoked' });
        }
        await tx.update(apiTokens).set({ revokedAt: new Date() }).where(eq(apiTokens.id, row.id));
        await emitAuditEvent({
          orgId: ctx.org.id,
          actor: { type: 'user', userId: ctx.user.id },
          action: 'token.revoked',
          resource: { type: 'api_token', id: row.id },
          payload: { name: row.name, prefix: row.prefix },
          request: { ip: ctx.ip ?? undefined, userAgent: ctx.headers.get('user-agent') ?? undefined },
          tx,
        });
      });
      return { ok: true };
    }),
});
