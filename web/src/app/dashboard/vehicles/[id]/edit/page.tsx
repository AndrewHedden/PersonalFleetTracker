'use client';

import { UpdateVehicleInputSchema, type Vehicle } from '@stablebook/shared';
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

export default function EditVehiclePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [state, setState] = useState<FormState>({});
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const s = readSession();
    if (!s) {
      router.replace('/sign-in');
      return;
    }
    apiFetch<Vehicle>(`/api/vehicles/${encodeURIComponent(id)}`)
      .then(setVehicle)
      .catch((err: unknown) => {
        if (err instanceof Error && err.message === 'Session expired') {
          router.replace('/sign-in');
          return;
        }
        setLoadError(err instanceof Error ? err.message : String(err));
      });
  }, [id, router]);

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
      nickname: trim(fd.get('nickname')),
      year: num(fd.get('year')),
      make: trim(fd.get('make')),
      model: trim(fd.get('model')),
      trim: trim(fd.get('trim')),
      vin: trim(fd.get('vin')),
      licensePlate: trim(fd.get('licensePlate')),
      color: trim(fd.get('color')),
      purchaseOdometer: num(fd.get('purchaseOdometer')),
    };

    const parsed = UpdateVehicleInputSchema.safeParse(raw);
    if (!parsed.success) {
      setState({ fieldErrors: parsed.error.flatten().fieldErrors });
      return;
    }

    setState({});
    startTransition(async () => {
      try {
        await apiFetch<Vehicle>(`/api/vehicles/${encodeURIComponent(id)}`, {
          method: 'PATCH',
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

  if (loadError) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
        <header className="flex items-baseline justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Edit vehicle</h1>
          <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>
            Back
          </Link>
        </header>
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {loadError}
        </p>
      </main>
    );
  }

  if (!vehicle) return null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <header className="flex items-baseline justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Edit vehicle
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{vehicle.nickname}</h1>
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
          <CardTitle>Vehicle details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            {state.error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {state.error}
              </p>
            )}

            <Field
              name="nickname"
              label="Nickname"
              required
              defaultValue={vehicle.nickname}
              error={state.fieldErrors?.nickname?.[0]}
            />

            <div className="grid grid-cols-3 gap-3">
              <Field
                name="year"
                label="Year"
                type="number"
                inputMode="numeric"
                min={1900}
                max={2100}
                defaultValue={vehicle.year ?? undefined}
                error={state.fieldErrors?.year?.[0]}
              />
              <Field
                name="make"
                label="Make"
                required
                defaultValue={vehicle.make}
                error={state.fieldErrors?.make?.[0]}
              />
              <Field
                name="model"
                label="Model"
                required
                defaultValue={vehicle.model}
                error={state.fieldErrors?.model?.[0]}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field
                name="trim"
                label="Trim"
                defaultValue={vehicle.trim ?? ''}
                error={state.fieldErrors?.trim?.[0]}
              />
              <Field
                name="color"
                label="Color"
                defaultValue={vehicle.color ?? ''}
                error={state.fieldErrors?.color?.[0]}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field
                name="licensePlate"
                label="License plate"
                defaultValue={vehicle.licensePlate ?? ''}
                error={state.fieldErrors?.licensePlate?.[0]}
              />
              <Field
                name="vin"
                label="VIN"
                maxLength={17}
                defaultValue={vehicle.vin ?? ''}
                error={state.fieldErrors?.vin?.[0]}
              />
            </div>

            <Field
              name="purchaseOdometer"
              label="Odometer at purchase"
              type="number"
              inputMode="numeric"
              min={0}
              defaultValue={vehicle.purchaseOdometer ?? undefined}
              error={state.fieldErrors?.purchaseOdometer?.[0]}
            />

            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save changes'}
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
