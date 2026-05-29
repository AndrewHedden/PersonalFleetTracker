'use client';

import type { ListVehiclesResponse } from '@stablebook/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch, clearTokens, readSession, type StoredSession } from '@/lib/auth-client';

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [vehicles, setVehicles] = useState<ListVehiclesResponse['vehicles'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = readSession();
    if (!s) {
      router.replace('/sign-in');
      return;
    }
    setSession(s);
    apiFetch<ListVehiclesResponse>('/api/vehicles')
      .then((res) => setVehicles(res.vehicles))
      .catch((err: unknown) => {
        if (err instanceof Error && err.message === 'Session expired') {
          router.replace('/sign-in');
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
      });
  }, [router]);

  function onSignOut() {
    clearTokens();
    router.replace('/');
  }

  if (!session) {
    return null; // brief flash before redirect runs
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Dashboard</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome{session.email ? `, ${session.email}` : ''}
        </h1>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Your vehicles</CardTitle>
          <Link
            href="/dashboard/vehicles/new"
            className={buttonVariants({ variant: 'default', size: 'sm' })}
          >
            Add a vehicle
          </Link>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {vehicles === null && !error && (
            <p className="text-zinc-500">Loading…</p>
          )}
          {vehicles !== null && vehicles.length === 0 && (
            <p className="text-zinc-600 dark:text-zinc-400">
              No vehicles yet. Click <span className="font-medium">Add a vehicle</span> to get
              started.
            </p>
          )}
          {vehicles !== null && vehicles.length > 0 && (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {vehicles.map((v) => (
                <li key={v.id} className="flex items-baseline justify-between py-2">
                  <div>
                    <div className="font-medium">{v.nickname}</div>
                    <div className="text-xs text-zinc-500">
                      {[v.year, v.make, v.model].filter(Boolean).join(' ')}
                    </div>
                  </div>
                  {v.licensePlate && (
                    <span className="font-mono text-xs text-zinc-500">{v.licensePlate}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          {session.email && (
            <p>
              <span className="font-mono text-xs">email:</span>{' '}
              <span className="font-mono text-xs">{session.email}</span>
            </p>
          )}
          <p>
            <span className="font-mono text-xs">access_token expires:</span>{' '}
            <span className="font-mono text-xs">
              {new Date(session.expiresAt * 1000).toISOString()}
            </span>
          </p>
        </CardContent>
      </Card>

      <div>
        <Button variant="outline" onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </main>
  );
}
