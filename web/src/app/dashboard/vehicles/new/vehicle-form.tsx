'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { createVehicleAction, type CreateVehicleState } from './actions';

const initialState: CreateVehicleState = {};

export function VehicleForm() {
  const [state, action] = useActionState(createVehicleAction, initialState);

  return (
    <form action={action} className="flex flex-col gap-5">
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

      <SubmitButton />
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

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving…' : 'Add vehicle'}
    </Button>
  );
}
