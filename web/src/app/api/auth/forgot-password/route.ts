import { ForgotPasswordInputSchema } from '@stablebook/shared';
import { NextResponse, type NextRequest } from 'next/server';

import { forgotPassword } from '@/lib/cognito';

import { authErrorFromCognito, badInput } from '../_helpers';

/**
 * POST /api/auth/forgot-password — kicks off Cognito's password-reset flow.
 *
 * Always returns 200 on the happy path so the UI can advance the user to
 * /reset-password regardless of whether the email actually exists (Cognito
 * itself doesn't reveal existence when `preventUserExistenceErrors` is
 * enabled, which it is).
 */
export async function POST(request: NextRequest) {
  const parsed = ForgotPasswordInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badInput(parsed.error);

  try {
    await forgotPassword(parsed.data.email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorFromCognito(err, 'forgot-password');
  }
}
