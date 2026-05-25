import { relations, sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { maintenanceTasks } from './maintenance-tasks';
import { vehicles } from './vehicles';

export const users = pgTable('users', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  cognitoSub: text('cognito_sub').notNull().unique(),
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  vehicles: many(vehicles),
  maintenanceTasks: many(maintenanceTasks),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
