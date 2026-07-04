'use client';

import {
  CreateScheduleInputSchema,
  type ListMaintenanceTasksResponse,
  type ListSchedulesResponse,
  type MaintenanceSchedule,
  type MaintenanceTask,
  type ReminderStatus,
} from '@stablebook/shared';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/auth-client';

const PILL: Record<ReminderStatus, { label: string; cls: string }> = {
  overdue: { label: 'Overdue', cls: 'bg-destructive/10 text-destructive' },
  due_soon: {
    label: 'Due soon',
    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  },
  ok: {
    label: 'OK',
    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  },
  unknown: {
    label: 'No data',
    cls: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  },
};

function onAuthError(err: unknown): boolean {
  return (
    err instanceof Error && (err.message === 'Not signed in' || err.message === 'Session expired')
  );
}

function intervalLabel(s: MaintenanceSchedule): string {
  const parts: string[] = [];
  if (s.intervalMiles != null) parts.push(`${s.intervalMiles.toLocaleString()} mi`);
  if (s.intervalMonths != null) parts.push(`${s.intervalMonths} mo`);
  return `every ${parts.join(' / ')}`;
}

function statusDetail(s: MaintenanceSchedule): string {
  if (s.status === 'unknown') return 'No history yet — log this service once to start tracking.';
  const parts: string[] = [];
  if (s.milesRemaining != null) {
    parts.push(
      s.milesRemaining >= 0
        ? `${s.milesRemaining.toLocaleString()} mi to go`
        : `${Math.abs(s.milesRemaining).toLocaleString()} mi overdue`,
    );
  }
  if (s.daysRemaining != null) {
    parts.push(
      s.daysRemaining >= 0
        ? `${s.daysRemaining} days to go`
        : `${Math.abs(s.daysRemaining)} days overdue`,
    );
  }
  return parts.join(' · ');
}

/**
 * "Schedules & reminders" panel on a vehicle's Maintenance tab: lists each
 * routine with its computed due status and supports add / edit-interval / delete.
 */
export function VehicleSchedules({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const [schedules, setSchedules] = useState<MaintenanceSchedule[] | null>(null);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    return apiFetch<ListSchedulesResponse>(
      `/api/vehicles/${encodeURIComponent(vehicleId)}/schedules`,
    )
      .then((res) => setSchedules(res.schedules))
      .catch((err: unknown) => {
        if (onAuthError(err)) return router.replace('/sign-in');
        setSchedules([]);
      });
  }, [vehicleId, router]);

  useEffect(() => {
    void load();
    apiFetch<ListMaintenanceTasksResponse>('/api/maintenance-tasks')
      .then((res) => setTasks(res.tasks))
      .catch(() => {});
  }, [load]);

  function addSchedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const numOrUndef = (v: FormDataEntryValue | null) => {
      const t = typeof v === 'string' ? v.trim() : '';
      if (t === '') return undefined;
      const n = Number(t);
      return Number.isFinite(n) ? n : NaN;
    };
    const raw = {
      taskId: typeof fd.get('taskId') === 'string' ? (fd.get('taskId') as string) : '',
      intervalMiles: numOrUndef(fd.get('intervalMiles')),
      intervalMonths: numOrUndef(fd.get('intervalMonths')),
    };
    const parsed = CreateScheduleInputSchema.safeParse(raw);
    if (!parsed.success) {
      setError('Pick a task and at least one interval (miles or months).');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await apiFetch(`/api/vehicles/${encodeURIComponent(vehicleId)}/schedules`, {
          method: 'POST',
          body: JSON.stringify(parsed.data),
        });
        form.reset();
        setAdding(false);
        await load();
      } catch (err) {
        if (onAuthError(err)) return router.replace('/sign-in');
        const msg = err instanceof Error ? err.message : String(err);
        setError(/\b409\b/.test(msg) ? 'That task already has a schedule on this vehicle.' : msg);
      }
    });
  }

  const scheduledTaskIds = new Set((schedules ?? []).map((s) => s.taskId));
  const availableTasks = tasks.filter((t) => !scheduledTaskIds.has(t.id));

  return (
    <div className="flex flex-col gap-3 text-sm">
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive">
          {error}
        </p>
      )}

      {schedules === null && <p className="text-zinc-500">Loading…</p>}
      {schedules !== null && schedules.length === 0 && !adding && (
        <p className="text-zinc-600 dark:text-zinc-400">
          No schedules yet. Add a routine (e.g. oil change every 5,000 mi / 6 months) to get
          reminders.
        </p>
      )}

      {schedules !== null && schedules.length > 0 && (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {schedules.map((s) => (
            <ScheduleRow key={s.id} vehicleId={vehicleId} schedule={s} onChanged={load} />
          ))}
        </ul>
      )}

      {adding ? (
        <form
          onSubmit={addSchedule}
          className="flex flex-col gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="taskId">Task</Label>
            <select
              id="taskId"
              name="taskId"
              required
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring"
            >
              <option value="">Select a task…</option>
              {availableTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="intervalMiles">Every (miles)</Label>
              <Input
                id="intervalMiles"
                name="intervalMiles"
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="5000"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="intervalMonths">Every (months)</Label>
              <Input
                id="intervalMonths"
                name="intervalMonths"
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="6"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? 'Adding…' : 'Add schedule'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            + Add schedule
          </Button>
        </div>
      )}
    </div>
  );
}

