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
import { users } from './users';
import { organizations } from './organizations';
import { workspaces } from './workspaces';
import { registries } from './registries';
import { skillVersions } from './skills';
import { apiTokens } from './tokens';

export const installs = pgTable(
  'installs',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    userId: text('user_id').references(() => users.id, { onDelete: 'restrict' }),
    tokenId: text('token_id').references(() => apiTokens.id, { onDelete: 'restrict' }),
    workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'restrict' }),
    projectIdentifier: text('project_identifier'),
    skillRef: text('skill_ref').notNull(),
    resolvedVersion: varchar('resolved_version', { length: 64 }),
    sourceRegistryId: text('source_registry_id').references(() => registries.id, {
      onDelete: 'restrict',
    }),
    sourceSkillVersionId: text('source_skill_version_id').references(() => skillVersions.id, {
      onDelete: 'restrict',
    }),
    result: varchar('result', { length: 24 }).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('installs_org_created_idx').on(table.orgId, table.createdAt),
    index('installs_org_skill_ref_idx').on(table.orgId, table.skillRef),
  ],
);

export const installsRelations = relations(installs, ({ one }) => ({
  org: one(organizations, { fields: [installs.orgId], references: [organizations.id] }),
  user: one(users, { fields: [installs.userId], references: [users.id] }),
  workspace: one(workspaces, { fields: [installs.workspaceId], references: [workspaces.id] }),
  registry: one(registries, {
    fields: [installs.sourceRegistryId],
    references: [registries.id],
  }),
  skillVersion: one(skillVersions, {
    fields: [installs.sourceSkillVersionId],
    references: [skillVersions.id],
  }),
}));
