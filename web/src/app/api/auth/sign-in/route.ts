import { SignInInputSchema } from '@stablebook/shared';
import { NextResponse, type NextRequest } from 'next/server';

import { initiateAuth } from '@/lib/cognito';
import { getAppUrl } from '@/lib/env';
import { encodeHandoff } from '@/lib/handoff';

import { extractCognitoErrorCode, parseFormBody } from '../_helpers';

/**
 * Sign-in form POST. Authenticates via Cognito, then redirects to the
 * /api/auth/establish handoff endpoint with the tokens encrypted into the
 * URL. The actual cookie-setting happens on establish's response (a GET →
 * 302 chain) because browsers silently evict cookies set on responses to
 * form POSTs — see /web/src/lib/handoff.ts for the long-form story.
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

  const handoff = encodeHandoff({
    accessToken: tokens.accessToken,
    idToken: tokens.idToken,
    expiresIn: tokens.expiresIn,
    issuedAt: Math.floor(Date.now() / 1000),
  });

  const establishUrl = new URL(`${appUrl}/api/auth/establish`);
  establishUrl.searchParams.set('h', handoff);
  // 303 explicitly tells the client to do a GET on the new location after
  // the POST — required so /api/auth/establish receives a GET request.
  return NextResponse.redirect(establishUrl.toString(), { status: 303 });
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
