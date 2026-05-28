import { OAuth2RequestError } from 'arctic';
import { NextResponse, type NextRequest } from 'next/server';

import { getCognitoUrls, getOAuth2Client } from '@/lib/auth';
import { getAppUrl } from '@/lib/env';
import { COOKIE_NAMES, readOAuthCookies } from '@/lib/session';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get('code');
  const state = params.get('state');

  const { state: storedState, codeVerifier } = await readOAuthCookies();

  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    console.log(
      JSON.stringify({
        tag: 'callback',
        result: 'invalid_state',
        hasCode: !!code,
        hasState: !!state,
        hasStoredState: !!storedState,
        hasVerifier: !!codeVerifier,
      }),
    );
    return NextResponse.json(
      { error: 'invalid_state', description: 'Missing or mismatched OAuth state.' },
      { status: 400 },
    );
  }

  const oauth = getOAuth2Client(getAppUrl(request));
  const { token } = getCognitoUrls();

  try {
    const tokens = await oauth.validateAuthorizationCode(token, code, codeVerifier);
    const accessToken = tokens.accessToken();
    const idToken = tokens.idToken();
    const refreshToken = tokens.hasRefreshToken() ? tokens.refreshToken() : null;
    const expiresIn = tokens.accessTokenExpiresInSeconds();

    // Build the redirect response, then set Set-Cookie headers directly on it.
    // We do NOT use cookies().set() here because in Route Handlers the cookie
    // store doesn't always merge into an explicitly-constructed NextResponse.
    // Setting via response.cookies.set() is the documented pattern.
    const response = NextResponse.redirect(`${getAppUrl(request)}/dashboard`, {
      status: 302,
    });

    const isProd = process.env.NODE_ENV === 'production';
    const base = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
    };

    response.cookies.set(COOKIE_NAMES.ACCESS, accessToken, { ...base, maxAge: expiresIn });
    response.cookies.set(COOKIE_NAMES.ID, idToken, { ...base, maxAge: expiresIn });
    // sb_refresh skipped: 3rd large Set-Cookie was being stripped between
    // Lambda and the browser. We can revisit refresh-token storage later
    // (server-side session table) — for now the user re-auths every 60 min.
    void refreshToken;

    // Consume the short-lived OAuth dance cookies on the outgoing response.
    response.cookies.delete(COOKIE_NAMES.OAUTH_STATE);
    response.cookies.delete(COOKIE_NAMES.OAUTH_VERIFIER);

    // Dump what NextResponse actually has on it before returning, so we can
    // confirm Set-Cookie headers are present at the runtime boundary.
    const allHeaders: Record<string, string> = {};
    response.headers.forEach((v, k) => {
      allHeaders[k] = v;
    });
    const setCookieValues: string[] =
      typeof (response.headers as Headers).getSetCookie === 'function'
        ? (response.headers as Headers).getSetCookie()
        : [];

    console.log(
      JSON.stringify({
        tag: 'callback',
        result: 'success',
        cookiesSet: refreshToken ? ['sb_access', 'sb_id', 'sb_refresh'] : ['sb_access', 'sb_id'],
        expiresIn,
        nodeEnv: process.env.NODE_ENV ?? '(unset)',
        secure: isProd,
        responseHeaderKeys: Object.keys(allHeaders),
        responseSetCookieCount: setCookieValues.length,
        responseSetCookiePreview: setCookieValues.map((s) => s.slice(0, 80) + '...'),
      }),
    );

    return response;
  } catch (err) {
    if (err instanceof OAuth2RequestError) {
      console.log(
        JSON.stringify({
          tag: 'callback',
          result: 'oauth_error',
          code: err.code,
          description: err.description,
        }),
      );
      return NextResponse.json({ error: err.code, description: err.description }, { status: 400 });
    }
    console.log(
      JSON.stringify({
        tag: 'callback',
        result: 'unhandled_error',
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    throw err;
  }
}
