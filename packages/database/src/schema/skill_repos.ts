import {
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { newId } from '../id';
import { organizations } from './organizations';
import { workspaces } from './workspaces';
import { gitInstallations } from './git_installations';

export const skillRepos = pgTable(
  'skill_repos',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    gitInstallationId: text('git_installation_id')
      .notNull()
      .references(() => gitInstallations.id, { onDelete: 'restrict' }),
    workspaceId: text('workspace_id').references(() => workspaces.id, {
      onDelete: 'set null',
    }),
    provider: varchar('provider', { length: 20 }).notNull(),
    owner: varchar('owner', { length: 255 }).notNull(),
    repo: varchar('repo', { length: 255 }).notNull(),
    defaultBranch: varchar('default_branch', { length: 255 }).notNull(),
    configSnapshot: jsonb('config_snapshot').$type<Record<string, unknown>>(),
    configCommitSha: text('config_commit_sha'),
    syncStatus: varchar('sync_status', { length: 20 }).notNull().default('pending'),
    lastSyncedAt: timestamp('last_synced_at'),
    lastSuccessfulSyncAt: timestamp('last_successful_sync_at'),
    lastSyncError: text('last_sync_error'),
    enabled: boolean('enabled').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('skill_repos_org_provider_owner_repo_idx').on(
      table.orgId,
      table.provider,
      table.owner,
      table.repo,
    ),
    index('skill_repos_org_idx').on(table.orgId),
    index('skill_repos_installation_idx').on(table.gitInstallationId),
  ],
);

export const skillReposRelations = relations(skillRepos, ({ one }) => ({
  org: one(organizations, { fields: [skillRepos.orgId], references: [organizations.id] }),
  installation: one(gitInstallations, {
    fields: [skillRepos.gitInstallationId],
    references: [gitInstallations.id],
  }),
  workspace: one(workspaces, {
    fields: [skillRepos.workspaceId],
    references: [workspaces.id],
  }),
}));
