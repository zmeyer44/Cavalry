import {
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { newId } from '../id';
import { organizations } from './organizations';

export const registries = pgTable(
  'registries',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 20 }).notNull(),
    url: text('url').notNull(),
    authConfig: jsonb('auth_config').$type<Record<string, unknown>>().default({}).notNull(),
    enabled: boolean('enabled').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('registries_org_idx').on(table.orgId)],
);

export const registriesRelations = relations(registries, ({ one }) => ({
  org: one(organizations, { fields: [registries.orgId], references: [organizations.id] }),
}));
