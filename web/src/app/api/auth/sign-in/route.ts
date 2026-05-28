import { CodeChallengeMethod, generateCodeVerifier, generateState } from 'arctic';
import { NextResponse, type NextRequest } from 'next/server';

import { getCognitoUrls, getOAuth2Client } from '@/lib/auth';
import { getAppUrl } from '@/lib/env';
import { COOKIE_NAMES, baseCookieOptions } from '@/lib/session';

export async function GET(request: NextRequest) {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const oauth = getOAuth2Client(getAppUrl(request));
  const { authorize } = getCognitoUrls();

  const authUrl = oauth.createAuthorizationURLWithPKCE(
    authorize,
    state,
    CodeChallengeMethod.S256,
    codeVerifier,
    ['openid', 'email', 'profile'],
  );

  // Build the response first, then attach cookies to it. On Amplify Hosting
  // the `cookies().set()` pattern doesn't merge into an explicitly-constructed
  // NextResponse — see session.ts for details.
  const response = NextResponse.redirect(authUrl.toString(), { status: 302 });
  const base = baseCookieOptions();
  const oauthMaxAge = 60 * 10; // 10 min — covers the user authenticating on Hosted UI
  response.cookies.set(COOKIE_NAMES.OAUTH_STATE, state, { ...base, maxAge: oauthMaxAge });
  response.cookies.set(COOKIE_NAMES.OAUTH_VERIFIER, codeVerifier, {
    ...base,
    maxAge: oauthMaxAge,
  });
  return response;
}
