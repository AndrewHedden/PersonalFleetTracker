import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { ForgotPasswordForm } from './forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Stablebook</p>
        <h1 className="text-3xl font-semibold tracking-tight">Reset your password</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Email me a code</CardTitle>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
      </Card>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Remembered it?{' '}
        <Link href="/sign-in" className="font-medium underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
