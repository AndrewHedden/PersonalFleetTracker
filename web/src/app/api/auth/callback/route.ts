import { OAuth2RequestError } from 'arctic';
import type { NextRequest } from 'next/server';

import { getCognitoUrls, getOAuth2Client } from '@/lib/auth';
import { getAppUrl } from '@/lib/env';
import { setSessionCookies, takeOAuthCookies } from '@/lib/session';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get('code');
  const state = params.get('state');

  const { state: storedState, codeVerifier } = await takeOAuthCookies();

  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    return Response.json(
      { error: 'invalid_state', description: 'Missing or mismatched OAuth state.' },
      { status: 400 },
    );
  }

  const oauth = getOAuth2Client(getAppUrl(request));
  const { token } = getCognitoUrls();

  try {
    const tokens = await oauth.validateAuthorizationCode(token, code, codeVerifier);
    await setSessionCookies({
      accessToken: tokens.accessToken(),
      idToken: tokens.idToken(),
      refreshToken: tokens.hasRefreshToken() ? tokens.refreshToken() : undefined,
      expiresIn: tokens.accessTokenExpiresInSeconds(),
    });
    return Response.redirect(`${getAppUrl(request)}/dashboard`, 302);
  } catch (err) {
    if (err instanceof OAuth2RequestError) {
      return Response.json({ error: err.code, description: err.description }, { status: 400 });
    }
    throw err;
  }
}
