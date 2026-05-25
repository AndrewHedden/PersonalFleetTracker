import { relations, sql } from 'drizzle-orm';
import { check, index, integer, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { maintenanceTasks } from './maintenance-tasks';
import { vehicles } from './vehicles';

export const maintenanceSchedules = pgTable(
  'maintenance_schedules',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id')
      .notNull()
      .references(() => maintenanceTasks.id, { onDelete: 'restrict' }),
    // At least one of these must be non-null (enforced by check below).
    intervalMiles: integer('interval_miles'),
    intervalMonths: integer('interval_months'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    vehicleTaskUq: unique('maintenance_schedules_vehicle_task_uq').on(
      table.vehicleId,
      table.taskId,
    ),
    vehicleIdx: index('maintenance_schedules_vehicle_idx').on(table.vehicleId),
    taskIdx: index('maintenance_schedules_task_idx').on(table.taskId),
    atLeastOneInterval: check(
      'maintenance_schedules_at_least_one_interval',
      sql`${table.intervalMiles} IS NOT NULL OR ${table.intervalMonths} IS NOT NULL`,
    ),
    milesPositive: check(
      'maintenance_schedules_miles_positive',
      sql`${table.intervalMiles} IS NULL OR ${table.intervalMiles} > 0`,
    ),
    monthsPositive: check(
      'maintenance_schedules_months_positive',
      sql`${table.intervalMonths} IS NULL OR ${table.intervalMonths} > 0`,
    ),
  }),
);

export const maintenanceSchedulesRelations = relations(maintenanceSchedules, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [maintenanceSchedules.vehicleId],
    references: [vehicles.id],
  }),
  task: one(maintenanceTasks, {
    fields: [maintenanceSchedules.taskId],
    references: [maintenanceTasks.id],
  }),
}));

export type MaintenanceSchedule = typeof maintenanceSchedules.$inferSelect;
export type NewMaintenanceSchedule = typeof maintenanceSchedules.$inferInsert;
