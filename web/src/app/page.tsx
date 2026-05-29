'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { clearTokens, readSession, type StoredSession } from '@/lib/auth-client';

export default function HomePage() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSession(readSession());
    setHydrated(true);
  }, []);

  function onSignOut() {
    clearTokens();
    setSession(null);
    router.refresh();
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-6 py-16">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Personal · Portfolio
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Stablebook</h1>
        <p className="text-lg leading-7 text-zinc-600 dark:text-zinc-400">
          Multi-vehicle fuel and maintenance tracker. Log fill-ups, track service, and get reminders
          when routine maintenance is due. Web app today, SwiftUI iOS companion next.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>
            {hydrated && session
              ? `Signed in as ${session.email ?? 'you'}`
              : 'Get started'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {hydrated && session ? (
            <div className="flex gap-2">
              <Link href="/dashboard" className={buttonVariants({ variant: 'default' })}>
                Open dashboard
              </Link>
              <Button variant="outline" onClick={onSignOut}>
                Sign out
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link href="/sign-in" className={buttonVariants({ variant: 'default' })}>
                Sign in
              </Link>
              <Link href="/sign-up" className={buttonVariants({ variant: 'outline' })}>
                Create an account
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <footer className="text-sm text-zinc-500">
        <a
          href="https://github.com/AndrewHedden/Stablebook"
          className="underline-offset-4 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          github.com/AndrewHedden/Stablebook →
        </a>
      </footer>
    </main>
  );
}
