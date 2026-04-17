import { z } from 'zod';
import { and, desc, eq, lt } from 'drizzle-orm';
import { auditEvents, users } from '@cavalry/database';
import { router, orgProcedure } from '../trpc';

export const auditRouter = router({
  list: orgProcedure
    .input(
      z.object({
        cursor: z.string().datetime().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        action: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(auditEvents.orgId, ctx.org.id)];
      if (input.cursor) conditions.push(lt(auditEvents.createdAt, new Date(input.cursor)));
      if (input.action) conditions.push(eq(auditEvents.action, input.action));

      const rows = await ctx.db
        .select({
          id: auditEvents.id,
          action: auditEvents.action,
          actorType: auditEvents.actorType,
          actorId: auditEvents.actorId,
          actorEmail: users.email,
          actorName: users.name,
          resourceType: auditEvents.resourceType,
          resourceId: auditEvents.resourceId,
          payload: auditEvents.payload,
          ipAddress: auditEvents.ipAddress,
          createdAt: auditEvents.createdAt,
        })
        .from(auditEvents)
        .leftJoin(users, eq(users.id, auditEvents.actorId))
        .where(and(...conditions))
        .orderBy(desc(auditEvents.createdAt))
        .limit(input.limit + 1);

      let nextCursor: string | null = null;
      if (rows.length > input.limit) {
        const next = rows.pop();
        nextCursor = next?.createdAt.toISOString() ?? null;
      }
      return { items: rows, nextCursor };
    }),
});
