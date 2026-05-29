import { redirect } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSession } from '@/lib/session';

import { ConfirmForm } from './confirm-form';

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const session = await getSession();
  if (session) redirect('/dashboard');

  const { email } = await searchParams;

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
        <CardContent>
          <ConfirmForm initialEmail={email ?? ''} />
        </CardContent>
      </Card>
    </main>
  );
}
