import { fuelEntries, maintenanceEntries, maintenanceEntryTasks } from '@stablebook/db';
import { computeScheduleStatus, type Baseline, type MaintenanceSchedule } from '@stablebook/shared';
import { and, eq, inArray, max } from 'drizzle-orm';

import type { Db } from './db';

/** A schedule row joined with its task name, before status is computed. */
export interface ScheduleRow {
  id: string;
  vehicleId: string;
  taskId: string;
  taskName: string;
  intervalMiles: number | null;
  intervalMonths: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface VehicleBaselineInfo {
  id: string;
  purchaseOdometer: number | null;
  purchaseDate: string | null;
}

/**
 * Enrich a vehicle's schedule rows with computed due status. Runs three cheap
 * queries per vehicle: current odometer (max across fuel + maintenance), and the
 * latest maintenance entry per scheduled task (the "last done" baseline). Falls
 * back to the vehicle's purchase odometer/date when a task was never logged.
 */
export async function enrichSchedules(
  db: Db,
  vehicle: VehicleBaselineInfo,
  schedules: ScheduleRow[],
): Promise<MaintenanceSchedule[]> {
  if (schedules.length === 0) return [];

  const today = new Date().toISOString().slice(0, 10);

  // Current odometer = highest reading we know about.
  const [fuelMax] = await db
    .select({ m: max(fuelEntries.odometer) })
    .from(fuelEntries)
    .where(eq(fuelEntries.vehicleId, vehicle.id));
  const [maintMax] = await db
    .select({ m: max(maintenanceEntries.odometer) })
    .from(maintenanceEntries)
    .where(eq(maintenanceEntries.vehicleId, vehicle.id));
  const odoCandidates = [fuelMax?.m, maintMax?.m, vehicle.purchaseOdometer].filter(
    (v): v is number => v != null,
  );
  const currentOdometer = odoCandidates.length ? Math.max(...odoCandidates) : null;

  // Latest maintenance entry per scheduled task = per-task baseline.
  const taskIds = [...new Set(schedules.map((s) => s.taskId))];
  const rows = await db
    .select({
      taskId: maintenanceEntryTasks.taskId,
      odometer: maintenanceEntries.odometer,
      entryDate: maintenanceEntries.entryDate,
    })
    .from(maintenanceEntryTasks)
    .innerJoin(maintenanceEntries, eq(maintenanceEntryTasks.entryId, maintenanceEntries.id))
    .where(
      and(
        eq(maintenanceEntries.vehicleId, vehicle.id),
        inArray(maintenanceEntryTasks.taskId, taskIds),
      ),
    );

  const latestByTask = new Map<string, { odometer: number; entryDate: string }>();
  for (const r of rows) {
    const cur = latestByTask.get(r.taskId);
    if (
      !cur ||
      r.entryDate > cur.entryDate ||
      (r.entryDate === cur.entryDate && r.odometer > cur.odometer)
    ) {
      latestByTask.set(r.taskId, { odometer: r.odometer, entryDate: r.entryDate });
    }
  }

  return schedules.map((s) => {
    const done = latestByTask.get(s.taskId);
    const baseline: Baseline = done
      ? { odometer: done.odometer, date: done.entryDate, source: 'entry' }
      : vehicle.purchaseOdometer != null || vehicle.purchaseDate != null
        ? { odometer: vehicle.purchaseOdometer, date: vehicle.purchaseDate, source: 'purchase' }
        : { odometer: null, date: null, source: 'none' };

    const status = computeScheduleStatus(
      { intervalMiles: s.intervalMiles, intervalMonths: s.intervalMonths },
      baseline,
      { odometer: currentOdometer, today },
    );

    return {
      id: s.id,
      vehicleId: s.vehicleId,
      taskId: s.taskId,
      taskName: s.taskName,
      intervalMiles: s.intervalMiles,
      intervalMonths: s.intervalMonths,
      status: status.status,
      baselineSource: status.baselineSource,
      nextDueOdometer: status.nextDueOdometer ?? null,
      nextDueDate: status.nextDueDate ?? null,
      milesRemaining: status.milesRemaining ?? null,
      daysRemaining: status.daysRemaining ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  });
}
