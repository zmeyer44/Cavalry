import { pgTable, text, varchar, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { newId } from '../id';

/**
 * Idempotency store for inbound provider webhooks. Rows are inserted on
 * first receipt; duplicate deliveries with the same (provider, deliveryId)
 * key are short-circuited by the webhook handler.
 */
export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    provider: varchar('provider', { length: 20 }).notNull(),
    deliveryId: text('delivery_id').notNull(),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    receivedAt: timestamp('received_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('webhook_deliveries_provider_delivery_idx').on(
      table.provider,
      table.deliveryId,
    ),
  ],
);
