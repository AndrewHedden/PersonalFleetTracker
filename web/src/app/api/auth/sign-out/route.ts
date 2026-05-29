import { NextResponse, type NextRequest } from 'next/server';

import { getAppUrl } from '@/lib/env';
import { COOKIE_NAMES } from '@/lib/session';

/**
 * Sign-out is a same-origin GET — the user clicks a link on /dashboard, hits
 * this route, we clear cookies on the redirect response, browser lands on /.
 * No Cognito-side logout call needed: we don't store the refresh token, the
 * access/id tokens are stateless JWTs that simply become unusable when the
 * browser drops them.
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(getAppUrl(request), { status: 302 });
  for (const name of Object.values(COOKIE_NAMES)) {
    response.cookies.delete(name);
  }
  return response;
}
