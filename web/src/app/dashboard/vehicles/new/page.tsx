import Link from 'next/link';
import { redirect } from 'next/navigation';

import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSession } from '@/lib/session';

import { VehicleForm } from './vehicle-form';

export default async function NewVehiclePage() {
  const session = await getSession();
  if (!session) redirect('/?signin=required');

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
