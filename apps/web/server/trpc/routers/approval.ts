import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { and, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import {
  approvals,
  installs,
  policyEvaluations,
  policies,
  users,
} from '@cavalry/database';
import { emitAuditEvent } from '@cavalry/audit';
import { router, orgProcedure, adminProcedure } from '../trpc';

const STATUSES = ['pending', 'approved', 'denied', 'expired'] as const;

function approvalView(row: {
  id: string;
  orgId: string;
  installId: string;
  status: string;
  decidedAt: Date | null;
  reason: string | null;
  createdAt: Date;
  expiresAt: Date | null;
  requestedBy: string | null;
  decidedBy: string | null;
  requesterName: string | null;
  requesterEmail: string | null;
  deciderName: string | null;
  deciderEmail: string | null;
  skillRef: string;
  resolvedVersion: string | null;
  workspaceId: string | null;
  projectIdentifier: string | null;
  installMetadata: Record<string, unknown> | null;
}) {
  return {
    id: row.id,
    orgId: row.orgId,
    installId: row.installId,
    status: row.status as (typeof STATUSES)[number],
    createdAt: row.createdAt,
    decidedAt: row.decidedAt,
    expiresAt: row.expiresAt,
    reason: row.reason,
    requester:
      row.requestedBy !== null
        ? {
            id: row.requestedBy,
            name: row.requesterName,
            email: row.requesterEmail,
          }
        : null,
    decider:
      row.decidedBy !== null
        ? {
            id: row.decidedBy,
            name: row.deciderName,
            email: row.deciderEmail,
          }
        : null,
    install: {
      id: row.installId,
      skillRef: row.skillRef,
      resolvedVersion: row.resolvedVersion,
      workspaceId: row.workspaceId,
      projectIdentifier: row.projectIdentifier,
      metadata: row.installMetadata ?? {},
    },
  };
}

const requesterUsers = () => ({ name: users.name, email: users.email });

export const approvalRouter = router({
  list: orgProcedure
    .input(
      z
        .object({
          status: z.enum(STATUSES).optional(),
          limit: z.number().min(1).max(200).default(50),
          cursor: z.string().optional(),
        })
        .default({ limit: 50 }),
    )
    .query(async ({ ctx, input }) => {
      const requester = users as unknown as typeof users;
      const decider = users as unknown as typeof users;

      const whereClauses = [eq(approvals.orgId, ctx.org.id)];
      if (input.status) whereClauses.push(eq(approvals.status, input.status));
      if (input.cursor) {
        whereClauses.push(lt(approvals.createdAt, new Date(input.cursor)));
      }

      const rows = await ctx.db
        .select({
          id: approvals.id,
          orgId: approvals.orgId,
          installId: approvals.installId,
          status: approvals.status,
          decidedAt: approvals.decidedAt,
          reason: approvals.reason,
          createdAt: approvals.createdAt,
          expiresAt: approvals.expiresAt,
          requestedBy: approvals.requestedBy,
          decidedBy: approvals.decidedBy,
          requesterName: requester.name,
          requesterEmail: requester.email,
          deciderName: sql<string | null>`NULL`.as('decider_name'),
          deciderEmail: sql<string | null>`NULL`.as('decider_email'),
          skillRef: installs.skillRef,
          resolvedVersion: installs.resolvedVersion,
          workspaceId: installs.workspaceId,
          projectIdentifier: installs.projectIdentifier,
          installMetadata: installs.metadata,
        })
        .from(approvals)
        .leftJoin(requester, eq(requester.id, approvals.requestedBy))
        .innerJoin(installs, eq(installs.id, approvals.installId))
        .where(and(...whereClauses))
        .orderBy(desc(approvals.createdAt))
        .limit(input.limit + 1);

      // Hydrate decider names in a second pass to avoid a self-join that
      // drizzle's types fight against.
      const deciderIds = rows
        .map((r) => r.decidedBy)
        .filter((v): v is string => typeof v === 'string');
      const deciderMap = new Map<string, { name: string | null; email: string | null }>();
      if (deciderIds.length > 0) {
        const deciderRows = await ctx.db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(inArray(users.id, deciderIds));
        for (const u of deciderRows) {
          deciderMap.set(u.id, { name: u.name, email: u.email });
        }
      }

      const enriched = rows.map((r) => {
        const decider = r.decidedBy ? deciderMap.get(r.decidedBy) ?? null : null;
        return {
          ...r,
          deciderName: decider?.name ?? null,
          deciderEmail: decider?.email ?? null,
          installMetadata: (r.installMetadata ?? null) as Record<string, unknown> | null,
        };
      });

      const hasMore = enriched.length > input.limit;
      const items = enriched.slice(0, input.limit).map(approvalView);
      const last = items[items.length - 1];
      return {
        items,
        nextCursor: hasMore && last ? last.createdAt.toISOString() : null,
      };
    }),

  get: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: approvals.id,
          orgId: approvals.orgId,
          installId: approvals.installId,
          status: approvals.status,
          decidedAt: approvals.decidedAt,
          reason: approvals.reason,
          createdAt: approvals.createdAt,
          expiresAt: approvals.expiresAt,
          requestedBy: approvals.requestedBy,
          decidedBy: approvals.decidedBy,
          requesterName: users.name,
          requesterEmail: users.email,
          skillRef: installs.skillRef,
          resolvedVersion: installs.resolvedVersion,
          workspaceId: installs.workspaceId,
          projectIdentifier: installs.projectIdentifier,
          installMetadata: installs.metadata,
        })
        .from(approvals)
        .leftJoin(users, eq(users.id, approvals.requestedBy))
        .innerJoin(installs, eq(installs.id, approvals.installId))
        .where(
          and(
            eq(approvals.id, input.id),
            eq(approvals.orgId, ctx.org.id),
          ),
        )
        .limit(1);
      const row = rows[0];
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });

      // Fetch evaluations so UI can show why approval was requested.
      const evals = await ctx.db
        .select({
          policyId: policyEvaluations.policyId,
          matched: policyEvaluations.matched,
          result: policyEvaluations.result,
          reason: policyEvaluations.reason,
          policyName: policies.name,
          policyType: policies.type,
        })
        .from(policyEvaluations)
        .innerJoin(policies, eq(policies.id, policyEvaluations.policyId))
        .where(eq(policyEvaluations.installId, row.installId));

      const view = approvalView({
        ...row,
        deciderName: null,
        deciderEmail: null,
        installMetadata: (row.installMetadata ?? null) as
          | Record<string, unknown>
          | null,
      });
      return { ...view, evaluations: evals };
    }),

  decide: adminProcedure
    .input(
      z.object({
        id: z.string(),
        decision: z.enum(['approved', 'denied']),
        reason: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(approvals)
        .where(
          and(eq(approvals.id, input.id), eq(approvals.orgId, ctx.org.id)),
        )
        .limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      if (existing.status !== 'pending') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Approval already ${existing.status}`,
        });
      }

      const [updated] = await ctx.db
        .update(approvals)
        .set({
          status: input.decision,
          decidedBy: ctx.user.id,
          decidedAt: new Date(),
          reason: input.reason ?? null,
        })
        .where(eq(approvals.id, input.id))
        .returning();
      if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      await emitAuditEvent({
        orgId: ctx.org.id,
        actor: { type: 'user', userId: ctx.user.id },
        action: 'approval.decided',
        resource: { type: 'approval', id: updated.id },
        payload: {
          decision: input.decision,
          reason: input.reason ?? null,
          installId: updated.installId,
        },
      });

      return { ok: true, status: updated.status };
    }),
});
