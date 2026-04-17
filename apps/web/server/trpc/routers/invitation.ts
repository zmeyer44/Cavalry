import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { and, eq, gte } from 'drizzle-orm';
import { invitations, memberships, organizations } from '@cavalry/database';
import { emitAuditEvent } from '@cavalry/audit';
import { router, authedProcedure, publicProcedure } from '../trpc';
import { hashToken } from '@/server/tokens';

const tokenSchema = z.object({ token: z.string().min(1) });

export const invitationRouter = router({
  preview: publicProcedure.input(tokenSchema).query(async ({ ctx, input }) => {
    const hash = hashToken(input.token);
    const [row] = await ctx.db
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        status: invitations.status,
        expiresAt: invitations.expiresAt,
        orgName: organizations.name,
        orgSlug: organizations.slug,
      })
      .from(invitations)
      .innerJoin(organizations, eq(organizations.id, invitations.orgId))
      .where(
        and(
          eq(invitations.tokenHash, hash),
          eq(invitations.status, 'pending'),
          gte(invitations.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!row) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found or expired' });
    }
    return row;
  }),

  accept: authedProcedure.input(tokenSchema).mutation(async ({ ctx, input }) => {
    const hash = hashToken(input.token);
    const result = await ctx.db.transaction(async (tx) => {
      const [inv] = await tx
        .select({
          id: invitations.id,
          orgId: invitations.orgId,
          email: invitations.email,
          role: invitations.role,
          status: invitations.status,
          expiresAt: invitations.expiresAt,
          orgSlug: organizations.slug,
        })
        .from(invitations)
        .innerJoin(organizations, eq(organizations.id, invitations.orgId))
        .where(eq(invitations.tokenHash, hash))
        .limit(1);

      if (!inv || inv.status !== 'pending' || inv.expiresAt < new Date()) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invitation not found or expired',
        });
      }

      if (inv.email.toLowerCase() !== ctx.user.email.toLowerCase()) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Signed-in user email does not match invitation',
        });
      }

      const [existing] = await tx
        .select({ id: memberships.id })
        .from(memberships)
        .where(and(eq(memberships.orgId, inv.orgId), eq(memberships.userId, ctx.user.id)))
        .limit(1);

      if (!existing) {
        await tx.insert(memberships).values({
          orgId: inv.orgId,
          userId: ctx.user.id,
          role: inv.role,
        });
      }

      await tx
        .update(invitations)
        .set({ status: 'accepted', acceptedAt: new Date() })
        .where(eq(invitations.id, inv.id));

      await emitAuditEvent({
        orgId: inv.orgId,
        actor: { type: 'user', userId: ctx.user.id },
        action: 'member.joined',
        resource: { type: 'user', id: ctx.user.id },
        payload: { invitationId: inv.id, role: inv.role },
        request: { ip: ctx.ip ?? undefined, userAgent: ctx.headers.get('user-agent') ?? undefined },
        tx,
      });

      return { orgSlug: inv.orgSlug };
    });

    return result;
  }),
});
