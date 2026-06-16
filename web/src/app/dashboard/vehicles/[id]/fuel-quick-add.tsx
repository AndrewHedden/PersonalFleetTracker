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

/** Which money field, if any, is currently auto-derived from the other two. */
type Derived = 'totalCost' | 'pricePerGallon' | null;

/** Local YYYY-MM-DD (not UTC — `toISOString` would roll over to tomorrow in
 *  negative-offset timezones during the evening). */
function today(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** Parse a numeric input value; '' or non-numeric → null. */
function num(s: string): number | null {
  const t = s.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Inline "log a fill-up" form. In **create** mode (no `entry`) it lives at the
 * top of the vehicle page and resets itself after each submit. In **edit** mode
 * (`entry` provided) it pre-fills from the entry, PATCHes on save, and calls
 * `onUpdated` / `onCancel` instead of resetting.
 *
 * The three money fields auto-complete each other: gallons + total cost derives
 * $/gallon; gallons + $/gallon derives total cost. Only the field the user
 * isn't currently authoring is auto-written, so a typed value is never clobbered.
 */
export function FuelQuickAddForm({
  vehicleId,
  entry,
  onCreated,
  onUpdated,
  onCancel,
}: {
  vehicleId: string;
  entry?: FuelEntry;
  onCreated?: (entry: FuelEntry) => void;
  onUpdated?: (entry: FuelEntry) => void;
  onCancel?: () => void;
}) {
  const isEdit = entry != null;
  const router = useRouter();
  const [state, setState] = useState<FormState>({});
  const [pending, startTransition] = useTransition();

  // Controlled so we can auto-derive the third value as the user types.
  const [gallons, setGallons] = useState(entry?.gallons ?? '');
  const [totalCost, setTotalCost] = useState(entry?.totalCost ?? '');
  const [pricePerGallon, setPricePerGallon] = useState(entry?.pricePerGallon ?? '');
  const [derived, setDerived] = useState<Derived>(null);

  function onGallonsChange(v: string) {
    setGallons(v);
    const g = num(v);
    // Re-derive whichever field is currently the computed one.
    if (derived === 'pricePerGallon') {
      const c = num(totalCost);
      setPricePerGallon(g && g > 0 && c !== null ? (c / g).toFixed(3) : '');
    } else if (derived === 'totalCost') {
      const p = num(pricePerGallon);
      setTotalCost(g !== null && p !== null ? (g * p).toFixed(2) : '');
    }
  }

  function onTotalCostChange(v: string) {
    // User is authoring total cost → $/gallon becomes the derived field.
    setTotalCost(v);
    setDerived('pricePerGallon');
    const g = num(gallons);
    const c = num(v);
    setPricePerGallon(g && g > 0 && c !== null ? (c / g).toFixed(3) : '');
  }

  function onPricePerGallonChange(v: string) {
    // User is authoring $/gallon → total cost becomes the derived field.
    setPricePerGallon(v);
    setDerived('totalCost');
    const g = num(gallons);
    const p = num(v);
    setTotalCost(g !== null && p !== null ? (g * p).toFixed(2) : '');
  }

  function resetAmounts() {
    setGallons('');
    setTotalCost('');
    setPricePerGallon('');
    setDerived(null);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);

    const trim = (v: FormDataEntryValue | null) =>
      typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
    const toNum = (v: string): number | undefined => {
      const n = num(v);
      return n === null ? undefined : n;
    };

    const raw = {
      entryDate: trim(fd.get('entryDate')),
      odometer: (() => {
        const t = trim(fd.get('odometer'));
        if (t === undefined) return undefined;
        const n = Number(t);
        return Number.isFinite(n) ? n : NaN;
      })(),
      gallons: toNum(gallons),
      totalCost: toNum(totalCost),
      pricePerGallon: toNum(pricePerGallon),
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
        if (isEdit) {
          const updated = await apiFetch<FuelEntry>(
            `/api/vehicles/${encodeURIComponent(vehicleId)}/fuel/${encodeURIComponent(entry.id)}`,
            { method: 'PATCH', body: JSON.stringify(parsed.data) },
          );
          onUpdated?.(updated);
        } else {
          const created = await apiFetch<FuelEntry>(
            `/api/vehicles/${encodeURIComponent(vehicleId)}/fuel`,
            { method: 'POST', body: JSON.stringify(parsed.data) },
          );
          onCreated?.(created);
          // Reset for the next entry.
          form.reset();
          resetAmounts();
        }
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field
          name="gallons"
          label="Gallons"
          type="number"
          inputMode="decimal"
          step="0.001"
          min={0}
          required
          placeholder="12.345"
          value={gallons}
          onChange={(e) => onGallonsChange(e.target.value)}
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
          value={totalCost}
          onChange={(e) => onTotalCostChange(e.target.value)}
          hint={derived === 'totalCost' ? 'auto' : undefined}
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
          value={pricePerGallon}
          onChange={(e) => onPricePerGallonChange(e.target.value)}
          hint={derived === 'pricePerGallon' ? 'auto' : undefined}
          error={state.fieldErrors?.pricePerGallon?.[0]}
          wrapperClassName="col-span-2 sm:col-span-1"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="tankFilled"
            defaultChecked={entry ? entry.tankFilled : true}
            className="size-4 rounded border-zinc-300 dark:border-zinc-700"
          />
          <span>Tank filled (needed for MPG)</span>
        </label>
        <div className="flex gap-2">
          {isEdit && (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : isEdit ? 'Save' : 'Log fill-up'}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  error,
  hint,
  wrapperClassName,
  ...rest
}: {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={`flex flex-col gap-1.5 ${wrapperClassName ?? ''}`}>
      <div className="flex items-baseline justify-between">
        <Label htmlFor={name}>{label}</Label>
        {hint && <span className="text-[10px] uppercase tracking-wide text-zinc-400">{hint}</span>}
      </div>
      <Input id={name} name={name} aria-invalid={error ? true : undefined} {...rest} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
