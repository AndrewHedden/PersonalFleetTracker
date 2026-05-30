'use client';

import { CreateFuelEntryInputSchema, type FuelEntry } from '@stablebook/shared';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch, readSession } from '@/lib/auth-client';

interface FormState {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

export default function NewFuelEntryPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [ready, setReady] = useState(false);
  const [state, setState] = useState<FormState>({});
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const s = readSession();
    if (!s) {
      router.replace('/sign-in');
      return;
    }
    setReady(true);
  }, [router]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);

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
        await apiFetch<FuelEntry>(`/api/vehicles/${encodeURIComponent(id)}/fuel`, {
          method: 'POST',
          body: JSON.stringify(parsed.data),
        });
        router.push(`/dashboard/vehicles/${encodeURIComponent(id)}`);
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

  if (!ready) return null;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <header className="flex items-baseline justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Fuel</p>
          <h1 className="text-3xl font-semibold tracking-tight">Log a fill-up</h1>
        </div>
        <Link
          href={`/dashboard/vehicles/${encodeURIComponent(id)}`}
          className={buttonVariants({ variant: 'outline' })}
        >
          Cancel
        </Link>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Entry details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
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
                defaultValue={today}
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

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="tankFilled"
                defaultChecked
                className="size-4 rounded border-zinc-300 dark:border-zinc-700"
              />
              <span>Tank filled (required for accurate MPG calculation)</span>
            </label>

            <Field
              name="notes"
              label="Notes"
              placeholder="Optional"
              error={state.fieldErrors?.notes?.[0]}
            />

            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Log fill-up'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
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
