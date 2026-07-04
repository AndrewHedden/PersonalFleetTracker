import { relations, sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { fuelEntries } from './fuel-entries';
import { maintenanceEntries } from './maintenance-entries';
import { maintenanceSchedules } from './maintenance-schedules';
import { users } from './users';

export const vehicles = pgTable(
  'vehicles',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    nickname: text('nickname').notNull(),
    year: integer('year'),
    make: text('make').notNull(),
    model: text('model').notNull(),
    trim: text('trim'),
    vin: text('vin'),
    licensePlate: text('license_plate'),
    color: text('color'),
    purchaseOdometer: integer('purchase_odometer'),
    purchaseDate: date('purchase_date', { mode: 'string' }),
    specs: jsonb('specs'),
    retiredAt: timestamp('retired_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('vehicles_user_id_idx').on(table.userId),
    yearCheck: check(
      'vehicles_year_check',
      sql`${table.year} IS NULL OR (${table.year} BETWEEN 1900 AND 2100)`,
    ),
    odometerNonneg: check(
      'vehicles_purchase_odometer_nonneg',
      sql`${table.purchaseOdometer} IS NULL OR ${table.purchaseOdometer} >= 0`,
    ),
  }),
);

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  owner: one(users, {
    fields: [vehicles.userId],
    references: [users.id],
  }),
  fuelEntries: many(fuelEntries),
  maintenanceEntries: many(maintenanceEntries),
  maintenanceSchedules: many(maintenanceSchedules),
}));

export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
