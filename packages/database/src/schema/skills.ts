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
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('skills_org_ns_name_idx').on(table.orgId, table.namespace, table.name),
    index('skills_org_idx').on(table.orgId),
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
    publishedAt: timestamp('published_at').defaultNow().notNull(),
    publishedBy: text('published_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
  },
  (table) => [
    uniqueIndex('skill_versions_skill_version_idx').on(table.skillId, table.version),
    index('skill_versions_skill_idx').on(table.skillId),
  ],
);

export const skillsRelations = relations(skills, ({ one, many }) => ({
  org: one(organizations, { fields: [skills.orgId], references: [organizations.id] }),
  versions: many(skillVersions),
}));

export const skillVersionsRelations = relations(skillVersions, ({ one }) => ({
  skill: one(skills, { fields: [skillVersions.skillId], references: [skills.id] }),
  publisher: one(users, { fields: [skillVersions.publishedBy], references: [users.id] }),
}));
