import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  bigint,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { newId } from '../id';
import { users } from './users';
import { organizations } from './organizations';
import { registries } from './registries';
import { skillRepos } from './skill_repos';
import { skillRepoSyncs } from './skill_repo_syncs';

export const skills = pgTable(
  'skills',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    namespace: varchar('namespace', { length: 64 }).notNull(),
    name: varchar('name', { length: 64 }).notNull(),
    visibility: varchar('visibility', { length: 20 }).notNull().default('private'),
    description: text('description'),
    source: varchar('source', { length: 20 }).notNull().default('direct'),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    skillRepoId: text('skill_repo_id').references(() => skillRepos.id, {
      onDelete: 'restrict',
    }),
    repoPath: text('repo_path'),
    sourceRegistryId: text('source_registry_id').references(() => registries.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('skills_org_ns_name_idx').on(table.orgId, table.namespace, table.name),
    index('skills_org_idx').on(table.orgId),
    index('skills_source_registry_idx').on(table.sourceRegistryId),
    index('skills_skill_repo_idx').on(table.skillRepoId),
  ],
);

export const skillVersions = pgTable(
  'skill_versions',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    skillId: text('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'restrict' }),
    version: varchar('version', { length: 64 }).notNull(),
    manifest: jsonb('manifest').$type<Record<string, unknown>>().notNull(),
    artifactHash: text('artifact_hash').notNull(),
    artifactSizeBytes: bigint('artifact_size_bytes', { mode: 'number' }).notNull(),
    sourceKind: varchar('source_kind', { length: 20 }).notNull().default('direct_publish'),
    sourceRef: text('source_ref'),
    sourceCommitSha: text('source_commit_sha'),
    syncId: text('sync_id').references(() => skillRepoSyncs.id, {
      onDelete: 'set null',
    }),
    publishedAt: timestamp('published_at').defaultNow().notNull(),
    publishedBy: text('published_by').references(() => users.id, {
      onDelete: 'restrict',
    }),
    sourceRegistryId: text('source_registry_id').references(() => registries.id, {
      onDelete: 'set null',
    }),
    upstreamRef: text('upstream_ref'),
  },
  (table) => [
    uniqueIndex('skill_versions_skill_version_idx').on(table.skillId, table.version),
    index('skill_versions_skill_idx').on(table.skillId),
    index('skill_versions_sync_idx').on(table.syncId),
  ],
);

export const skillsRelations = relations(skills, ({ one, many }) => ({
  org: one(organizations, { fields: [skills.orgId], references: [organizations.id] }),
  versions: many(skillVersions),
  sourceRegistry: one(registries, {
    fields: [skills.sourceRegistryId],
    references: [registries.id],
  }),
  skillRepo: one(skillRepos, {
    fields: [skills.skillRepoId],
    references: [skillRepos.id],
  }),
}));

export const skillVersionsRelations = relations(skillVersions, ({ one }) => ({
  skill: one(skills, { fields: [skillVersions.skillId], references: [skills.id] }),
  publisher: one(users, { fields: [skillVersions.publishedBy], references: [users.id] }),
  sourceRegistry: one(registries, {
    fields: [skillVersions.sourceRegistryId],
    references: [registries.id],
  }),
  sync: one(skillRepoSyncs, {
    fields: [skillVersions.syncId],
    references: [skillRepoSyncs.id],
  }),
}));
