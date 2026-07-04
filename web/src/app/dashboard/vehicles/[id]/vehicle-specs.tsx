'use client';

import { VehicleSpecsSchema, type Vehicle, type VehicleSpecs } from '@stablebook/shared';
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

const isEmpty = (s: VehicleSpecs | null): boolean =>
  !s || Object.values(s).every((v) => v == null || (typeof v === 'object' && isEmptyTire(v)));
const isEmptyTire = (t: unknown): boolean =>
  !t || Object.values(t as Record<string, unknown>).every((v) => v == null || v === '');

/**
 * "Quick details" tab body — reference specs the owner keeps handy (engine oil,
 * tires front/rear, torques, part numbers). Read view by default; "Edit"
 * reveals a grouped form that PATCHes the vehicle's `specs` JSON blob.
 */
export function VehicleSpecs({
  vehicle,
  onSaved,
}: {
  vehicle: Vehicle;
  onSaved: (v: Vehicle) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<FormState>({});
  const [pending, startTransition] = useTransition();

  const specs = vehicle.specs;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const g = (k: string) => {
      const v = fd.get(k);
      return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
    };
    const tire = (prefix: string) => {
      const t = {
        size: g(`${prefix}.size`),
        pressure: g(`${prefix}.pressure`),
        brand: g(`${prefix}.brand`),
        model: g(`${prefix}.model`),
      };
      return Object.values(t).some((v) => v !== undefined) ? t : undefined;
    };

    const raw: Record<string, unknown> = {
      engineOilType: g('engineOilType'),
      engineOilBrand: g('engineOilBrand'),
      engineOilCapacity: g('engineOilCapacity'),
      oilFilterPartNumber: g('oilFilterPartNumber'),
      oilDrainPlugSocket: g('oilDrainPlugSocket'),
      oilDrainPlugTorque: g('oilDrainPlugTorque'),
      lugNutTorque: g('lugNutTorque'),
      tireFront: tire('tireFront'),
      tireRear: tire('tireRear'),
      notes: g('notes'),
    };
    for (const k of Object.keys(raw)) if (raw[k] === undefined) delete raw[k];

    const parsed = VehicleSpecsSchema.safeParse(raw);
    if (!parsed.success) {
      setState({ fieldErrors: parsed.error.flatten().fieldErrors });
      return;
    }

    setState({});
    startTransition(async () => {
      try {
        const updated = await apiFetch<Vehicle>(`/api/vehicles/${encodeURIComponent(vehicle.id)}`, {
          method: 'PATCH',
          body: JSON.stringify({ specs: parsed.data }),
        });
        onSaved(updated);
        setEditing(false);
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

  if (!editing) {
    return (
      <div className="space-y-4 text-sm">
        {isEmpty(specs) ? (
          <p className="text-zinc-600 dark:text-zinc-400">
            No details yet. Add reference specs like engine oil, tire pressures, and torque values.
          </p>
        ) : (
          <>
            <Group title="Engine oil">
              <Row label="Type" value={specs?.engineOilType} />
              <Row label="Brand" value={specs?.engineOilBrand} />
              <Row label="Capacity" value={specs?.engineOilCapacity} />
              <Row label="Oil filter part #" value={specs?.oilFilterPartNumber} />
              <Row label="Drain plug socket" value={specs?.oilDrainPlugSocket} />
              <Row label="Drain plug torque" value={specs?.oilDrainPlugTorque} />
            </Group>
            <Group title="Wheels & tires">
              <Row label="Lug nut torque" value={specs?.lugNutTorque} />
              <Row label="Front size" value={specs?.tireFront?.size} />
              <Row label="Front pressure" value={specs?.tireFront?.pressure} />
              <Row label="Front brand" value={specs?.tireFront?.brand} />
              <Row label="Front model" value={specs?.tireFront?.model} />
              <Row label="Rear size" value={specs?.tireRear?.size} />
              <Row label="Rear pressure" value={specs?.tireRear?.pressure} />
              <Row label="Rear brand" value={specs?.tireRear?.brand} />
              <Row label="Rear model" value={specs?.tireRear?.model} />
            </Group>
            {specs?.notes && (
              <Group title="Notes">
                <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                  {specs.notes}
                </p>
              </Group>
            )}
          </>
        )}
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          {isEmpty(specs) ? 'Add details' : 'Edit details'}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5 text-sm">
      {state.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Section title="Engine oil">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SpecField
            name="engineOilType"
            label="Type"
            placeholder="5W-30 synthetic"
            specs={specs}
          />
          <SpecField name="engineOilBrand" label="Brand" placeholder="Mobil 1" specs={specs} />
          <SpecField name="engineOilCapacity" label="Capacity" placeholder="6.5 qt" specs={specs} />
          <SpecField
            name="oilFilterPartNumber"
            label="Oil filter part #"
            placeholder="PF64"
            specs={specs}
          />
          <SpecField
            name="oilDrainPlugSocket"
            label="Drain plug socket"
            placeholder="15 mm"
            specs={specs}
          />
          <SpecField
            name="oilDrainPlugTorque"
            label="Drain plug torque"
            placeholder="18 ft-lb"
            specs={specs}
          />
        </div>
      </Section>

      <Section title="Wheels & tires">
        <SpecField
          name="lugNutTorque"
          label="Lug nut torque"
          placeholder="80 ft-lb"
          specs={specs}
        />
        <TireGroup label="Front" prefix="tireFront" specs={specs} />
        <TireGroup label="Rear" prefix="tireRear" specs={specs} />
      </Section>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={specs?.notes ?? ''}
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save details'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setEditing(false);
            setState({});
          }}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">{title}</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">{children}</dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="contents">
      <dt className="text-zinc-500">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function TireGroup({
  label,
  prefix,
  specs,
}: {
  label: string;
  prefix: 'tireFront' | 'tireRear';
  specs: VehicleSpecs | null;
}) {
  const t = specs?.[prefix];
  return (
    <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
      <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Bare name={`${prefix}.size`} label="Size" placeholder="275/40R20" value={t?.size} />
        <Bare
          name={`${prefix}.pressure`}
          label="Pressure"
          placeholder="35 psi"
          value={t?.pressure}
        />
        <Bare name={`${prefix}.brand`} label="Brand" placeholder="Michelin" value={t?.brand} />
        <Bare name={`${prefix}.model`} label="Model" placeholder="Pilot Sport" value={t?.model} />
      </div>
    </div>
  );
}

function SpecField({
  name,
  label,
  placeholder,
  specs,
}: {
  name: keyof VehicleSpecs;
  label: string;
  placeholder?: string;
  specs: VehicleSpecs | null;
}) {
  const v = specs?.[name];
  return (
    <Bare
      name={name}
      label={label}
      placeholder={placeholder}
      value={typeof v === 'string' ? v : ''}
    />
  );
}

function Bare({
  name,
  label,
  placeholder,
  value,
}: {
  name: string;
  label: string;
  placeholder?: string;
  value?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} placeholder={placeholder} defaultValue={value ?? ''} />
    </div>
  );
}
