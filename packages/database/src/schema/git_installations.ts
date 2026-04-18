import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { newId } from '../id';
import { users } from './users';
import { organizations } from './organizations';

export const gitInstallations = pgTable(
  'git_installations',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    provider: varchar('provider', { length: 20 }).notNull(),
    externalId: text('external_id').notNull(),
    accountLogin: varchar('account_login', { length: 255 }).notNull(),
    accountType: varchar('account_type', { length: 20 }).notNull(),
    installedBy: text('installed_by').references(() => users.id, {
      onDelete: 'restrict',
    }),
    permissions: jsonb('permissions').$type<Record<string, unknown>>().default({}).notNull(),
    suspendedAt: timestamp('suspended_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('git_installations_org_provider_external_idx').on(
      table.orgId,
      table.provider,
      table.externalId,
    ),
    index('git_installations_org_idx').on(table.orgId),
  ],
);

export const gitInstallationsRelations = relations(gitInstallations, ({ one }) => ({
  org: one(organizations, {
    fields: [gitInstallations.orgId],
    references: [organizations.id],
  }),
  installer: one(users, {
    fields: [gitInstallations.installedBy],
    references: [users.id],
  }),
}));
