import {
  pgTable,
  text,
  varchar,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { newId } from '../id';
import { users } from './users';
import { organizations } from './organizations';

export const apiTokens = pgTable(
  'api_tokens',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    userId: text('user_id').references(() => users.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 255 }).notNull(),
    tokenHash: text('token_hash').notNull(),
    prefix: varchar('prefix', { length: 16 }).notNull(),
    scopes: text('scopes').array().notNull().default([]),
    expiresAt: timestamp('expires_at'),
    lastUsedAt: timestamp('last_used_at'),
    revokedAt: timestamp('revoked_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('api_tokens_token_hash_idx').on(table.tokenHash),
    index('api_tokens_org_idx').on(table.orgId),
    index('api_tokens_user_idx').on(table.userId),
  ],
);

export const apiTokensRelations = relations(apiTokens, ({ one }) => ({
  org: one(organizations, { fields: [apiTokens.orgId], references: [organizations.id] }),
  user: one(users, { fields: [apiTokens.userId], references: [users.id] }),
}));
