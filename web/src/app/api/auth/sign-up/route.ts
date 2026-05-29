import { SignUpInputSchema, type SignUpResponse } from '@stablebook/shared';
import { NextResponse, type NextRequest } from 'next/server';

import { signUp } from '@/lib/cognito';

import { authErrorFromCognito, badInput } from '../_helpers';

export async function POST(request: NextRequest) {
  const parsed = SignUpInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badInput(parsed.error);

  try {
    const { userConfirmed } = await signUp(parsed.data.email, parsed.data.password);
    const body: SignUpResponse = {
      email: parsed.data.email,
      requiresConfirmation: !userConfirmed,
    };
    return NextResponse.json(body);
  } catch (err) {
    return authErrorFromCognito(err, 'sign-up');
  }
}
