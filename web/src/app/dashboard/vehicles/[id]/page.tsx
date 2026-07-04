'use client';

import type {
  FuelEntry,
  ListFuelEntriesResponse,
  ListMaintenanceEntriesResponse,
  MaintenanceEntry,
  Vehicle,
} from '@stablebook/shared';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiFetch, readSession } from '@/lib/auth-client';

import { FuelEntryRow } from './fuel-entry-row';
import { FuelQuickAddForm } from './fuel-quick-add';
import { MaintenanceEntryRow } from './maintenance-entry-row';
import { MaintenanceQuickAddForm } from './maintenance-quick-add';
import { computeMpg } from './mpg';

/** How many recent entries to show inline on the vehicle page. */
const RECENT_FUEL_LIMIT = 10;
const RECENT_MAINTENANCE_LIMIT = 10;

export default function VehicleDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [fuel, setFuel] = useState<FuelEntry[] | null>(null);
  const [maintenance, setMaintenance] = useState<MaintenanceEntry[] | null>(null);
  // Which section is shown — defaults to fill-ups (the most frequent task).
  const [tab, setTab] = useState<'fuel' | 'maintenance'>('fuel');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Delete flow (retired vehicles only): two-step confirm — reveal, then
  // type the nickname to enable the final destructive action.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // MPG per fill-up, computed over the *full* fuel list (not just the recent slice).
  const mpgByEntry = useMemo(() => computeMpg(fuel ?? []), [fuel]);

  const loadFuel = useCallback(() => {
    return apiFetch<ListFuelEntriesResponse>(`/api/vehicles/${encodeURIComponent(id)}/fuel`)
      .then((res) => setFuel(res.entries))
      .catch(() => {
        // Don't surface fuel-list failures as the page-level error; vehicle
        // details are still useful even if the fuel log can't load.
        setFuel([]);
      });
  }, [id]);

  const loadMaintenance = useCallback(() => {
    return apiFetch<ListMaintenanceEntriesResponse>(
      `/api/vehicles/${encodeURIComponent(id)}/maintenance`,
    )
      .then((res) => setMaintenance(res.entries))
      .catch(() => {
        // Same as fuel: a maintenance-list failure shouldn't blank the page.
        setMaintenance([]);
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
    void loadMaintenance();
  }, [id, router, loadFuel, loadMaintenance]);

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

  async function deleteVehicle() {
    if (!vehicle) return;
    setDeleting(true);
    setError(null);
    try {
      await apiFetch<{ id: string; deleted: boolean }>(`/api/vehicles/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      // Gone — back to the dashboard, replacing history so Back doesn't 404.
      router.replace('/dashboard');
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message === 'Not signed in' || err.message === 'Session expired')
      ) {
        router.replace('/sign-in');
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
      setDeleting(false);
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

  // Latest odometer reading: the highest value across logged fuel + maintenance
  // entries (odometer is monotonic), falling back to the purchase odometer.
  const odometerReadings = [
    ...(fuel ?? []).map((e) => e.odometer),
    ...(maintenance ?? []).map((m) => m.odometer),
  ];
  const latestOdometer =
    odometerReadings.length > 0 ? Math.max(...odometerReadings) : vehicle.purchaseOdometer;

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
            {latestOdometer !== null && (
              <span className="ml-2">· {latestOdometer.toLocaleString()} mi</span>
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

      {/* Fill-ups / Maintenance tabs — defaults to fill-ups. */}
      <div
        role="tablist"
        aria-label="Vehicle records"
        className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800"
      >
        <TabButton active={tab === 'fuel'} onClick={() => setTab('fuel')}>
          Fill-ups
        </TabButton>
        <TabButton active={tab === 'maintenance'} onClick={() => setTab('maintenance')}>
          Maintenance
        </TabButton>
      </div>

      {tab === 'fuel' && (
        <>
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
              {fuel !== null && fuel.length > RECENT_FUEL_LIMIT && (
                <Link
                  href={`/dashboard/vehicles/${encodeURIComponent(id)}/fuel`}
                  className="inline-block pt-1 text-xs font-medium text-primary hover:underline"
                >
                  View all {fuel.length} fill-ups →
                </Link>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {tab === 'maintenance' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Log maintenance</CardTitle>
            </CardHeader>
            <CardContent>
              <MaintenanceQuickAddForm vehicleId={id} onCreated={() => void loadMaintenance()} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent maintenance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {maintenance === null && <p className="text-zinc-500">Loading…</p>}
              {maintenance !== null && maintenance.length === 0 && (
                <p className="text-zinc-600 dark:text-zinc-400">
                  No maintenance logged yet. Use the form above to record a service.
                </p>
              )}
              {maintenance !== null && maintenance.length > 0 && (
                <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {maintenance.slice(0, RECENT_MAINTENANCE_LIMIT).map((m) => (
                    <MaintenanceEntryRow
                      key={m.id}
                      vehicleId={id}
                      entry={m}
                      onChanged={() => void loadMaintenance()}
                    />
                  ))}
                </ul>
              )}
              {maintenance !== null && maintenance.length > RECENT_MAINTENANCE_LIMIT && (
                <Link
                  href={`/dashboard/vehicles/${encodeURIComponent(id)}/maintenance`}
                  className="inline-block pt-1 text-xs font-medium text-primary hover:underline"
                >
                  View all {maintenance.length} maintenance entries →
                </Link>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Secondary actions. */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href={editHref} className={buttonVariants({ variant: 'outline' })}>
          Edit details
        </Link>
        <Button variant="ghost" onClick={toggleRetired} disabled={busy}>
          {busy ? 'Saving…' : retired ? 'Bring back' : 'Retire'}
        </Button>
      </div>

      {/* Danger zone — only a retired vehicle can be deleted, behind a
          two-step confirmation. */}
      {retired && (
        <Card className="ring-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">Danger zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              Permanently delete this vehicle and <strong>all</strong> of its fuel and maintenance
              history. This cannot be undone.
            </p>
            {!confirmingDelete ? (
              <Button variant="destructive" onClick={() => setConfirmingDelete(true)}>
                Delete vehicle…
              </Button>
            ) : (
              <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <p>
                  Type <span className="font-mono font-medium">{vehicle.nickname}</span> to confirm.
                </p>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={vehicle.nickname}
                  aria-label="Type the vehicle nickname to confirm deletion"
                  autoComplete="off"
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={deleteVehicle}
                    disabled={deleting || confirmText !== vehicle.nickname}
                  >
                    {deleting ? 'Deleting…' : 'Permanently delete'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setConfirmingDelete(false);
                      setConfirmText('');
                    }}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? 'border-primary text-foreground'
          : 'border-transparent text-zinc-500 hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}
