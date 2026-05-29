import { ConfirmInputSchema } from '@stablebook/shared';
import { NextResponse, type NextRequest } from 'next/server';

import { confirmSignUp } from '@/lib/cognito';

import { authErrorFromCognito, badInput } from '../_helpers';

export async function POST(request: NextRequest) {
  const parsed = ConfirmInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badInput(parsed.error);

  try {
    await confirmSignUp(parsed.data.email, parsed.data.code);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorFromCognito(err, 'confirm');
  }
}
