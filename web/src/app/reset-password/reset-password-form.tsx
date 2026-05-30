'use client';

import { type AuthErrorResponse, ResetPasswordInputSchema } from '@stablebook/shared';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FormState {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

export function ResetPasswordForm({ initialEmail }: { initialEmail: string }) {
  const router = useRouter();
  const [state, setState] = useState<FormState>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const raw = {
      email: String(fd.get('email') ?? ''),
      code: String(fd.get('code') ?? ''),
      newPassword: String(fd.get('newPassword') ?? ''),
    };
    const parsed = ResetPasswordInputSchema.safeParse(raw);
    if (!parsed.success) {
      setState({ fieldErrors: parsed.error.flatten().fieldErrors });
      return;
    }

    setState({});
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(parsed.data),
        });
        if (res.ok) {
          router.push(`/sign-in?email=${encodeURIComponent(parsed.data.email)}`);
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

      <Field
        name="email"
        type="email"
        autoComplete="email"
        label="Email"
        required
        defaultValue={initialEmail}
        error={state.fieldErrors?.email?.[0]}
      />
      <Field
        name="code"
        inputMode="numeric"
        pattern="\d{6}"
        autoComplete="one-time-code"
        label="Reset code"
        required
        maxLength={6}
        placeholder="123456"
        error={state.fieldErrors?.code?.[0]}
      />
      <Field
        name="newPassword"
        type="password"
        autoComplete="new-password"
        label="New password"
        required
        minLength={8}
        helperText="Min 8 characters, with upper, lower, digit, and symbol."
        error={state.fieldErrors?.newPassword?.[0]}
      />

      <Button type="submit" disabled={pending}>
        {pending ? 'Resetting…' : 'Reset password'}
      </Button>
    </form>
  );
}

function Field({
  name,
  label,
  error,
  helperText,
  ...rest
}: {
  name: string;
  label: string;
  error?: string;
  helperText?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} aria-invalid={error ? true : undefined} {...rest} />
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-zinc-500">{helperText}</p>
      ) : null}
    </div>
  );
}
