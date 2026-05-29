import { SignInInputSchema } from '@stablebook/shared';
import { NextResponse, type NextRequest } from 'next/server';

import { initiateAuth } from '@/lib/cognito';
import { COOKIE_NAMES, baseCookieOptions } from '@/lib/session';

import { authErrorFromCognito, badInput } from '../_helpers';

/**
 * Authenticate against Cognito with email + password. Sets sb_access + sb_id
 * cookies on the response. Because this response is the result of a same-
 * origin XHR (from our own /sign-in form), the cookies aren't subject to the
 * cross-origin bounce eviction that killed the previous Hosted UI flow.
 */
export async function POST(request: NextRequest) {
  const parsed = SignInInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badInput(parsed.error);

  let tokens;
  try {
    tokens = await initiateAuth(parsed.data.email, parsed.data.password);
  } catch (err) {
    return authErrorFromCognito(err, 'sign-in');
  }

  const response = NextResponse.json({ ok: true });
  const base = baseCookieOptions();
  response.cookies.set(COOKIE_NAMES.ACCESS, tokens.accessToken, {
    ...base,
    maxAge: tokens.expiresIn,
  });
  response.cookies.set(COOKIE_NAMES.ID, tokens.idToken, {
    ...base,
    maxAge: tokens.expiresIn,
  });
  return response;
}
