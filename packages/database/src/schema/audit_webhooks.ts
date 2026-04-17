import {
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { newId } from '../id';
import { organizations } from './organizations';
import { auditEvents } from './audit';

/**
 * Outbound audit webhook destinations. Each org can register multiple URLs;
 * deliveries go out through the worker with an HMAC signature.
 */
export const auditWebhooks = pgTable(
  'audit_webhooks',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 255 }).notNull(),
    url: text('url').notNull(),
    /** Envelope-encrypted secret used to sign X-Cavalry-Signature. */
    secret: text('secret').notNull(),
    /** Which SIEM-flavored payload shape to emit. `generic` is our native format. */
    format: varchar('format', { length: 20 }).notNull().default('generic'),
    /** Only deliver events whose `action` matches at least one of these globs. */
    actionFilters: jsonb('action_filters').$type<string[]>().default([]).notNull(),
    enabled: boolean('enabled').notNull().default(true),
    /** Monitoring stats. */
    lastDeliveryAt: timestamp('last_delivery_at'),
    lastSuccessAt: timestamp('last_success_at'),
    lastFailureAt: timestamp('last_failure_at'),
    lastFailureReason: text('last_failure_reason'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('audit_webhooks_org_name_idx').on(table.orgId, table.name),
    index('audit_webhooks_org_idx').on(table.orgId),
  ],
);

/**
 * Per-attempt delivery log. Append-only. Worker uses this table to drive
 * retries with exponential backoff and to show operators recent history.
 */
export const auditWebhookDeliveries = pgTable(
  'audit_webhook_deliveries',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    webhookId: text('webhook_id')
      .notNull()
      .references(() => auditWebhooks.id, { onDelete: 'restrict' }),
    eventId: text('event_id')
      .notNull()
      .references(() => auditEvents.id, { onDelete: 'restrict' }),
    /** 0 = first attempt, 1 = retry #1, etc. */
    attempt: integer('attempt').notNull().default(0),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    responseStatus: integer('response_status'),
    responseBody: text('response_body'),
    errorMessage: text('error_message'),
    scheduledAt: timestamp('scheduled_at').defaultNow().notNull(),
    sentAt: timestamp('sent_at'),
  },
  (table) => [
    index('audit_webhook_deliveries_webhook_idx').on(
      table.webhookId,
      table.scheduledAt,
    ),
    index('audit_webhook_deliveries_status_idx').on(table.status),
  ],
);

export const auditWebhooksRelations = relations(auditWebhooks, ({ one, many }) => ({
  org: one(organizations, {
    fields: [auditWebhooks.orgId],
    references: [organizations.id],
  }),
  deliveries: many(auditWebhookDeliveries),
}));

export const auditWebhookDeliveriesRelations = relations(
  auditWebhookDeliveries,
  ({ one }) => ({
    webhook: one(auditWebhooks, {
      fields: [auditWebhookDeliveries.webhookId],
      references: [auditWebhooks.id],
    }),
    event: one(auditEvents, {
      fields: [auditWebhookDeliveries.eventId],
      references: [auditEvents.id],
    }),
  }),
);
