import { ResetPasswordInputSchema } from '@stablebook/shared';
import { NextResponse, type NextRequest } from 'next/server';

import { confirmForgotPassword } from '@/lib/cognito';

import { authErrorFromCognito, badInput } from '../_helpers';

/**
 * POST /api/auth/reset-password — completes the password-reset flow by
 * exchanging the emailed code + a new password for an updated credential.
 */
export async function POST(request: NextRequest) {
  const parsed = ResetPasswordInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badInput(parsed.error);

  try {
    await confirmForgotPassword(parsed.data.email, parsed.data.code, parsed.data.newPassword);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorFromCognito(err, 'reset-password');
  }
}
