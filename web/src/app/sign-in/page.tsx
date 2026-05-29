import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSession } from '@/lib/session';

import { authErrorMessage } from '../_auth-messages';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string; confirmed?: string }>;
}) {
  const session = await getSession();
  if (session) redirect('/dashboard');

  const params = await searchParams;
  const errorMsg = params.error ? authErrorMessage(params.error) : undefined;
  const confirmedMsg = params.confirmed === '1' ? 'Email confirmed. You can now sign in.' : undefined;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Stablebook</p>
        <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="POST" action="/api/auth/sign-in" className="flex flex-col gap-5">
            {confirmedMsg && (
              <p className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
                {confirmedMsg}
              </p>
            )}
            {errorMsg && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {errorMsg}
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                defaultValue={params.email ?? ''}
                placeholder="you@example.com"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
              />
            </div>

            <Button type="submit">Sign in</Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        New here?{' '}
        <Link href="/sign-up" className="font-medium underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
