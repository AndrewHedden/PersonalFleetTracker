import { CodeChallengeMethod, generateCodeVerifier, generateState } from 'arctic';
import type { NextRequest } from 'next/server';

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

  return Response.redirect(authUrl.toString(), 302);
}
