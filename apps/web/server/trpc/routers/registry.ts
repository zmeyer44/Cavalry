import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { registries } from '@cavalry/database';
import { emitAuditEvent } from '@cavalry/audit';
import { decrypt, encrypt, getAdapter, isEnvelope } from '@cavalry/registry-upstream';
import type { UpstreamRegistry } from '@cavalry/registry-upstream';
import { router, orgProcedure, adminProcedure } from '../trpc';

const REGISTRY_TYPES = ['tessl', 'github', 'http', 'mcp'] as const;

const registryNameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'must be lowercase a-z, 0-9, hyphens');

const authConfigSchema = z.record(z.string(), z.unknown()).optional();

const createInputSchema = z.object({
  name: registryNameSchema,
  type: z.enum(REGISTRY_TYPES),
  url: z.string().url().max(2048),
  authConfig: authConfigSchema,
  enabled: z.boolean().default(true),
});

const updateInputSchema = z.object({
  id: z.string(),
  name: registryNameSchema.optional(),
  url: z.string().url().max(2048).optional(),
  authConfig: authConfigSchema,
  enabled: z.boolean().optional(),
});

function decryptedAuthConfig(raw: unknown): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  if (typeof raw === 'string') {
    return isEnvelope(raw) ? decrypt<Record<string, unknown>>(raw) : undefined;
  }
  if (typeof raw === 'object' && Object.keys(raw as object).length > 0) {
    return raw as Record<string, unknown>;
  }
  return undefined;
}

/** Public projection — never includes plaintext authConfig. */
function publicView(row: typeof registries.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    url: row.url,
    enabled: row.enabled,
    hasAuthConfig: !!decryptedAuthConfig(row.authConfig),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const registryRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(registries)
      .where(eq(registries.orgId, ctx.org.id))
      .orderBy(desc(registries.createdAt));
    return rows.map(publicView);
  }),

  get: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(registries)
        .where(and(eq(registries.id, input.id), eq(registries.orgId, ctx.org.id)))
        .limit(1);
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      return publicView(row);
    }),

  create: adminProcedure
    .input(createInputSchema)
    .mutation(async ({ ctx, input }) => {
      // unique name per org
      const [existing] = await ctx.db
        .select({ id: registries.id })
        .from(registries)
        .where(and(eq(registries.orgId, ctx.org.id), eq(registries.name, input.name)))
        .limit(1);
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: `registry "${input.name}" already exists` });
      }

      const created = await ctx.db.transaction(async (tx) => {
        const authConfigEnc =
          input.authConfig && Object.keys(input.authConfig).length > 0
            ? encrypt(input.authConfig)
            : null;
        const [row] = await tx
          .insert(registries)
          .values({
            orgId: ctx.org.id,
            name: input.name,
            type: input.type,
            url: input.url,
            authConfig: (authConfigEnc ?? {}) as unknown as Record<string, unknown>,
            enabled: input.enabled,
          })
          .returning();
        if (!row) throw new Error('failed to insert registry');
        await emitAuditEvent({
          orgId: ctx.org.id,
          actor: { type: 'user', userId: ctx.user.id },
          action: 'registry.added',
          resource: { type: 'registry', id: row.id },
          payload: { name: row.name, type: row.type, url: row.url },
          request: { ip: ctx.ip ?? undefined, userAgent: ctx.headers.get('user-agent') ?? undefined },
          tx,
        });
        return row;
      });

      return publicView(created);
    }),

  update: adminProcedure
    .input(updateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(registries)
        .where(and(eq(registries.id, input.id), eq(registries.orgId, ctx.org.id)))
        .limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

      const updates: Partial<typeof registries.$inferInsert> = { updatedAt: new Date() };
      if (input.name !== undefined) updates.name = input.name;
      if (input.url !== undefined) updates.url = input.url;
      if (input.enabled !== undefined) updates.enabled = input.enabled;
      // authConfig: present + non-empty → re-encrypt; present + empty → clear; absent → leave alone
      if (input.authConfig !== undefined) {
        if (Object.keys(input.authConfig).length === 0) {
          updates.authConfig = {} as Record<string, unknown>;
        } else {
          updates.authConfig = encrypt(input.authConfig) as unknown as Record<string, unknown>;
        }
      }

      const updated = await ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .update(registries)
          .set(updates)
          .where(eq(registries.id, existing.id))
          .returning();
        if (!row) throw new Error('failed to update registry');
        await emitAuditEvent({
          orgId: ctx.org.id,
          actor: { type: 'user', userId: ctx.user.id },
          action: 'registry.updated',
          resource: { type: 'registry', id: row.id },
          payload: {
            name: row.name,
            changes: Object.keys(updates).filter((k) => k !== 'updatedAt'),
          },
          request: { ip: ctx.ip ?? undefined, userAgent: ctx.headers.get('user-agent') ?? undefined },
          tx,
        });
        return row;
      });

      return publicView(updated);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(registries)
        .where(and(eq(registries.id, input.id), eq(registries.orgId, ctx.org.id)))
        .limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

      await ctx.db.transaction(async (tx) => {
        await tx.delete(registries).where(eq(registries.id, existing.id));
        await emitAuditEvent({
          orgId: ctx.org.id,
          actor: { type: 'user', userId: ctx.user.id },
          action: 'registry.removed',
          resource: { type: 'registry', id: existing.id },
          payload: { name: existing.name, type: existing.type },
          request: { ip: ctx.ip ?? undefined, userAgent: ctx.headers.get('user-agent') ?? undefined },
          tx,
        });
      });
      return { ok: true };
    }),

  test: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(registries)
        .where(and(eq(registries.id, input.id), eq(registries.orgId, ctx.org.id)))
        .limit(1);
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });

      const reg: UpstreamRegistry = {
        name: row.name,
        type: row.type as UpstreamRegistry['type'],
        url: row.url,
        authConfig: decryptedAuthConfig(row.authConfig),
      };

      let result: { ok: boolean; detail?: string };
      try {
        await getAdapter(reg).healthCheck();
        result = { ok: true };
      } catch (err) {
        result = { ok: false, detail: err instanceof Error ? err.message : String(err) };
      }

      await emitAuditEvent({
        orgId: ctx.org.id,
        actor: { type: 'user', userId: ctx.user.id },
        action: 'registry.tested',
        resource: { type: 'registry', id: row.id },
        payload: { name: row.name, ok: result.ok, detail: result.detail },
      });
      return result;
    }),

  scan: adminProcedure
    .input(
      z.object({
        id: z.string(),
        namespace: z.string().min(1),
        name: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(registries)
        .where(and(eq(registries.id, input.id), eq(registries.orgId, ctx.org.id)))
        .limit(1);
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      const reg: UpstreamRegistry = {
        name: row.name,
        type: row.type as UpstreamRegistry['type'],
        url: row.url,
        authConfig: decryptedAuthConfig(row.authConfig),
      };
      try {
        const versions = await getAdapter(reg).listVersions({
          namespace: input.namespace,
          name: input.name,
        });
        return { ok: true as const, versions };
      } catch (err) {
        return {
          ok: false as const,
          detail: err instanceof Error ? err.message : String(err),
        };
      }
    }),
});
