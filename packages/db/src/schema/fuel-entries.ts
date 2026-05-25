import { relations, sql } from 'drizzle-orm';
import {
  boolean,
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

import { vehicles } from './vehicles';

export const fuelEntries = pgTable(
  'fuel_entries',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    entryDate: date('entry_date', { mode: 'string' }).notNull(),
    odometer: integer('odometer').notNull(),
    gallons: numeric('gallons', { precision: 8, scale: 3 }).notNull(),
    totalCost: numeric('total_cost', { precision: 10, scale: 2 }).notNull(),
    pricePerGallon: numeric('price_per_gallon', { precision: 6, scale: 3 }).notNull(),
    tankFilled: boolean('tank_filled').notNull().default(true),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    vehicleDateIdx: index('fuel_entries_vehicle_date_idx').on(table.vehicleId, table.entryDate),
    vehicleOdometerIdx: index('fuel_entries_vehicle_odometer_idx').on(
      table.vehicleId,
      table.odometer,
    ),
    odometerNonneg: check('fuel_entries_odometer_nonneg', sql`${table.odometer} >= 0`),
    gallonsPositive: check('fuel_entries_gallons_positive', sql`${table.gallons} > 0`),
    totalCostNonneg: check('fuel_entries_total_cost_nonneg', sql`${table.totalCost} >= 0`),
    pricePerGallonNonneg: check(
      'fuel_entries_price_per_gallon_nonneg',
      sql`${table.pricePerGallon} >= 0`,
    ),
  }),
);

export const fuelEntriesRelations = relations(fuelEntries, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [fuelEntries.vehicleId],
    references: [vehicles.id],
  }),
}));

export type FuelEntry = typeof fuelEntries.$inferSelect;
export type NewFuelEntry = typeof fuelEntries.$inferInsert;
