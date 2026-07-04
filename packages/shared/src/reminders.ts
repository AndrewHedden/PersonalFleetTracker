/**
 * Maintenance-reminder computation — pure, no DB, shared by API + web (+ iOS).
 *
 * A schedule says "service this task every N miles and/or every M months". Given
 * a baseline ("last done" odometer + date) and the vehicle's current odometer +
 * today's date, we compute how far off the next service is and a status.
 */

/** Flag "due soon" within this many miles of the next-due odometer. */
export const DUE_SOON_MILES = 500;
/** Flag "due soon" within this many days of the next-due date. */
export const DUE_SOON_DAYS = 30;

export type ReminderStatus = 'ok' | 'due_soon' | 'overdue' | 'unknown';

/** Where the baseline "last done" came from. */
export type BaselineSource = 'entry' | 'purchase' | 'none';

export interface ScheduleStatus {
  status: ReminderStatus;
  baselineSource: BaselineSource;
  /** Odometer the service is next due at (if the schedule has a mileage interval). */
  nextDueOdometer?: number;
  /** Date (YYYY-MM-DD) the service is next due (if it has a time interval). */
  nextDueDate?: string;
  /** nextDueOdometer − currentOdometer; negative once overdue. */
  milesRemaining?: number;
  /** Whole days until nextDueDate; negative once overdue. */
  daysRemaining?: number;
}

/**
 * Add `months` calendar months to a YYYY-MM-DD date, clamping the day to the end
 * of the target month (e.g. Jan 31 + 1 month → Feb 28/29). Returns YYYY-MM-DD.
 */
export function addMonths(isoDate: string, months: number): string {
  const y = Number(isoDate.slice(0, 4));
  const m = Number(isoDate.slice(5, 7));
  const d = Number(isoDate.slice(8, 10));
  const targetMonthIndex = m - 1 + months;
  const year = y + Math.floor(targetMonthIndex / 12);
  const month = ((targetMonthIndex % 12) + 12) % 12; // 0-11
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(d, lastDay);
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/** UTC midnight epoch for a YYYY-MM-DD date. */
function utcDay(isoDate: string): number {
  return Date.UTC(
    Number(isoDate.slice(0, 4)),
    Number(isoDate.slice(5, 7)) - 1,
    Number(isoDate.slice(8, 10)),
  );
}

/** Whole days from `from` to `to` (both YYYY-MM-DD); positive when `to` is later. */
function daysBetween(from: string, to: string): number {
  return Math.round((utcDay(to) - utcDay(from)) / 86_400_000);
}

export interface ScheduleIntervals {
  intervalMiles: number | null;
  intervalMonths: number | null;
}

export interface Baseline {
  odometer: number | null;
  date: string | null;
  source: BaselineSource;
}

/**
 * Compute the due status for one schedule. The service is "due" by whichever
 * interval triggers first; `overdue` once past the due point, `due_soon` within
 * the thresholds, else `ok`. `unknown` when there's no baseline at all.
 */
export function computeScheduleStatus(
  schedule: ScheduleIntervals,
  baseline: Baseline,
  current: { odometer: number | null; today: string },
): ScheduleStatus {
  if (baseline.source === 'none' || (baseline.odometer === null && baseline.date === null)) {
    return { status: 'unknown', baselineSource: baseline.source };
  }

  let milesRemaining: number | undefined;
  let nextDueOdometer: number | undefined;
  if (schedule.intervalMiles != null && baseline.odometer != null && current.odometer != null) {
    nextDueOdometer = baseline.odometer + schedule.intervalMiles;
    milesRemaining = nextDueOdometer - current.odometer;
  }

  let daysRemaining: number | undefined;
  let nextDueDate: string | undefined;
  if (schedule.intervalMonths != null && baseline.date != null) {
    nextDueDate = addMonths(baseline.date, schedule.intervalMonths);
    daysRemaining = daysBetween(current.today, nextDueDate);
  }

  // Neither applicable interval could be evaluated (missing baseline value) → unknown.
  if (milesRemaining === undefined && daysRemaining === undefined) {
    return { status: 'unknown', baselineSource: baseline.source, nextDueOdometer, nextDueDate };
  }

  const overdue =
    (milesRemaining != null && milesRemaining <= 0) ||
    (daysRemaining != null && daysRemaining <= 0);
  const dueSoon =
    (milesRemaining != null && milesRemaining <= DUE_SOON_MILES) ||
    (daysRemaining != null && daysRemaining <= DUE_SOON_DAYS);

  const status: ReminderStatus = overdue ? 'overdue' : dueSoon ? 'due_soon' : 'ok';

  return {
    status,
    baselineSource: baseline.source,
    nextDueOdometer,
    nextDueDate,
    milesRemaining,
    daysRemaining,
  };
}
