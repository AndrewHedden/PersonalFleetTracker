'use client';

import { CreateVehicleInputSchema } from '@stablebook/shared';
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

/**
 * Client-side form submitting to `/api/vehicles` via fetch.
 *
 * We use a Next.js Route Handler instead of a server action because Next 16
 * server actions over multipart/form-data don't carry the session cookie
 * through CloudFront/OpenNext in our setup (the Lambda sees an empty Cookie
 * header). Route handlers receive cookies normally — see task #47.
 */
export function VehicleForm() {
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

    const parsed = CreateVehicleInputSchema.safeParse(raw);
    if (!parsed.success) {
      setState({ fieldErrors: parsed.error.flatten().fieldErrors });
      return;
    }

    setState({});
    startTransition(async () => {
      try {
        await apiFetch('/api/vehicles', {
          method: 'POST',
          body: JSON.stringify(parsed.data),
        });
        router.push('/dashboard');
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message === 'Not signed in' || err.message === 'Session expired')
        ) {
          router.push('/sign-in');
          return;
        }
        setState({ error: err instanceof Error ? err.message : 'Unknown error' });
      }
    });
  }

  return (
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
        placeholder="The Honda"
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
          placeholder="2018"
          error={state.fieldErrors?.year?.[0]}
        />
        <Field
          name="make"
          label="Make"
          required
          placeholder="Honda"
          error={state.fieldErrors?.make?.[0]}
        />
        <Field
          name="model"
          label="Model"
          required
          placeholder="Civic"
          error={state.fieldErrors?.model?.[0]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field name="trim" label="Trim" placeholder="Sport" error={state.fieldErrors?.trim?.[0]} />
        <Field
          name="color"
          label="Color"
          placeholder="Silver"
          error={state.fieldErrors?.color?.[0]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          name="licensePlate"
          label="License plate"
          placeholder="ABC-1234"
          error={state.fieldErrors?.licensePlate?.[0]}
        />
        <Field
          name="vin"
          label="VIN"
          maxLength={17}
          placeholder="17 chars"
          error={state.fieldErrors?.vin?.[0]}
        />
      </div>

      <Field
        name="purchaseOdometer"
        label="Odometer at purchase"
        type="number"
        inputMode="numeric"
        min={0}
        placeholder="e.g. 42000"
        error={state.fieldErrors?.purchaseOdometer?.[0]}
      />

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Add vehicle'}
      </Button>
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
