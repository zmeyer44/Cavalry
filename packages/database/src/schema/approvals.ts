import { pgTable, text, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { newId } from '../id';
import { users } from './users';
import { organizations } from './organizations';
import { installs } from './installs';

export const approvals = pgTable(
  'approvals',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    installId: text('install_id')
      .notNull()
      .references(() => installs.id, { onDelete: 'restrict' }),
    requestedBy: text('requested_by').references(() => users.id, { onDelete: 'restrict' }),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    decidedBy: text('decided_by').references(() => users.id, { onDelete: 'restrict' }),
    decidedAt: timestamp('decided_at'),
    reason: text('reason'),
    slackTeamId: varchar('slack_team_id', { length: 64 }),
    slackChannelId: varchar('slack_channel_id', { length: 64 }),
    slackMessageTs: varchar('slack_message_ts', { length: 64 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at'),
  },
  (table) => [
    index('approvals_org_status_idx').on(table.orgId, table.status),
    index('approvals_install_idx').on(table.installId),
  ],
);

export const approvalsRelations = relations(approvals, ({ one }) => ({
  org: one(organizations, { fields: [approvals.orgId], references: [organizations.id] }),
  install: one(installs, { fields: [approvals.installId], references: [installs.id] }),
  requester: one(users, { fields: [approvals.requestedBy], references: [users.id] }),
  decider: one(users, { fields: [approvals.decidedBy], references: [users.id] }),
}));
