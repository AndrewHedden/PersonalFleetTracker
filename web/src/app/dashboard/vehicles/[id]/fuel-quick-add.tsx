'use client';

import { CreateFuelEntryInputSchema, type FuelEntry } from '@stablebook/shared';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

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

/**
 * Compact, inline "log a fill-up" form rendered at the top of the vehicle
 * detail page. Logging fuel is the app's most frequent task, so this lives
 * inline (no navigation): on success it calls `onCreated` and resets itself so
 * the next entry can be typed immediately.
 */
export function FuelQuickAddForm({
  vehicleId,
  onCreated,
}: {
  vehicleId: string;
  onCreated: (entry: FuelEntry) => void;
}) {
  const router = useRouter();
  const [state, setState] = useState<FormState>({});
  const [pending, startTransition] = useTransition();

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
      gallons: num(fd.get('gallons')),
      totalCost: num(fd.get('totalCost')),
      pricePerGallon: num(fd.get('pricePerGallon')),
      tankFilled: fd.get('tankFilled') === 'on',
      notes: trim(fd.get('notes')),
    };

    const parsed = CreateFuelEntryInputSchema.safeParse(raw);
    if (!parsed.success) {
      setState({ fieldErrors: parsed.error.flatten().fieldErrors });
      return;
    }

    setState({});
    startTransition(async () => {
      try {
        const created = await apiFetch<FuelEntry>(
          `/api/vehicles/${encodeURIComponent(vehicleId)}/fuel`,
          { method: 'POST', body: JSON.stringify(parsed.data) },
        );
        onCreated(created);
        // Reset for the next entry: clear amounts, re-default date to today,
        // re-check "tank filled".
        form.reset();
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message === 'Not signed in' || err.message === 'Session expired')
        ) {
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
          defaultValue={today()}
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
          error={state.fieldErrors?.odometer?.[0]}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field
          name="gallons"
          label="Gallons"
          type="number"
          inputMode="decimal"
          step="0.001"
          min={0}
          required
          placeholder="12.345"
          error={state.fieldErrors?.gallons?.[0]}
        />
        <Field
          name="totalCost"
          label="Total cost ($)"
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0}
          required
          placeholder="42.75"
          error={state.fieldErrors?.totalCost?.[0]}
        />
        <Field
          name="pricePerGallon"
          label="$ / gallon"
          type="number"
          inputMode="decimal"
          step="0.001"
          min={0}
          required
          placeholder="3.459"
          error={state.fieldErrors?.pricePerGallon?.[0]}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="tankFilled"
            defaultChecked
            className="size-4 rounded border-zinc-300 dark:border-zinc-700"
          />
          <span>Tank filled (needed for MPG)</span>
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Log fill-up'}
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
