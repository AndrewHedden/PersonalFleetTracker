import { z } from 'zod';

/**
 * Maintenance schemas shared between API + web + (eventually) iOS.
 *
 * A maintenance *entry* is one logged service event for a vehicle (date,
 * odometer, optional cost/shop/notes) plus the set of *tasks* performed. Tasks
 * come from a catalog: system tasks (seeded, `userId === null`) plus the
 * caller's own custom tasks.
 *
 * As with fuel, `numeric` money values cross the wire as strings to preserve
 * precision; the web UI parses them for display.
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoDateTime = z.string().datetime();
const decimal = z.string().regex(/^\d+(\.\d+)?$/);

export const MaintenanceTaskSchema = z.object({
  id: z.string().uuid(),
  /** null === a built-in/system task available to everyone. */
  userId: z.string().uuid().nullable(),
  name: z.string(),
  description: z.string().nullable(),
});

export type MaintenanceTask = z.infer<typeof MaintenanceTaskSchema>;

export const MaintenanceEntrySchema = z.object({
  id: z.string().uuid(),
  vehicleId: z.string().uuid(),
  entryDate: isoDate,
  odometer: z.number().int().min(0),
  totalCost: decimal.nullable(),
  shopName: z.string().nullable(),
  notes: z.string().nullable(),
  tasks: z.array(MaintenanceTaskSchema),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export type MaintenanceEntry = z.infer<typeof MaintenanceEntrySchema>;

export const CreateMaintenanceEntryInputSchema = z.object({
  entryDate: isoDate,
  odometer: z.number().int().min(0).max(99_999_999),
  /** One or more catalog task ids that were performed in this service. */
  taskIds: z.array(z.string().uuid()).min(1).max(50),
  totalCost: z.number().min(0).max(100_000).optional(),
  shopName: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateMaintenanceEntryInput = z.infer<typeof CreateMaintenanceEntryInputSchema>;

export const CreateMaintenanceTaskInputSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
});

export type CreateMaintenanceTaskInput = z.infer<typeof CreateMaintenanceTaskInputSchema>;

export const ListMaintenanceTasksResponseSchema = z.object({
  tasks: z.array(MaintenanceTaskSchema),
});

export type ListMaintenanceTasksResponse = z.infer<typeof ListMaintenanceTasksResponseSchema>;

export const ListMaintenanceEntriesResponseSchema = z.object({
  entries: z.array(MaintenanceEntrySchema),
});

export type ListMaintenanceEntriesResponse = z.infer<typeof ListMaintenanceEntriesResponseSchema>;
