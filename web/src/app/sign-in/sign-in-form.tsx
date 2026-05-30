'use client';

import { type AuthErrorResponse, SignInInputSchema, type SignInResponse } from '@stablebook/shared';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveTokens } from '@/lib/auth-client';

interface FormState {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

export function SignInForm() {
  const router = useRouter();
  const [state, setState] = useState<FormState>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const raw = {
      email: String(fd.get('email') ?? ''),
      password: String(fd.get('password') ?? ''),
    };
    const parsed = SignInInputSchema.safeParse(raw);
    if (!parsed.success) {
      setState({ fieldErrors: parsed.error.flatten().fieldErrors });
      return;
    }

    setState({});
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/sign-in', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(parsed.data),
        });
        if (res.ok) {
          const tokens = (await res.json()) as SignInResponse;
          saveTokens(tokens);
          router.push('/dashboard');
          return;
        }
        const body = (await res.json().catch(() => null)) as AuthErrorResponse | null;
        if (body?.code === 'user_not_confirmed') {
          router.push(`/confirm?email=${encodeURIComponent(parsed.data.email)}`);
          return;
        }
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

      <Field
        name="email"
        type="email"
        autoComplete="email"
        label="Email"
        required
        placeholder="you@example.com"
        error={state.fieldErrors?.email?.[0]}
      />
      <Field
        name="password"
        type="password"
        autoComplete="current-password"
        label="Password"
        required
        minLength={8}
        error={state.fieldErrors?.password?.[0]}
      />

      <Button type="submit" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}

function Field({
  name,
  label,
  error,
  ...rest
}: {
  name: string;
  label: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} aria-invalid={error ? true : undefined} {...rest} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
