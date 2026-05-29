import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSession } from '@/lib/session';

import { authErrorMessage } from '../_auth-messages';

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string }>;
}) {
  const session = await getSession();
  if (session) redirect('/dashboard');

  const params = await searchParams;
  const errorMsg = params.error ? authErrorMessage(params.error) : undefined;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Stablebook</p>
        <h1 className="text-3xl font-semibold tracking-tight">Create an account</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Get started</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="POST" action="/api/auth/sign-up" className="flex flex-col gap-5">
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
                autoComplete="new-password"
                required
                minLength={8}
              />
              <p className="text-xs text-zinc-500">
                Min 8 characters, with upper, lower, digit, and symbol.
              </p>
            </div>

            <Button type="submit">Create account</Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{' '}
        <Link href="/sign-in" className="font-medium underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
