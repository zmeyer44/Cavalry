import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { newId } from '../id';
import { organizations } from './organizations';

export const auditEvents = pgTable(
  'audit_events',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    actorType: varchar('actor_type', { length: 16 }).notNull(),
    actorId: text('actor_id'),
    action: varchar('action', { length: 64 }).notNull(),
    resourceType: varchar('resource_type', { length: 64 }).notNull(),
    resourceId: text('resource_id').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().default({}).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('audit_events_org_created_idx').on(table.orgId, table.createdAt),
    index('audit_events_org_action_idx').on(table.orgId, table.action),
    index('audit_events_org_resource_idx').on(
      table.orgId,
      table.resourceType,
      table.resourceId,
    ),
  ],
);

export const auditEventsRelations = relations(auditEvents, ({ one }) => ({
  org: one(organizations, { fields: [auditEvents.orgId], references: [organizations.id] }),
}));
