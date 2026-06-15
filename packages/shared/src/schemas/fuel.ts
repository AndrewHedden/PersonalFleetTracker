import { z } from 'zod';

/**
 * Fuel-entry schemas shared between API + web + (eventually) iOS.
 *
 * Numeric fields (gallons, totalCost, pricePerGallon) come over the wire as
 * strings because they're Postgres `numeric` values — JSON numbers would
 * lose precision past a few decimals. The web UI parses them as needed for
 * display.
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoDateTime = z.string().datetime();
const decimal = z.string().regex(/^\d+(\.\d+)?$/);

export const FuelEntrySchema = z.object({
  id: z.string().uuid(),
  vehicleId: z.string().uuid(),
  entryDate: isoDate,
  odometer: z.number().int().min(0),
  gallons: decimal,
  totalCost: decimal,
  pricePerGallon: decimal,
  tankFilled: z.boolean(),
  notes: z.string().nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export type FuelEntry = z.infer<typeof FuelEntrySchema>;

export const CreateFuelEntryInputSchema = z.object({
  entryDate: isoDate,
  odometer: z.number().int().min(0).max(99_999_999),
  gallons: z.number().positive().max(1000),
  totalCost: z.number().min(0).max(100_000),
  pricePerGallon: z.number().min(0).max(1000),
  tankFilled: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateFuelEntryInput = z.infer<typeof CreateFuelEntryInputSchema>;

/** All fields optional — only the provided ones are updated. */
export const UpdateFuelEntryInputSchema = CreateFuelEntryInputSchema.partial();

export type UpdateFuelEntryInput = z.infer<typeof UpdateFuelEntryInputSchema>;

export const ListFuelEntriesResponseSchema = z.object({
  entries: z.array(FuelEntrySchema),
});

export type ListFuelEntriesResponse = z.infer<typeof ListFuelEntriesResponseSchema>;
