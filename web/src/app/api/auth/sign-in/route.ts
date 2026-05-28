import { CodeChallengeMethod, generateCodeVerifier, generateState } from 'arctic';
import { NextResponse, type NextRequest } from 'next/server';

import { getCognitoUrls, getOAuth2Client } from '@/lib/auth';
import { getAppUrl } from '@/lib/env';
import { setOAuthCookies } from '@/lib/session';

export async function GET(request: NextRequest) {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  await setOAuthCookies(state, codeVerifier);

  const oauth = getOAuth2Client(getAppUrl(request));
  const { authorize } = getCognitoUrls();

  const authUrl = oauth.createAuthorizationURLWithPKCE(
    authorize,
    state,
    CodeChallengeMethod.S256,
    codeVerifier,
    ['openid', 'email', 'profile'],
  );

  // NextResponse.redirect (not Response.redirect) so the PKCE state + verifier
  // cookies set above land on the response. See callback/route.ts for the
  // same fix.
  return NextResponse.redirect(authUrl.toString(), { status: 302 });
}
