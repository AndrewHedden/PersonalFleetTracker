import { relations, sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { maintenanceEntryTasks } from './maintenance-entry-tasks';
import { maintenanceSchedules } from './maintenance-schedules';
import { users } from './users';

export const maintenanceTasks = pgTable(
  'maintenance_tasks',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    // null userId === system / built-in task available to everyone.
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Partial unique indexes so we get per-user uniqueness AND a single system catalog,
    // since (NULL, 'Oil change') and (NULL, 'Oil change') would not collide on a plain UNIQUE.
    systemNameUq: uniqueIndex('maintenance_tasks_system_name_uq')
      .on(table.name)
      .where(sql`${table.userId} IS NULL`),
    userNameUq: uniqueIndex('maintenance_tasks_user_name_uq')
      .on(table.userId, table.name)
      .where(sql`${table.userId} IS NOT NULL`),
  }),
);

export const maintenanceTasksRelations = relations(maintenanceTasks, ({ one, many }) => ({
  owner: one(users, {
    fields: [maintenanceTasks.userId],
    references: [users.id],
  }),
  entryTasks: many(maintenanceEntryTasks),
  schedules: many(maintenanceSchedules),
}));

export type MaintenanceTask = typeof maintenanceTasks.$inferSelect;
export type NewMaintenanceTask = typeof maintenanceTasks.$inferInsert;
