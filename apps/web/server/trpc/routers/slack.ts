import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { slackIntegrations } from '@cavalry/database';
import { emitAuditEvent } from '@cavalry/audit';
import { router, orgProcedure, adminProcedure } from '../trpc';

function publicView(row: typeof slackIntegrations.$inferSelect) {
  return {
    id: row.id,
    teamId: row.teamId,
    teamName: row.teamName,
    botUserId: row.botUserId,
    defaultChannelId: row.defaultChannelId,
    enabled: row.enabled,
    createdAt: row.createdAt,
  };
}

export const slackRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(slackIntegrations)
      .where(eq(slackIntegrations.orgId, ctx.org.id))
      .orderBy(desc(slackIntegrations.createdAt));
    return rows.map(publicView);
  }),

  setDefaultChannel: adminProcedure
    .input(
      z.object({
        id: z.string(),
        channelId: z
          .string()
          .regex(/^C[A-Z0-9]+$/, 'Slack channel id (e.g. C01ABC2DEF3)'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(slackIntegrations)
        .where(
          and(
            eq(slackIntegrations.id, input.id),
            eq(slackIntegrations.orgId, ctx.org.id),
          ),
        )
        .limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

      await ctx.db
        .update(slackIntegrations)
        .set({
          defaultChannelId: input.channelId,
          updatedAt: new Date(),
        })
        .where(eq(slackIntegrations.id, input.id));
      return { ok: true };
    }),

  remove: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(slackIntegrations)
        .where(
          and(
            eq(slackIntegrations.id, input.id),
            eq(slackIntegrations.orgId, ctx.org.id),
          ),
        )
        .limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

      await ctx.db.delete(slackIntegrations).where(eq(slackIntegrations.id, input.id));

      await emitAuditEvent({
        orgId: ctx.org.id,
        actor: { type: 'user', userId: ctx.user.id },
        action: 'integration.slack.removed',
        resource: { type: 'slack_integration', id: existing.id },
        payload: { teamId: existing.teamId, teamName: existing.teamName },
      });
      return { ok: true };
    }),
});
