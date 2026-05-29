import { ResendConfirmationInputSchema } from '@stablebook/shared';
import { NextResponse, type NextRequest } from 'next/server';

import { resendConfirmationCode } from '@/lib/cognito';

import { authErrorFromCognito, badInput } from '../_helpers';

export async function POST(request: NextRequest) {
  const parsed = ResendConfirmationInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badInput(parsed.error);

  try {
    await resendConfirmationCode(parsed.data.email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorFromCognito(err, 'resend');
  }
}
