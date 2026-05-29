import { SignInInputSchema } from '@stablebook/shared';
import { NextResponse, type NextRequest } from 'next/server';

import { initiateAuth } from '@/lib/cognito';
import { getAppUrl } from '@/lib/env';
import { COOKIE_NAMES, baseCookieOptions } from '@/lib/session';

import { extractCognitoErrorCode, parseFormBody } from '../_helpers';

/**
 * Sign in via a standard same-origin form POST. Returns a 302 redirect to
 * /dashboard with sb_access + sb_id Set-Cookie headers — this pattern was
 * empirically verified to persist cookies in Safari and Chrome, where
 * XHR-set cookies were silently evicted even on same-origin same-site
 * requests (see callback debug history in MEMORY.md / git log).
 *
 * Errors redirect back to /sign-in with ?error=<code>, plus &email=<…> so
 * the form is pre-filled. Special case: user_not_confirmed redirects to
 * /confirm with the email pre-filled.
 */
export async function POST(request: NextRequest) {
  const appUrl = getAppUrl(request);
  const body = await parseFormBody(request);

  const parsed = SignInInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorRedirect(appUrl, '/sign-in', 'invalid_input', body.email);
  }

  let tokens;
  try {
    tokens = await initiateAuth(parsed.data.email, parsed.data.password);
  } catch (err) {
    const code = extractCognitoErrorCode(err, 'sign-in');
    if (code === 'user_not_confirmed') {
      return errorRedirect(appUrl, '/confirm', null, parsed.data.email);
    }
    return errorRedirect(appUrl, '/sign-in', code, parsed.data.email);
  }

  const response = NextResponse.redirect(`${appUrl}/dashboard`, { status: 302 });
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

function errorRedirect(
  appUrl: string,
  path: string,
  errorCode: string | null,
  email: string | null | undefined,
): NextResponse {
  const url = new URL(`${appUrl}${path}`);
  if (errorCode) url.searchParams.set('error', errorCode);
  if (email) url.searchParams.set('email', email);
  return NextResponse.redirect(url.toString(), { status: 302 });
}
