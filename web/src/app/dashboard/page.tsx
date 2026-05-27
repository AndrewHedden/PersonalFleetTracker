import Link from 'next/link';
import { redirect } from 'next/navigation';

import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSession } from '@/lib/session';

export default async function DashboardPage() {
  // Edge middleware did a fast-pass redirect for missing cookies. This is the
  // real authorization check: a forged cookie wouldn't pass JWT verification.
  const session = await getSession();
  if (!session) {
    redirect('/?signin=required');
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

      <Card>
        <CardHeader>
          <CardTitle>Coming next (Phase 3c)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
          Vehicles CRUD. Each vehicle row will be scoped to your{' '}
          <span className="font-mono text-xs">cognito_sub</span>, fetched via the authenticated{' '}
          <span className="font-mono text-xs">/v1/vehicles</span> API.
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
