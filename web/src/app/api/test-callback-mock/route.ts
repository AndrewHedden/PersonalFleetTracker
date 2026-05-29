import { NextResponse, type NextRequest } from 'next/server';

import { getAppUrl } from '@/lib/env';
import { COOKIE_NAMES, baseCookieOptions } from '@/lib/session';

/**
 * Mocks the callback's exact response shape — 2 fake "session" cookies set,
 * 2 oauth-dance cookies deleted, redirect to a same-origin page that won't
 * try to verify the fake JWT. If hitting this leaves sb_access + sb_id in
 * the browser's cookie jar but the real callback doesn't, the difference is
 * in the real callback's code path (token exchange, refresh handling, etc).
 * If neither persists, it's the cookie+redirect pattern itself.
 */
export async function GET(request: NextRequest) {
  const appUrl = getAppUrl(request);
  const response = NextResponse.redirect(`${appUrl}/api/health`, { status: 302 });

  const base = baseCookieOptions();
  response.cookies.set(COOKIE_NAMES.ACCESS, 'fake-access-token-value-for-testing', {
    ...base,
    maxAge: 3600,
  });
  response.cookies.set(COOKIE_NAMES.ID, 'fake-id-token-value-for-testing', {
    ...base,
    maxAge: 3600,
  });
  response.cookies.delete(COOKIE_NAMES.OAUTH_STATE);
  response.cookies.delete(COOKIE_NAMES.OAUTH_VERIFIER);

  return response;
}
