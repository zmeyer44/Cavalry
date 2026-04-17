import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { policies } from '@cavalry/database';
import { emitAuditEvent } from '@cavalry/audit';
import {
  evaluate,
  policyConfigSchemas,
  type PolicyRow,
  type PolicyType,
} from '@cavalry/policy';
import { router, orgProcedure, adminProcedure } from '../trpc';

const POLICY_TYPES = [
  'allowlist',
  'blocklist',
  'version_pin',
  'require_approval',
] as const satisfies readonly PolicyType[];

const nameSchema = z.string().min(1).max(255);
const scopeSchema = z.enum(['org', 'workspace']);

/**
 * Per-type config validators, picked dynamically on create/update/preview.
 * Using a discriminated union at the input level would be cleaner but the
 * union's shape depends on the string key, which Zod handles below.
 */
const configForType = (type: PolicyType): z.ZodTypeAny => policyConfigSchemas[type];

const createInputSchema = z
  .object({
    name: nameSchema,
    type: z.enum(POLICY_TYPES),
    scopeType: scopeSchema.default('org'),
    scopeId: z.string().nullable().default(null),
    priority: z.number().int().min(0).max(1000).default(0),
    enabled: z.boolean().default(true),
    config: z.unknown(),
  })
  .refine(
    (v) => {
      const parsed = configForType(v.type).safeParse(v.config);
      return parsed.success;
    },
    {
      message: 'config shape does not match policy type',
      path: ['config'],
    },
  );

const updateInputSchema = z.object({
  id: z.string(),
  name: nameSchema.optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  enabled: z.boolean().optional(),
  config: z.unknown().optional(),
});

function publicView(row: typeof policies.$inferSelect) {
  return {
    id: row.id,
    orgId: row.orgId,
    name: row.name,
    type: row.type as PolicyType,
    scopeType: row.scopeType as 'org' | 'workspace',
    scopeId: row.scopeId,
    priority: row.priority,
    enabled: row.enabled,
    config: row.config,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const policyRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(policies)
      .where(eq(policies.orgId, ctx.org.id))
      .orderBy(desc(policies.priority), desc(policies.createdAt));
    return rows.map(publicView);
  }),

  get: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(policies)
        .where(and(eq(policies.id, input.id), eq(policies.orgId, ctx.org.id)))
        .limit(1);
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      return publicView(row);
    }),

  create: adminProcedure
    .input(createInputSchema)
    .mutation(async ({ ctx, input }) => {
      const validatedConfig = configForType(input.type).parse(input.config) as Record<
        string,
        unknown
      >;
      const [created] = await ctx.db
        .insert(policies)
        .values({
          orgId: ctx.org.id,
          name: input.name,
          type: input.type,
          scopeType: input.scopeType,
          scopeId: input.scopeId,
          priority: input.priority,
          enabled: input.enabled,
          config: validatedConfig,
        })
        .returning();
      if (!created) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      await emitAuditEvent({
        orgId: ctx.org.id,
        actor: { type: 'user', userId: ctx.user.id },
        action: 'policy.created',
        resource: { type: 'policy', id: created.id },
        payload: { name: created.name, type: created.type },
      });

      return publicView(created);
    }),

  update: adminProcedure
    .input(updateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(policies)
        .where(
          and(eq(policies.id, input.id), eq(policies.orgId, ctx.org.id)),
        )
        .limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (input.name !== undefined) patch.name = input.name;
      if (input.priority !== undefined) patch.priority = input.priority;
      if (input.enabled !== undefined) patch.enabled = input.enabled;
      if (input.config !== undefined) {
        patch.config = configForType(existing.type as PolicyType).parse(
          input.config,
        ) as Record<string, unknown>;
      }

      const [updated] = await ctx.db
        .update(policies)
        .set(patch)
        .where(eq(policies.id, input.id))
        .returning();
      if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      await emitAuditEvent({
        orgId: ctx.org.id,
        actor: { type: 'user', userId: ctx.user.id },
        action: 'policy.updated',
        resource: { type: 'policy', id: updated.id },
        payload: {
          name: updated.name,
          type: updated.type,
          changes: Object.keys(patch).filter((k) => k !== 'updatedAt'),
        },
      });

      return publicView(updated);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(policies)
        .where(
          and(eq(policies.id, input.id), eq(policies.orgId, ctx.org.id)),
        )
        .limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

      await ctx.db.delete(policies).where(eq(policies.id, input.id));

      await emitAuditEvent({
        orgId: ctx.org.id,
        actor: { type: 'user', userId: ctx.user.id },
        action: 'policy.deleted',
        resource: { type: 'policy', id: existing.id },
        payload: { name: existing.name, type: existing.type },
      });
      return { ok: true };
    }),

  /**
   * Dry-run: evaluate the org's current policies against a caller-supplied
   * skill context. Used by the UI to preview how a rule will behave.
   */
  preview: orgProcedure
    .input(
      z.object({
        skill: z.object({
          source: z.enum(['internal', 'tessl', 'github_public', 'http']),
          namespace: z.string().min(1).max(64),
          name: z.string().min(1).max(64),
          version: z.string().max(64).nullable().default(null),
        }),
        workspaceId: z.string().nullable().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(policies)
        .where(eq(policies.orgId, ctx.org.id));
      const loaded: PolicyRow[] = rows.map((r) => ({
        id: r.id,
        orgId: r.orgId,
        scopeType: r.scopeType as 'org' | 'workspace',
        scopeId: r.scopeId,
        name: r.name,
        type: r.type as PolicyType,
        config: r.config,
        priority: r.priority,
        enabled: r.enabled,
        createdAt: r.createdAt,
      }));

      const ref = `${input.skill.source}:${input.skill.namespace}/${input.skill.name}`;
      const result = evaluate(loaded, {
        action: 'install',
        org: { id: ctx.org.id },
        workspace: input.workspaceId ? { id: input.workspaceId } : null,
        actor: { userId: ctx.user.id, tokenId: null },
        skill: {
          ref:
            input.skill.version !== null
              ? `${ref}@${input.skill.version}`
              : ref,
          namespace: input.skill.namespace,
          name: input.skill.name,
          version: input.skill.version,
          source: input.skill.source,
        },
      });

      // Enrich evaluations with policy names so the UI can render them.
      const nameById = new Map(loaded.map((p) => [p.id, p.name]));
      return {
        decision: result.decision,
        evaluations: result.evaluations.map((e) => ({
          ...e,
          policyName: nameById.get(e.policyId) ?? '(unknown)',
        })),
      };
    }),
});
