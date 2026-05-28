import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { VehicleForm } from './vehicle-form';

// Lightweight cookie-presence check (the edge proxy was removed because of
// RSC-navigation cookie quirks; we now rely on the page itself, the form's
// `/api/vehicles` route handler, and API Gateway's JWT authorizer as
// successive auth layers). We deliberately don't verify the JWT here — a
// forged cookie still can't actually create a vehicle because API Gateway
// validates the bearer against Cognito.
export default async function NewVehiclePage() {
  const store = await cookies();
  if (!store.get('sb_access')) {
    redirect('/?signin=required');
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <header className="flex items-baseline justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            New vehicle
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Add a vehicle</h1>
        </div>
        <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>
          Cancel
        </Link>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Vehicle details</CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleForm />
        </CardContent>
      </Card>
    </main>
  );
}
