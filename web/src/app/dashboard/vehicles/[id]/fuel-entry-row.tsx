'use client';

import type { FuelEntry } from '@stablebook/shared';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { apiFetch } from '@/lib/auth-client';

import { FuelQuickAddForm } from './fuel-quick-add';

/**
 * One row in the "Recent fill-ups" list. The collapsed row is clickable —
 * clicking it opens the entry into the fuel form (edit mode) plus a delete
 * action (with a lightweight inline confirm). `onChanged` re-fetches the list
 * after an edit or delete.
 */
export function FuelEntryRow({
  vehicleId,
  entry,
  mpg,
  onChanged,
}: {
  vehicleId: string;
  entry: FuelEntry;
  /** Computed MPG for this fill-up (tank-filled only); omitted when not derivable. */
  mpg?: number;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setConfirmingDelete(false);
    setError(null);
  }

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

  if (open) {
    return (
      <li className="py-3">
        <div className="space-y-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          <FuelQuickAddForm
            vehicleId={vehicleId}
            entry={entry}
            onUpdated={() => {
              close();
              onChanged();
            }}
            onCancel={close}
          />
          <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-3 text-xs dark:border-zinc-800">
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
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="font-medium text-destructive hover:underline"
              >
                Delete entry
              </button>
            )}
          </div>
        </div>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-mx-2 grid w-full grid-cols-[auto_1fr_auto] items-baseline gap-3 rounded px-2 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-900"
      >
        <span className="font-mono text-xs text-zinc-500">{entry.entryDate}</span>
        <span>
          {Number(entry.gallons).toFixed(2)} gal · {Number(entry.odometer).toLocaleString()} mi
          {!entry.tankFilled && <span className="ml-2 text-xs text-zinc-500">(partial)</span>}
          {mpg !== undefined && (
            <span className="ml-2 text-xs font-medium text-zinc-500">{mpg.toFixed(1)} mpg</span>
          )}
        </span>
        <span className="text-right tabular-nums">
          ${Number(entry.totalCost).toFixed(2)}{' '}
          <span className="text-xs text-zinc-500">
            @ ${Number(entry.pricePerGallon).toFixed(3)}/gal
          </span>
        </span>
      </button>
    </li>
  );
}
