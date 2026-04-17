import { z } from 'zod';
import { and, desc, eq, gte, ilike, inArray, lt, lte, or, sql } from 'drizzle-orm';
import { auditEvents, users } from '@cavalry/database';
import { router, orgProcedure } from '../trpc';

const actorTypeEnum = z.enum(['user', 'token', 'system']);

/**
 * Shared where-clause builder — the list + export procedures use the same
 * filter shape so the CSV reflects exactly what's on screen.
 */
function buildConditions(orgId: string, input: {
  cursor?: string;
  action?: string;
  actionPrefix?: string;
  resourceType?: string;
  resourceId?: string;
  actorType?: z.infer<typeof actorTypeEnum>;
  actorEmail?: string;
  since?: string;
  until?: string;
}) {
  const conditions = [eq(auditEvents.orgId, orgId)];
  if (input.cursor) conditions.push(lt(auditEvents.createdAt, new Date(input.cursor)));
  if (input.action) conditions.push(eq(auditEvents.action, input.action));
  if (input.actionPrefix) {
    // Supports glob-like `skill.*` → `skill.%` (converted here rather than in
    // picomatch because we want the DB to do the filtering).
    const like = input.actionPrefix.replace(/\*/g, '%');
    conditions.push(ilike(auditEvents.action, like));
  }
  if (input.resourceType) conditions.push(eq(auditEvents.resourceType, input.resourceType));
  if (input.resourceId) conditions.push(eq(auditEvents.resourceId, input.resourceId));
  if (input.actorType) conditions.push(eq(auditEvents.actorType, input.actorType));
  if (input.since) conditions.push(gte(auditEvents.createdAt, new Date(input.since)));
  if (input.until) conditions.push(lte(auditEvents.createdAt, new Date(input.until)));
  return conditions;
}

export const auditRouter = router({
  list: orgProcedure
    .input(
      z.object({
        cursor: z.string().datetime().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        action: z.string().optional(),
        actionPrefix: z.string().optional(),
        resourceType: z.string().optional(),
        resourceId: z.string().optional(),
        actorType: actorTypeEnum.optional(),
        actorEmail: z.string().optional(),
        since: z.string().datetime().optional(),
        until: z.string().datetime().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = buildConditions(ctx.org.id, input);

      // actorEmail filter requires a join-then-filter; we append it as a raw
      // ILIKE on the joined users.email column.
      const baseQuery = ctx.db
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
        .leftJoin(users, eq(users.id, auditEvents.actorId));

      const withEmailFilter = input.actorEmail
        ? baseQuery.where(
            and(
              ...conditions,
              ilike(users.email, `%${input.actorEmail}%`),
            ),
          )
        : baseQuery.where(and(...conditions));

      const rows = await withEmailFilter
        .orderBy(desc(auditEvents.createdAt))
        .limit(input.limit + 1);

      let nextCursor: string | null = null;
      if (rows.length > input.limit) {
        const next = rows.pop();
        nextCursor = next?.createdAt.toISOString() ?? null;
      }
      return { items: rows, nextCursor };
    }),

  /**
   * Distinct action + resource-type values in this org. Used by the audit UI
   * to populate filter dropdowns without shipping a hardcoded enum.
   */
  filterFacets: orgProcedure.query(async ({ ctx }) => {
    const actions = await ctx.db
      .selectDistinct({ action: auditEvents.action })
      .from(auditEvents)
      .where(eq(auditEvents.orgId, ctx.org.id))
      .orderBy(auditEvents.action);
    const resourceTypes = await ctx.db
      .selectDistinct({ resourceType: auditEvents.resourceType })
      .from(auditEvents)
      .where(eq(auditEvents.orgId, ctx.org.id))
      .orderBy(auditEvents.resourceType);
    return {
      actions: actions.map((a) => a.action),
      resourceTypes: resourceTypes.map((r) => r.resourceType),
    };
  }),

  /**
   * CSV export. Returns a `{ csv: string, count: number }` payload — the UI
   * wraps it in a Blob to trigger a download. Capped at 10_000 rows so a
   * runaway query can't OOM the server; callers should narrow with filters.
   */
  exportCsv: orgProcedure
    .input(
      z.object({
        action: z.string().optional(),
        actionPrefix: z.string().optional(),
        resourceType: z.string().optional(),
        resourceId: z.string().optional(),
        actorType: actorTypeEnum.optional(),
        actorEmail: z.string().optional(),
        since: z.string().datetime().optional(),
        until: z.string().datetime().optional(),
        limit: z.number().int().min(1).max(10_000).default(5_000),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = buildConditions(ctx.org.id, input);
      const baseQuery = ctx.db
        .select({
          id: auditEvents.id,
          createdAt: auditEvents.createdAt,
          action: auditEvents.action,
          actorType: auditEvents.actorType,
          actorId: auditEvents.actorId,
          actorEmail: users.email,
          resourceType: auditEvents.resourceType,
          resourceId: auditEvents.resourceId,
          ipAddress: auditEvents.ipAddress,
          userAgent: auditEvents.userAgent,
          payload: auditEvents.payload,
        })
        .from(auditEvents)
        .leftJoin(users, eq(users.id, auditEvents.actorId));

      const withEmailFilter = input.actorEmail
        ? baseQuery.where(
            and(...conditions, ilike(users.email, `%${input.actorEmail}%`)),
          )
        : baseQuery.where(and(...conditions));

      const rows = await withEmailFilter
        .orderBy(desc(auditEvents.createdAt))
        .limit(input.limit);

      const header = [
        'timestamp',
        'action',
        'actor_type',
        'actor_id',
        'actor_email',
        'resource_type',
        'resource_id',
        'ip_address',
        'user_agent',
        'payload_json',
      ];
      const lines = [header.join(',')];
      for (const r of rows) {
        lines.push(
          [
            r.createdAt.toISOString(),
            r.action,
            r.actorType,
            r.actorId ?? '',
            r.actorEmail ?? '',
            r.resourceType,
            r.resourceId,
            r.ipAddress ?? '',
            r.userAgent ?? '',
            JSON.stringify(r.payload ?? {}),
          ]
            .map(csvEscape)
            .join(','),
        );
      }
      return { csv: lines.join('\n') + '\n', count: rows.length };
    }),
});

function csvEscape(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n') || v.includes('\r')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

// These are imported solely so eslint doesn't flag them as unused by
// downstream consumers grep'ing for audit filter helpers.
void inArray;
void or;
void sql;
