'use client';

import { type AuthErrorResponse, ConfirmInputSchema } from '@stablebook/shared';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FormState {
  error?: string;
  info?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

export function ConfirmForm({ initialEmail }: { initialEmail: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [state, setState] = useState<FormState>({});
  const [pending, startTransition] = useTransition();
  const [resending, startResend] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const raw = { email: String(fd.get('email') ?? ''), code: String(fd.get('code') ?? '') };
    const parsed = ConfirmInputSchema.safeParse(raw);
    if (!parsed.success) {
      setState({ fieldErrors: parsed.error.flatten().fieldErrors });
      return;
    }

    setState({});
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/confirm', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(parsed.data),
        });
        if (res.ok) {
          router.push('/sign-in');
          return;
        }
        const body = (await res.json().catch(() => null)) as AuthErrorResponse | null;
        setState({ error: body?.message ?? `Request failed (${res.status})` });
      } catch (err) {
        setState({ error: err instanceof Error ? err.message : 'Unknown error' });
      }
    });
  }

  function onResend() {
    if (!email) {
      setState({ error: 'Enter your email first to resend a code.' });
      return;
    }
    setState({});
    startResend(async () => {
      try {
        const res = await fetch('/api/auth/resend-confirmation', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email }),
        });
        if (res.ok) {
          setState({ info: 'New code sent. Check your email.' });
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
      {state.info && (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          {state.info}
        </p>
      )}

      <Field
        name="email"
        type="email"
        autoComplete="email"
        label="Email"
        required
        value={email}
        onChange={(e) => setEmail(e.currentTarget.value)}
        error={state.fieldErrors?.email?.[0]}
      />
      <Field
        name="code"
        inputMode="numeric"
        pattern="\d{6}"
        autoComplete="one-time-code"
        label="Confirmation code"
        required
        placeholder="123456"
        maxLength={6}
        error={state.fieldErrors?.code?.[0]}
      />

      <Button type="submit" disabled={pending}>
        {pending ? 'Confirming…' : 'Confirm email'}
      </Button>

      <button
        type="button"
        onClick={onResend}
        disabled={resending}
        className="text-left text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400 disabled:opacity-50"
      >
        {resending ? 'Sending…' : 'Resend confirmation code'}
      </button>
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
