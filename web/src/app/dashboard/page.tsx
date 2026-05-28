import type { ListVehiclesResponse } from '@stablebook/shared';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';
import { getSession } from '@/lib/session';

export default async function DashboardPage() {
  // Edge proxy did a fast-pass redirect for missing cookies. This is the real
  // authorization check: a forged cookie wouldn't pass JWT verification.
  const session = await getSession();
  if (!session) {
    redirect('/?signin=required');
  }

  const { vehicles } = await apiFetch<ListVehiclesResponse>('/v1/vehicles');

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Dashboard</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome{session.email ? `, ${session.email}` : ''}
        </h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Your vehicles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {vehicles.length === 0 ? (
            <p className="text-zinc-600 dark:text-zinc-400">
              No vehicles yet. The create form lands in Phase 3c.2.
            </p>
          ) : (
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
          <p>
            <span className="font-mono text-xs">cognito_sub:</span>{' '}
            <span className="font-mono text-xs">{session.cognitoSub}</span>
          </p>
          {session.email && (
            <p>
              <span className="font-mono text-xs">email:</span>{' '}
              <span className="font-mono text-xs">{session.email}</span>
            </p>
          )}
          <p>
            <span className="font-mono text-xs">access_token expires:</span>{' '}
            <span className="font-mono text-xs">{new Date(session.expiresAt).toISOString()}</span>
          </p>
        </CardContent>
      </Card>

      <div>
        <Link href="/api/auth/sign-out" className={buttonVariants({ variant: 'outline' })}>
          Sign out
        </Link>
      </div>
    </main>
  );
}