function ScheduleRow({
  vehicleId,
  schedule,
  onChanged,
}: {
  vehicleId: string;
  schedule: MaintenanceSchedule;
  onChanged: () => void | Promise<unknown>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const pill = PILL[schedule.status];

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const numOrNull = (v: FormDataEntryValue | null) => {
      const t = typeof v === 'string' ? v.trim() : '';
      if (t === '') return null;
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    };
    const miles = numOrNull(fd.get('intervalMiles'));
    const months = numOrNull(fd.get('intervalMonths'));
    if (miles == null && months == null) {
      setError('Keep at least one interval.');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await apiFetch(
          `/api/vehicles/${encodeURIComponent(vehicleId)}/schedules/${encodeURIComponent(schedule.id)}`,
          {
            method: 'PATCH',
            body: JSON.stringify({ intervalMiles: miles, intervalMonths: months }),
          },
        );
        setEditing(false);
        await onChanged();
      } catch (err) {
        if (onAuthError(err)) return router.replace('/sign-in');
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  function remove() {
    startTransition(async () => {
      try {
        await apiFetch(
          `/api/vehicles/${encodeURIComponent(vehicleId)}/schedules/${encodeURIComponent(schedule.id)}`,
          { method: 'DELETE' },
        );
        await onChanged();
      } catch (err) {
        if (onAuthError(err)) return router.replace('/sign-in');
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  if (editing) {
    return (
      <li className="py-3">
        <form onSubmit={save} className="flex flex-col gap-2">
          <p className="font-medium">{schedule.taskName}</p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              name="intervalMiles"
              type="number"
              min={1}
              defaultValue={schedule.intervalMiles ?? ''}
              placeholder="miles"
            />
            <Input
              name="intervalMonths"
              type="number"
              min={1}
              defaultValue={schedule.intervalMonths ?? ''}
              placeholder="months"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-1 py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium">{schedule.taskName}</span>
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${pill.cls}`}>
          {pill.label}
        </span>
      </div>
      <p className="text-xs text-zinc-500">
        {intervalLabel(schedule)} · {statusDetail(schedule)}
      </p>
      <div className="flex items-center gap-3 text-xs">
        {error && <span className="mr-auto text-destructive">{error}</span>}
        {confirmingDelete ? (
          <>
            <span className="text-zinc-500">Remove?</span>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="font-medium text-destructive hover:underline disabled:opacity-50"
            >
              {pending ? 'Removing…' : 'Remove'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="text-zinc-500 hover:underline"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="font-medium text-primary hover:underline"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="font-medium text-destructive hover:underline"
            >
              Remove
            </button>
          </>
        )}
      </div>
    </li>
  );
}
