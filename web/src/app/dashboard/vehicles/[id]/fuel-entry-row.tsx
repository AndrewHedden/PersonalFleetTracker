'use client';

import type { FuelEntry } from '@stablebook/shared';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { apiFetch } from '@/lib/auth-client';

import { FuelQuickAddForm } from './fuel-quick-add';

/**
 * One row in the "Recent fill-ups" list. Shows the entry with Edit / Delete
 * actions; Edit swaps the row for the fuel form in edit mode, Delete asks for a
 * lightweight inline confirmation. `onChanged` re-fetches the list after either.
 */
export function FuelEntryRow({
  vehicleId,
  entry,
  onChanged,
}: {
  vehicleId: string;
  entry: FuelEntry;
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
          `/api/vehicles/${encodeURIComponent(vehicleId)}/fuel/${encodeURIComponent(entry.id)}`,
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
          <FuelQuickAddForm
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
      <div className="grid grid-cols-[auto_1fr_auto] items-baseline gap-3">
        <span className="font-mono text-xs text-zinc-500">{entry.entryDate}</span>
        <span>
          {Number(entry.gallons).toFixed(2)} gal · {Number(entry.odometer).toLocaleString()} mi
          {!entry.tankFilled && <span className="ml-2 text-xs text-zinc-500">(partial)</span>}
        </span>
        <span className="text-right tabular-nums">
          ${Number(entry.totalCost).toFixed(2)}{' '}
          <span className="text-xs text-zinc-500">
            @ ${Number(entry.pricePerGallon).toFixed(3)}/gal
          </span>
        </span>
      </div>
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
