'use client';

import type { MaintenanceEntry } from '@stablebook/shared';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { apiFetch } from '@/lib/auth-client';

import { MaintenanceQuickAddForm } from './maintenance-quick-add';

/**
 * One row in the "Recent maintenance" list. Shows the entry with Edit / Delete
 * actions; Edit swaps the row for the maintenance form in edit mode, Delete asks
 * for a lightweight inline confirmation. `onChanged` re-fetches after either.
 */
export function MaintenanceEntryRow({
  vehicleId,
  entry,
  onChanged,
}: {
  vehicleId: string;
  entry: MaintenanceEntry;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function deleteEntry() {
    setError(null);
    startTransition(async () => {
      try {
        await apiFetch<{ id: string; deleted: boolean }>(
          `/api/vehicles/${encodeURIComponent(vehicleId)}/maintenance/${encodeURIComponent(entry.id)}`,
          { method: 'DELETE' },
        );
        onChanged();
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message === 'Not signed in' || err.message === 'Session expired')
        ) {
          router.replace('/sign-in');
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  if (editing) {
    return (
      <li className="py-3">
        <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          <MaintenanceQuickAddForm
            vehicleId={vehicleId}
            entry={entry}
            onUpdated={() => {
              setEditing(false);
              onChanged();
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-1 py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-xs text-zinc-500">{entry.entryDate}</span>
        <span className="text-right tabular-nums">
          {Number(entry.odometer).toLocaleString()} mi
          {entry.totalCost !== null && (
            <span className="ml-2">${Number(entry.totalCost).toFixed(2)}</span>
          )}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {entry.tasks.map((t) => (
          <span
            key={t.id}
            className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            {t.name}
          </span>
        ))}
      </div>
      {entry.shopName && <span className="text-xs text-zinc-500">{entry.shopName}</span>}
      <div className="flex items-center justify-end gap-3 text-xs">
        {error && <span className="mr-auto text-destructive">{error}</span>}
        {confirmingDelete ? (
          <>
            <span className="text-zinc-500">Delete this entry?</span>
            <button
              type="button"
              onClick={deleteEntry}
              disabled={pending}
              className="font-medium text-destructive hover:underline disabled:opacity-50"
            >
              {pending ? 'Deleting…' : 'Delete'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={pending}
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
              Delete
            </button>
          </>
        )}
      </div>
    </li>
  );
}
