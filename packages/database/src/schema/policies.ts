import {
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
  jsonb,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { newId } from '../id';
import { organizations } from './organizations';
import { installs } from './installs';

export const policies = pgTable(
  'policies',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    scopeType: varchar('scope_type', { length: 20 }).notNull().default('org'),
    scopeId: text('scope_id'),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 30 }).notNull(),
    config: jsonb('config').$type<Record<string, unknown>>().default({}).notNull(),
    priority: integer('priority').notNull().default(0),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('policies_org_idx').on(table.orgId),
    index('policies_org_scope_idx').on(table.orgId, table.scopeType, table.scopeId),
  ],
);

export const policyEvaluations = pgTable(
  'policy_evaluations',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    installId: text('install_id')
      .notNull()
      .references(() => installs.id, { onDelete: 'restrict' }),
    policyId: text('policy_id')
      .notNull()
      .references(() => policies.id, { onDelete: 'restrict' }),
    matched: boolean('matched').notNull(),
    result: varchar('result', { length: 24 }).notNull(),
    reason: text('reason'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('policy_evaluations_install_idx').on(table.installId),
    index('policy_evaluations_policy_idx').on(table.policyId),
  ],
);

export const policiesRelations = relations(policies, ({ one, many }) => ({
  org: one(organizations, { fields: [policies.orgId], references: [organizations.id] }),
  evaluations: many(policyEvaluations),
}));

export const policyEvaluationsRelations = relations(policyEvaluations, ({ one }) => ({
  install: one(installs, { fields: [policyEvaluations.installId], references: [installs.id] }),
  policy: one(policies, { fields: [policyEvaluations.policyId], references: [policies.id] }),
}));
