'use client';

import { type AuthErrorResponse, ForgotPasswordInputSchema } from '@stablebook/shared';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FormState {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

export function ForgotPasswordForm() {
  const router = useRouter();
  const [state, setState] = useState<FormState>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const raw = { email: String(fd.get('email') ?? '') };
    const parsed = ForgotPasswordInputSchema.safeParse(raw);
    if (!parsed.success) {
      setState({ fieldErrors: parsed.error.flatten().fieldErrors });
      return;
    }

    setState({});
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(parsed.data),
        });
        if (res.ok) {
          // Always advance to the reset page regardless of whether the email
          // exists — Cognito doesn't tell us, and we don't want to leak it.
          router.push(`/reset-password?email=${encodeURIComponent(parsed.data.email)}`);
          return;
        }
        const body = (await res.json().catch(() => null)) as AuthErrorResponse | null;
        setState({ error: body?.message ?? `Request failed (${res.status})` });
      } catch (err) {
        setState({ error: err instanceof Error ? err.message : 'Unknown error' });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {state.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.error}
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
          placeholder="you@example.com"
          aria-invalid={state.fieldErrors?.email ? true : undefined}
        />
        {state.fieldErrors?.email && (
          <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>
        )}
        <p className="text-xs text-zinc-500">
          If an account exists, you&apos;ll get a 6-digit reset code by email.
        </p>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Sending…' : 'Send reset code'}
      </Button>
    </form>
  );
}
