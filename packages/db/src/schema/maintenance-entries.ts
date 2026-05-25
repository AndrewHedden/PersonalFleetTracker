import { relations, sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { maintenanceEntryTasks } from './maintenance-entry-tasks';
import { vehicles } from './vehicles';

export const maintenanceEntries = pgTable(
  'maintenance_entries',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    entryDate: date('entry_date', { mode: 'string' }).notNull(),
    odometer: integer('odometer').notNull(),
    totalCost: numeric('total_cost', { precision: 10, scale: 2 }),
    shopName: text('shop_name'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    vehicleDateIdx: index('maintenance_entries_vehicle_date_idx').on(
      table.vehicleId,
      table.entryDate,
    ),
    vehicleOdometerIdx: index('maintenance_entries_vehicle_odometer_idx').on(
      table.vehicleId,
      table.odometer,
    ),
    odometerNonneg: check('maintenance_entries_odometer_nonneg', sql`${table.odometer} >= 0`),
    totalCostNonneg: check(
      'maintenance_entries_total_cost_nonneg',
      sql`${table.totalCost} IS NULL OR ${table.totalCost} >= 0`,
    ),
  }),
);

export const maintenanceEntriesRelations = relations(maintenanceEntries, ({ one, many }) => ({
  vehicle: one(vehicles, {
    fields: [maintenanceEntries.vehicleId],
    references: [vehicles.id],
  }),
  tasks: many(maintenanceEntryTasks),
}));

export type MaintenanceEntry = typeof maintenanceEntries.$inferSelect;
export type NewMaintenanceEntry = typeof maintenanceEntries.$inferInsert;
