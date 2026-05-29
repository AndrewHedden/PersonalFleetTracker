import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSession } from '@/lib/session';

import { authErrorMessage } from '../_auth-messages';

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string; resent?: string }>;
}) {
  const session = await getSession();
  if (session) redirect('/dashboard');

  const params = await searchParams;
  const errorMsg = params.error ? authErrorMessage(params.error) : undefined;
  const resentMsg = params.resent === '1' ? 'New code sent. Check your email.' : undefined;
  const email = params.email ?? '';

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Stablebook</p>
        <h1 className="text-3xl font-semibold tracking-tight">Confirm your email</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Enter the 6-digit code</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {resentMsg && (
            <p className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
              {resentMsg}
            </p>
          )}
          {errorMsg && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {errorMsg}
            </p>
          )}

          <form method="POST" action="/api/auth/confirm" className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                defaultValue={email}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="code">Confirmation code</Label>
              <Input
                id="code"
                name="code"
                inputMode="numeric"
                pattern="\d{6}"
                autoComplete="one-time-code"
                required
                maxLength={6}
                placeholder="123456"
              />
            </div>

            <Button type="submit">Confirm email</Button>
          </form>

          <form
            method="POST"
            action="/api/auth/resend-confirmation"
            className="flex flex-col gap-1.5 border-t border-zinc-200 pt-5 dark:border-zinc-800"
          >
            <input type="hidden" name="email" value={email} />
            <button
              type="submit"
              className="text-left text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
            >
              Resend confirmation code
            </button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
