'use client';

import {
  CreateMaintenanceEntryInputSchema,
  type ListMaintenanceTasksResponse,
  type MaintenanceEntry,
  type MaintenanceTask,
} from '@stablebook/shared';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/auth-client';

interface FormState {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function onAuthError(err: unknown): boolean {
  return (
    err instanceof Error && (err.message === 'Not signed in' || err.message === 'Session expired')
  );
}

/**
 * Inline "log maintenance" form. In **create** mode (no `entry`) it resets after
 * each submit. In **edit** mode (`entry` provided) it pre-fills from the entry
 * (including the selected task set), PATCHes on save, and calls `onUpdated` /
 * `onCancel` instead of resetting. Users can pick catalog tasks or add a custom
 * one on the fly.
 */
export function MaintenanceQuickAddForm({
  vehicleId,
  entry,
  onCreated,
  onUpdated,
  onCancel,
}: {
  vehicleId: string;
  entry?: MaintenanceEntry;
  onCreated?: (entry: MaintenanceEntry) => void;
  onUpdated?: (entry: MaintenanceEntry) => void;
  onCancel?: () => void;
}) {
  const isEdit = entry != null;
  const router = useRouter();
  const [tasks, setTasks] = useState<MaintenanceTask[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(entry?.tasks.map((t) => t.id) ?? []),
  );
  const [state, setState] = useState<FormState>({});
  const [pending, startTransition] = useTransition();

  // Custom-task sub-form.
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const [customPending, startCustomTransition] = useTransition();

  useEffect(() => {
    apiFetch<ListMaintenanceTasksResponse>('/api/maintenance-tasks')
      .then((res) => setTasks(res.tasks))
      .catch((err: unknown) => {
        if (onAuthError(err)) {
          router.replace('/sign-in');
          return;
        }
        setTasks([]);
        setState({ error: 'Could not load the task list.' });
      });
  }, [router]);

  function toggleTask(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addCustomTask() {
    const name = customName.trim();
    if (name === '') {
      setCustomError('Name is required.');
      return;
    }
    setCustomError(null);
    startCustomTransition(async () => {
      try {
        const created = await apiFetch<MaintenanceTask>('/api/maintenance-tasks', {
          method: 'POST',
          body: JSON.stringify({
            name,
            description: customDesc.trim() === '' ? undefined : customDesc.trim(),
          }),
        });
        setTasks((prev) => [...(prev ?? []), created].sort((a, b) => a.name.localeCompare(b.name)));
        setSelected((prev) => new Set(prev).add(created.id));
        setCustomName('');
        setCustomDesc('');
        setShowCustom(false);
      } catch (err) {
        if (onAuthError(err)) {
          router.replace('/sign-in');
          return;
        }
        // The API surfaces a 409 as "API 409: ...". Detect it for a friendly note.
        const msg = err instanceof Error ? err.message : String(err);
        setCustomError(/\b409\b/.test(msg) ? `You already have a task named "${name}".` : msg);
      }
    });
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);

    const trim = (v: FormDataEntryValue | null) =>
      typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
    const num = (v: FormDataEntryValue | null) => {
      const t = trim(v);
      if (t === undefined) return undefined;
      const n = Number(t);
      return Number.isFinite(n) ? n : NaN;
    };

    const raw = {
      entryDate: trim(fd.get('entryDate')),
      odometer: num(fd.get('odometer')),
      taskIds: [...selected],
      totalCost: num(fd.get('totalCost')),
      shopName: trim(fd.get('shopName')),
      notes: trim(fd.get('notes')),
    };

    const parsed = CreateMaintenanceEntryInputSchema.safeParse(raw);
    if (!parsed.success) {
      setState({ fieldErrors: parsed.error.flatten().fieldErrors });
      return;
    }

    setState({});
    startTransition(async () => {
      try {
        if (isEdit) {
          const updated = await apiFetch<MaintenanceEntry>(
            `/api/vehicles/${encodeURIComponent(vehicleId)}/maintenance/${encodeURIComponent(entry.id)}`,
            { method: 'PATCH', body: JSON.stringify(parsed.data) },
          );
          onUpdated?.(updated);
        } else {
          const created = await apiFetch<MaintenanceEntry>(
            `/api/vehicles/${encodeURIComponent(vehicleId)}/maintenance`,
            { method: 'POST', body: JSON.stringify(parsed.data) },
          );
          onCreated?.(created);
          form.reset();
          setSelected(new Set());
        }
      } catch (err) {
        if (onAuthError(err)) {
          router.replace('/sign-in');
          return;
        }
        setState({ error: err instanceof Error ? err.message : String(err) });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {state.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field
          name="entryDate"
          label="Date"
          type="date"
          required
          defaultValue={entry?.entryDate ?? today()}
          error={state.fieldErrors?.entryDate?.[0]}
        />
        <Field
          name="odometer"
          label="Odometer (mi)"
          type="number"
          inputMode="numeric"
          min={0}
          required
          placeholder="e.g. 87500"
          defaultValue={entry ? String(entry.odometer) : undefined}
          error={state.fieldErrors?.odometer?.[0]}
        />
      </div>

      {/* Task picker */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>Tasks performed</Label>
          <button
            type="button"
            onClick={() => setShowCustom((v) => !v)}
            className="text-xs font-medium text-primary hover:underline"
          >
            {showCustom ? 'Cancel' : '+ Add custom task'}
          </button>
        </div>

        {showCustom && (
          <div className="flex flex-col gap-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Task name (e.g. Differential fluid)"
              aria-label="Custom task name"
            />
            <Input
              value={customDesc}
              onChange={(e) => setCustomDesc(e.target.value)}
              placeholder="Description (optional)"
              aria-label="Custom task description"
            />
            {customError && <p className="text-xs text-destructive">{customError}</p>}
            <div>
              <Button type="button" size="sm" onClick={addCustomTask} disabled={customPending}>
                {customPending ? 'Adding…' : 'Add task'}
              </Button>
            </div>
          </div>
        )}

        {tasks === null && <p className="text-sm text-zinc-500">Loading tasks…</p>}
        {tasks !== null && tasks.length > 0 && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
            {tasks.map((t) => (
              <label
                key={t.id}
                className="flex items-center gap-2 text-sm"
                title={t.description ?? undefined}
              >
                <input
                  type="checkbox"
                  checked={selected.has(t.id)}
                  onChange={() => toggleTask(t.id)}
                  className="size-4 rounded border-zinc-300 dark:border-zinc-700"
                />
                <span className="truncate">{t.name}</span>
              </label>
            ))}
          </div>
        )}
        {state.fieldErrors?.taskIds?.[0] && (
          <p className="text-xs text-destructive">Select at least one task.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          name="totalCost"
          label="Total cost ($)"
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0}
          placeholder="Optional"
          defaultValue={entry?.totalCost ?? undefined}
          error={state.fieldErrors?.totalCost?.[0]}
        />
        <Field
          name="shopName"
          label="Shop"
          placeholder="Optional"
          defaultValue={entry?.shopName ?? undefined}
          error={state.fieldErrors?.shopName?.[0]}
        />
      </div>

      <Field
        name="notes"
        label="Notes"
        placeholder="Optional"
        defaultValue={entry?.notes ?? undefined}
        error={state.fieldErrors?.notes?.[0]}
      />

      <div className="flex justify-end gap-2">
        {isEdit && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : isEdit ? 'Save' : 'Log maintenance'}
        </Button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  error,
  ...rest
}: {
  name: string;
  label: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} aria-invalid={error ? true : undefined} {...rest} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
