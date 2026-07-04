import { z } from 'zod';

/**
 * Maintenance-schedule schemas: a routine ("service task X every N miles and/or
 * M months") plus the computed due-status the API returns alongside it.
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoDateTime = z.string().datetime();
const reminderStatus = z.enum(['ok', 'due_soon', 'overdue', 'unknown']);
const baselineSource = z.enum(['entry', 'purchase', 'none']);

export const MaintenanceScheduleSchema = z.object({
  id: z.string().uuid(),
  vehicleId: z.string().uuid(),
  taskId: z.string().uuid(),
  taskName: z.string(),
  intervalMiles: z.number().int().positive().nullable(),
  intervalMonths: z.number().int().positive().nullable(),
  // Computed due status (see @stablebook/shared reminders.ts).
  status: reminderStatus,
  baselineSource,
  nextDueOdometer: z.number().int().nullable(),
  nextDueDate: isoDate.nullable(),
  milesRemaining: z.number().int().nullable(),
  daysRemaining: z.number().int().nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export type MaintenanceSchedule = z.infer<typeof MaintenanceScheduleSchema>;

export const CreateScheduleInputSchema = z
  .object({
    taskId: z.string().uuid(),
    intervalMiles: z.number().int().positive().max(1_000_000).optional(),
    intervalMonths: z.number().int().positive().max(600).optional(),
  })
  .refine((v) => v.intervalMiles != null || v.intervalMonths != null, {
    message: 'At least one of intervalMiles or intervalMonths is required.',
    path: ['intervalMiles'],
  });

export type CreateScheduleInput = z.infer<typeof CreateScheduleInputSchema>;

// PATCH: intervals only (task is fixed per schedule). At least one must remain set.
export const UpdateScheduleInputSchema = z
  .object({
    intervalMiles: z.number().int().positive().max(1_000_000).nullable().optional(),
    intervalMonths: z.number().int().positive().max(600).nullable().optional(),
  })
  .refine((v) => v.intervalMiles !== undefined || v.intervalMonths !== undefined, {
    message: 'Provide at least one interval to update.',
  });

export type UpdateScheduleInput = z.infer<typeof UpdateScheduleInputSchema>;

export const ListSchedulesResponseSchema = z.object({
  schedules: z.array(MaintenanceScheduleSchema),
});

export type ListSchedulesResponse = z.infer<typeof ListSchedulesResponseSchema>;

/** Per-vehicle due counts for the dashboard roll-up. */
export const ReminderSummarySchema = z.object({
  vehicleId: z.string().uuid(),
  nickname: z.string(),
  dueSoon: z.number().int().min(0),
  overdue: z.number().int().min(0),
});

export type ReminderSummary = z.infer<typeof ReminderSummarySchema>;

export const RemindersSummaryResponseSchema = z.object({
  vehicles: z.array(ReminderSummarySchema),
});

export type RemindersSummaryResponse = z.infer<typeof RemindersSummaryResponseSchema>;
