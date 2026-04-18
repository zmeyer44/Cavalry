import {
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { newId } from '../id';
import { organizations } from './organizations';
import { users } from './users';

/**
 * A Slack workspace connected to a Cavalry org. Bot-scoped install: we
 * persist the `bot_token` (encrypted), the team id, and the default channel
 * where approval messages are posted. One org can connect multiple Slack
 * workspaces; per-workspace per-org is unique.
 */
export const slackIntegrations = pgTable(
  'slack_integrations',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    teamId: varchar('team_id', { length: 64 }).notNull(),
    teamName: varchar('team_name', { length: 255 }).notNull(),
    /** Envelope-encrypted bot token (`xoxb-...`). */
    botToken: text('bot_token').notNull(),
    botUserId: varchar('bot_user_id', { length: 64 }),
    /** Where approval-requested messages go. Null = first channel bot joins. */
    defaultChannelId: varchar('default_channel_id', { length: 64 }),
    installedBy: text('installed_by').references(() => users.id, {
      onDelete: 'restrict',
    }),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('slack_integrations_org_team_idx').on(table.orgId, table.teamId),
    index('slack_integrations_org_idx').on(table.orgId),
  ],
);

export const slackIntegrationsRelations = relations(slackIntegrations, ({ one }) => ({
  org: one(organizations, {
    fields: [slackIntegrations.orgId],
    references: [organizations.id],
  }),
  installer: one(users, {
    fields: [slackIntegrations.installedBy],
    references: [users.id],
  }),
}));
