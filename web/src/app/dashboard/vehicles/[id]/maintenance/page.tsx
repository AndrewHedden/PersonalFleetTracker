'use client';

import type { ListMaintenanceEntriesResponse, MaintenanceEntry, Vehicle } from '@stablebook/shared';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch, readSession } from '@/lib/auth-client';

import { MaintenanceEntryRow } from '../maintenance-entry-row';

/** Full maintenance history (the vehicle page shows only the 10 most recent). */
export default function AllMaintenancePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [maintenance, setMaintenance] = useState<MaintenanceEntry[] | null>(null);

  const loadMaintenance = useCallback(() => {
    return apiFetch<ListMaintenanceEntriesResponse>(
      `/api/vehicles/${encodeURIComponent(id)}/maintenance`,
    )
      .then((res) => setMaintenance(res.entries))
      .catch(() => setMaintenance([]));
  }, [id]);

  useEffect(() => {
    if (!readSession()) {
      router.replace('/sign-in');
      return;
    }
    apiFetch<Vehicle>(`/api/vehicles/${encodeURIComponent(id)}`)
      .then(setVehicle)
      .catch(() => {});
    void loadMaintenance();
  }, [id, router, loadMaintenance]);

  const vehicleHref = `/dashboard/vehicles/${encodeURIComponent(id)}`;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            All maintenance
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
            Maintenance
            {maintenance !== null && maintenance.length > 0 ? ` (${maintenance.length})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {maintenance === null && <p className="text-zinc-500">Loading…</p>}
          {maintenance !== null && maintenance.length === 0 && (
            <p className="text-zinc-600 dark:text-zinc-400">No maintenance logged yet.</p>
          )}
          {maintenance !== null && maintenance.length > 0 && (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {maintenance.map((m) => (
                <MaintenanceEntryRow
                  key={m.id}
                  vehicleId={id}
                  entry={m}
                  onChanged={() => void loadMaintenance()}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
