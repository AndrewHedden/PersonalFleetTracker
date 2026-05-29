import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSession } from '@/lib/session';

import { SignInForm } from './sign-in-form';

export default async function SignInPage() {
  const session = await getSession();
  if (session) redirect('/dashboard');

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
          <SignInForm />
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
