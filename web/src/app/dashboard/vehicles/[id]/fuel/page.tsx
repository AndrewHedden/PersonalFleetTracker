'use client';

import type { FuelEntry, ListFuelEntriesResponse, Vehicle } from '@stablebook/shared';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch, readSession } from '@/lib/auth-client';

import { FuelEntryRow } from '../fuel-entry-row';
import { computeMpg } from '../mpg';

/** Full fuel history for a vehicle (the vehicle page shows only the 10 most recent). */
export default function AllFuelPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [fuel, setFuel] = useState<FuelEntry[] | null>(null);

  const loadFuel = useCallback(() => {
    return apiFetch<ListFuelEntriesResponse>(`/api/vehicles/${encodeURIComponent(id)}/fuel`)
      .then((res) => setFuel(res.entries))
      .catch(() => setFuel([]));
  }, [id]);

  useEffect(() => {
    if (!readSession()) {
      router.replace('/sign-in');
      return;
    }
    apiFetch<Vehicle>(`/api/vehicles/${encodeURIComponent(id)}`)
      .then(setVehicle)
      .catch(() => {});
    void loadFuel();
  }, [id, router, loadFuel]);

  const mpgByEntry = useMemo(() => computeMpg(fuel ?? []), [fuel]);
  const vehicleHref = `/dashboard/vehicles/${encodeURIComponent(id)}`;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            All fill-ups
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{vehicle?.nickname ?? '…'}</h1>
        </div>
        <Link href={vehicleHref} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Back
        </Link>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>
            Fill-ups{fuel !== null && fuel.length > 0 ? ` (${fuel.length})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {fuel === null && <p className="text-zinc-500">Loading…</p>}
          {fuel !== null && fuel.length === 0 && (
            <p className="text-zinc-600 dark:text-zinc-400">No fuel entries yet.</p>
          )}
          {fuel !== null && fuel.length > 0 && (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {fuel.map((e) => (
                <FuelEntryRow
                  key={e.id}
                  vehicleId={id}
                  entry={e}
                  mpg={mpgByEntry.get(e.id)}
                  onChanged={() => void loadFuel()}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
