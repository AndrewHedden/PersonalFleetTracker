'use client';

import type { FuelEntry, ListFuelEntriesResponse, Vehicle } from '@stablebook/shared';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch, readSession } from '@/lib/auth-client';

export default function VehicleDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [fuel, setFuel] = useState<FuelEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
        setError(err instanceof Error ? err.message : String(err));
      });
    apiFetch<ListFuelEntriesResponse>(`/api/vehicles/${encodeURIComponent(id)}/fuel`)
      .then((res) => setFuel(res.entries))
      .catch(() => {
        // Don't surface fuel-list failures as the page-level error; vehicle
        // details are still useful even if the fuel log can't load.
        setFuel([]);
      });
  }, [id, router]);

  async function toggleRetired() {
    if (!vehicle) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await apiFetch<Vehicle>(`/api/vehicles/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          retiredAt: vehicle.retiredAt ? null : new Date().toISOString(),
        }),
      });
      setVehicle(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (error && !vehicle) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
        <header className="flex items-baseline justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Vehicle</h1>
          <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>
            Back
          </Link>
        </header>
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      </main>
    );
  }

  if (!vehicle) {
    return null;
  }

  const retired = vehicle.retiredAt !== null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <header className="flex items-baseline justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Vehicle</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {vehicle.nickname}
            {retired && (
              <span className="ml-3 align-middle text-xs font-medium uppercase tracking-wider text-zinc-500">
                Retired
              </span>
            )}
          </h1>
        </div>
        <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>
          Back
        </Link>
      </header>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <Detail label="Year" value={vehicle.year} />
            <Detail label="Make" value={vehicle.make} />
            <Detail label="Model" value={vehicle.model} />
            <Detail label="Trim" value={vehicle.trim} />
            <Detail label="Color" value={vehicle.color} />
            <Detail label="License plate" value={vehicle.licensePlate} mono />
            <Detail label="VIN" value={vehicle.vin} mono />
            <Detail
              label="Purchase odometer"
              value={
                vehicle.purchaseOdometer !== null
                  ? `${vehicle.purchaseOdometer.toLocaleString()} mi`
                  : null
              }
            />
            {retired && vehicle.retiredAt && (
              <Detail label="Retired" value={new Date(vehicle.retiredAt).toLocaleDateString()} />
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Fuel log</CardTitle>
          <Link
            href={`/dashboard/vehicles/${encodeURIComponent(id)}/fuel/new`}
            className={buttonVariants({ variant: 'default', size: 'sm' })}
          >
            Log fill-up
          </Link>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {fuel === null && <p className="text-zinc-500">Loading…</p>}
          {fuel !== null && fuel.length === 0 && (
            <p className="text-zinc-600 dark:text-zinc-400">
              No fuel entries yet. Click <span className="font-medium">Log fill-up</span> to add the
              first one.
            </p>
          )}
          {fuel !== null && fuel.length > 0 && (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {fuel.map((e) => (
                <li key={e.id} className="grid grid-cols-[auto_1fr_auto] items-baseline gap-3 py-2">
                  <span className="font-mono text-xs text-zinc-500">{e.entryDate}</span>
                  <span>
                    {Number(e.gallons).toFixed(2)} gal · {Number(e.odometer).toLocaleString()} mi
                    {!e.tankFilled && <span className="ml-2 text-xs text-zinc-500">(partial)</span>}
                  </span>
                  <span className="text-right tabular-nums">
                    ${Number(e.totalCost).toFixed(2)}{' '}
                    <span className="text-xs text-zinc-500">
                      @ ${Number(e.pricePerGallon).toFixed(3)}/gal
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Link
          href={`/dashboard/vehicles/${encodeURIComponent(id)}/edit`}
          className={buttonVariants({ variant: 'default' })}
        >
          Edit
        </Link>
        <Button variant="outline" onClick={toggleRetired} disabled={busy}>
          {busy ? 'Saving…' : retired ? 'Bring back' : 'Retire'}
        </Button>
      </div>
    </main>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | number | null;
  mono?: boolean;
}) {
  return (
    <>
      <dt className="text-zinc-500">{label}</dt>
      <dd className={value === null || value === '' ? 'text-zinc-400' : mono ? 'font-mono' : ''}>
        {value === null || value === '' ? '—' : value}
      </dd>
    </>
  );
}
