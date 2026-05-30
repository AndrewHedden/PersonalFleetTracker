'use client';

import type { Vehicle } from '@stablebook/shared';
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
