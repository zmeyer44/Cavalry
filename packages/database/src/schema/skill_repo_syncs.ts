import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { newId } from '../id';
import { skillRepos } from './skill_repos';

export const skillRepoSyncs = pgTable(
  'skill_repo_syncs',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    skillRepoId: text('skill_repo_id')
      .notNull()
      .references(() => skillRepos.id, { onDelete: 'restrict' }),
    trigger: varchar('trigger', { length: 20 }).notNull(),
    triggerRef: text('trigger_ref'),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
    status: varchar('status', { length: 20 }).notNull().default('running'),
    commitShaBefore: text('commit_sha_before'),
    commitShaAfter: text('commit_sha_after'),
    versionsDiscovered: integer('versions_discovered').default(0).notNull(),
    versionsPublished: integer('versions_published').default(0).notNull(),
    versionsSkipped: integer('versions_skipped').default(0).notNull(),
    errorMessage: text('error_message'),
    details: jsonb('details').$type<Record<string, unknown>>().default({}).notNull(),
  },
  (table) => [
    index('skill_repo_syncs_repo_started_idx').on(table.skillRepoId, table.startedAt),
  ],
);

export const skillRepoSyncsRelations = relations(skillRepoSyncs, ({ one }) => ({
  skillRepo: one(skillRepos, {
    fields: [skillRepoSyncs.skillRepoId],
    references: [skillRepos.id],
  }),
}));
