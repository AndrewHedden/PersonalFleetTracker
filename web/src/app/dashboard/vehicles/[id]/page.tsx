'use client';

import type { FuelEntry, ListFuelEntriesResponse, Vehicle } from '@stablebook/shared';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch, readSession } from '@/lib/auth-client';

import { FuelQuickAddForm } from './fuel-quick-add';

/** How many recent fill-ups to show inline on the vehicle page. */
const RECENT_FUEL_LIMIT = 10;

export default function VehicleDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [fuel, setFuel] = useState<FuelEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadFuel = useCallback(() => {
    return apiFetch<ListFuelEntriesResponse>(`/api/vehicles/${encodeURIComponent(id)}/fuel`)
      .then((res) => setFuel(res.entries))
      .catch(() => {
        // Don't surface fuel-list failures as the page-level error; vehicle
        // details are still useful even if the fuel log can't load.
        setFuel([]);
      });
  }, [id]);

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
    void loadFuel();
  }, [id, router, loadFuel]);

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
  const subtitle = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ');
  const editHref = `/dashboard/vehicles/${encodeURIComponent(id)}/edit`;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      {/* Compact identity header — full specs live on the edit page. */}
      <header className="flex items-start justify-between gap-4">
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
          <p className="mt-1 text-sm text-zinc-500">
            {subtitle || 'No details yet'}
            {vehicle.licensePlate && (
              <span className="ml-2 font-mono text-xs">{vehicle.licensePlate}</span>
            )}
          </p>
        </div>
        <Link href="/dashboard" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Back
        </Link>
      </header>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Primary task: log a fill-up inline, no navigation. */}
      <Card>
        <CardHeader>
          <CardTitle>Log a fill-up</CardTitle>
        </CardHeader>
        <CardContent>
          <FuelQuickAddForm vehicleId={id} onCreated={() => void loadFuel()} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent fill-ups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {fuel === null && <p className="text-zinc-500">Loading…</p>}
          {fuel !== null && fuel.length === 0 && (
            <p className="text-zinc-600 dark:text-zinc-400">
              No fuel entries yet. Use the form above to log your first fill-up.
            </p>
          )}
          {fuel !== null && fuel.length > 0 && (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {fuel.slice(0, RECENT_FUEL_LIMIT).map((e) => (
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
          {fuel !== null && fuel.length > RECENT_FUEL_LIMIT && (
            <p className="pt-1 text-xs text-zinc-500">
              Showing the {RECENT_FUEL_LIMIT} most recent of {fuel.length} entries.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Secondary actions. */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" disabled title="Maintenance logging is coming soon">
          Add maintenance
        </Button>
        <Link href={editHref} className={buttonVariants({ variant: 'outline' })}>
          Edit details
        </Link>
        <Button variant="ghost" onClick={toggleRetired} disabled={busy}>
          {busy ? 'Saving…' : retired ? 'Bring back' : 'Retire'}
        </Button>
      </div>
    </main>
  );
}
