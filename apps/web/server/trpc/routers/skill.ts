import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { and, desc, eq, sql, gte, count } from 'drizzle-orm';
import { skills, skillVersions, installs, users } from '@cavalry/database';
import { namespaceSchema, skillNameSchema } from '@cavalry/common';
import { router, orgProcedure } from '../trpc';

export const skillRouter = router({
  list: orgProcedure
    .input(
      z
        .object({
          query: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const latestSubquery = ctx.db
        .select({
          skillId: skillVersions.skillId,
          latestVersion: sql<string>`max(${skillVersions.version})`.as('latest_version'),
          latestAt: sql<Date>`max(${skillVersions.publishedAt})`.as('latest_at'),
          versionCount: sql<number>`count(${skillVersions.id})::int`.as('version_count'),
        })
        .from(skillVersions)
        .groupBy(skillVersions.skillId)
        .as('latest');

      const rows = await ctx.db
        .select({
          id: skills.id,
          namespace: skills.namespace,
          name: skills.name,
          description: skills.description,
          createdAt: skills.createdAt,
          latestVersion: latestSubquery.latestVersion,
          latestAt: latestSubquery.latestAt,
          versionCount: latestSubquery.versionCount,
        })
        .from(skills)
        .leftJoin(latestSubquery, eq(latestSubquery.skillId, skills.id))
        .where(eq(skills.orgId, ctx.org.id))
        .orderBy(desc(skills.updatedAt))
        .limit(limit);
      return rows;
    }),

  get: orgProcedure
    .input(z.object({ namespace: namespaceSchema, name: skillNameSchema }))
    .query(async ({ ctx, input }) => {
      const [skill] = await ctx.db
        .select()
        .from(skills)
        .where(
          and(
            eq(skills.orgId, ctx.org.id),
            eq(skills.namespace, input.namespace),
            eq(skills.name, input.name),
          ),
        )
        .limit(1);
      if (!skill) throw new TRPCError({ code: 'NOT_FOUND' });
      return skill;
    }),

  listVersions: orgProcedure
    .input(z.object({ namespace: namespaceSchema, name: skillNameSchema }))
    .query(async ({ ctx, input }) => {
      const [skill] = await ctx.db
        .select({ id: skills.id })
        .from(skills)
        .where(
          and(
            eq(skills.orgId, ctx.org.id),
            eq(skills.namespace, input.namespace),
            eq(skills.name, input.name),
          ),
        )
        .limit(1);
      if (!skill) throw new TRPCError({ code: 'NOT_FOUND' });
      return ctx.db
        .select({
          id: skillVersions.id,
          version: skillVersions.version,
          artifactHash: skillVersions.artifactHash,
          artifactSizeBytes: skillVersions.artifactSizeBytes,
          publishedAt: skillVersions.publishedAt,
          publisherId: skillVersions.publishedBy,
          publisherEmail: users.email,
        })
        .from(skillVersions)
        .leftJoin(users, eq(users.id, skillVersions.publishedBy))
        .where(eq(skillVersions.skillId, skill.id))
        .orderBy(desc(skillVersions.publishedAt));
    }),

  getUsage: orgProcedure
    .input(
      z.object({
        namespace: namespaceSchema,
        name: skillNameSchema,
        window: z.enum(['7d', '30d', '90d']).default('30d'),
      }),
    )
    .query(async ({ ctx, input }) => {
      const [skill] = await ctx.db
        .select({ id: skills.id })
        .from(skills)
        .where(
          and(
            eq(skills.orgId, ctx.org.id),
            eq(skills.namespace, input.namespace),
            eq(skills.name, input.name),
          ),
        )
        .limit(1);
      if (!skill) throw new TRPCError({ code: 'NOT_FOUND' });

      const days = input.window === '7d' ? 7 : input.window === '30d' ? 30 : 90;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const refPrefix = `${input.namespace}/${input.name}`;

      const [totals] = await ctx.db
        .select({ installs: count() })
        .from(installs)
        .where(
          and(
            eq(installs.orgId, ctx.org.id),
            eq(installs.skillRef, `${refPrefix}@latest`),
            gte(installs.createdAt, since),
          ),
        );

      const [byRef] = await ctx.db
        .select({ installs: count() })
        .from(installs)
        .where(
          and(
            eq(installs.orgId, ctx.org.id),
            sql`${installs.skillRef} LIKE ${`${refPrefix}@%`}`,
            gte(installs.createdAt, since),
          ),
        );

      return {
        window: input.window,
        totalInstalls: byRef?.installs ?? 0,
        latestInstalls: totals?.installs ?? 0,
      };
    }),
});
