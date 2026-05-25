import { relations } from 'drizzle-orm';
import { index, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';

import { maintenanceEntries } from './maintenance-entries';
import { maintenanceTasks } from './maintenance-tasks';

export const maintenanceEntryTasks = pgTable(
  'maintenance_entry_tasks',
  {
    entryId: uuid('entry_id')
      .notNull()
      .references(() => maintenanceEntries.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id')
      .notNull()
      .references(() => maintenanceTasks.id, { onDelete: 'restrict' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.entryId, table.taskId] }),
    taskIdx: index('maintenance_entry_tasks_task_idx').on(table.taskId),
  }),
);

export const maintenanceEntryTasksRelations = relations(maintenanceEntryTasks, ({ one }) => ({
  entry: one(maintenanceEntries, {
    fields: [maintenanceEntryTasks.entryId],
    references: [maintenanceEntries.id],
  }),
  task: one(maintenanceTasks, {
    fields: [maintenanceEntryTasks.taskId],
    references: [maintenanceTasks.id],
  }),
}));

export type MaintenanceEntryTask = typeof maintenanceEntryTasks.$inferSelect;
export type NewMaintenanceEntryTask = typeof maintenanceEntryTasks.$inferInsert;
