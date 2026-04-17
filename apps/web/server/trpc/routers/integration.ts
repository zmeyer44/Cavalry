import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { auditWebhooks, auditWebhookDeliveries } from '@cavalry/database';
import { emitAuditEvent } from '@cavalry/audit';
import { decrypt, encrypt, isEnvelope } from '@cavalry/registry-upstream';
import { router, orgProcedure, adminProcedure } from '../trpc';

const FORMATS = ['generic', 'splunk', 'datadog'] as const;

function publicView(row: typeof auditWebhooks.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    format: row.format as (typeof FORMATS)[number],
    actionFilters: row.actionFilters,
    enabled: row.enabled,
    lastDeliveryAt: row.lastDeliveryAt,
    lastSuccessAt: row.lastSuccessAt,
    lastFailureAt: row.lastFailureAt,
    lastFailureReason: row.lastFailureReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function encryptSecret(secret: string): string {
  return encrypt({ secret }) as unknown as string;
}

export const integrationRouter = router({
  webhookList: orgProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(auditWebhooks)
      .where(eq(auditWebhooks.orgId, ctx.org.id))
      .orderBy(desc(auditWebhooks.createdAt));
    return rows.map(publicView);
  }),

  webhookGet: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(auditWebhooks)
        .where(
          and(
            eq(auditWebhooks.id, input.id),
            eq(auditWebhooks.orgId, ctx.org.id),
          ),
        )
        .limit(1);
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      return publicView(row);
    }),

  webhookCreate: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        url: z.string().url().max(2048),
        secret: z.string().min(16).max(255),
        format: z.enum(FORMATS).default('generic'),
        actionFilters: z.array(z.string().min(1).max(128)).default([]),
        enabled: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(auditWebhooks)
        .values({
          orgId: ctx.org.id,
          name: input.name,
          url: input.url,
          secret: encryptSecret(input.secret),
          format: input.format,
          actionFilters: input.actionFilters,
          enabled: input.enabled,
        })
        .returning();
      if (!created) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      await emitAuditEvent({
        orgId: ctx.org.id,
        actor: { type: 'user', userId: ctx.user.id },
        action: 'integration.webhook.added',
        resource: { type: 'audit_webhook', id: created.id },
        payload: { name: created.name, format: created.format, url: created.url },
      });
      return publicView(created);
    }),

  webhookUpdate: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        url: z.string().url().max(2048).optional(),
        secret: z.string().min(16).max(255).optional(),
        format: z.enum(FORMATS).optional(),
        actionFilters: z.array(z.string()).optional(),
        enabled: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(auditWebhooks)
        .where(
          and(
            eq(auditWebhooks.id, input.id),
            eq(auditWebhooks.orgId, ctx.org.id),
          ),
        )
        .limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (input.name !== undefined) patch.name = input.name;
      if (input.url !== undefined) patch.url = input.url;
      if (input.secret !== undefined) patch.secret = encryptSecret(input.secret);
      if (input.format !== undefined) patch.format = input.format;
      if (input.actionFilters !== undefined) patch.actionFilters = input.actionFilters;
      if (input.enabled !== undefined) patch.enabled = input.enabled;

      const [updated] = await ctx.db
        .update(auditWebhooks)
        .set(patch)
        .where(eq(auditWebhooks.id, input.id))
        .returning();
      if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      await emitAuditEvent({
        orgId: ctx.org.id,
        actor: { type: 'user', userId: ctx.user.id },
        action: 'integration.webhook.updated',
        resource: { type: 'audit_webhook', id: updated.id },
        payload: { changes: Object.keys(patch).filter((k) => k !== 'updatedAt') },
      });
      return publicView(updated);
    }),

  webhookDelete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(auditWebhooks)
        .where(
          and(
            eq(auditWebhooks.id, input.id),
            eq(auditWebhooks.orgId, ctx.org.id),
          ),
        )
        .limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

      await ctx.db.delete(auditWebhooks).where(eq(auditWebhooks.id, input.id));
      await emitAuditEvent({
        orgId: ctx.org.id,
        actor: { type: 'user', userId: ctx.user.id },
        action: 'integration.webhook.removed',
        resource: { type: 'audit_webhook', id: existing.id },
        payload: { name: existing.name },
      });
      return { ok: true };
    }),

  webhookDeliveries: orgProcedure
    .input(z.object({ id: z.string(), limit: z.number().min(1).max(200).default(25) }))
    .query(async ({ ctx, input }) => {
      const [webhook] = await ctx.db
        .select()
        .from(auditWebhooks)
        .where(
          and(
            eq(auditWebhooks.id, input.id),
            eq(auditWebhooks.orgId, ctx.org.id),
          ),
        )
        .limit(1);
      if (!webhook) throw new TRPCError({ code: 'NOT_FOUND' });
      const rows = await ctx.db
        .select()
        .from(auditWebhookDeliveries)
        .where(eq(auditWebhookDeliveries.webhookId, input.id))
        .orderBy(desc(auditWebhookDeliveries.scheduledAt))
        .limit(input.limit);
      return rows;
    }),
});

// silence unused-import warning; decrypt is re-exported for future "test connection" use.
void decrypt;
void isEnvelope;
