import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { ResetPasswordForm } from './reset-password-form';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Stablebook</p>
        <h1 className="text-3xl font-semibold tracking-tight">Set a new password</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Enter the code and choose a new password</CardTitle>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm initialEmail={email ?? ''} />
        </CardContent>
      </Card>
    </main>
  );
}
