import { NextResponse, type NextRequest } from 'next/server';

import { getCognitoUrls } from '@/lib/auth';
import { getAppUrl, getCognitoConfig } from '@/lib/env';
import { COOKIE_NAMES } from '@/lib/session';

export async function GET(request: NextRequest) {
  const { clientId } = getCognitoConfig();
  const { logout } = getCognitoUrls();
  const appUrl = getAppUrl(request);

  const logoutUrl = new URL(logout);
  logoutUrl.searchParams.set('client_id', clientId);
  logoutUrl.searchParams.set('logout_uri', appUrl);

  // Build the response first, then clear cookies on it. See session.ts for
  // why mutations must happen on the response object, not via `cookies()`.
  const response = NextResponse.redirect(logoutUrl.toString(), { status: 302 });
  for (const name of Object.values(COOKIE_NAMES)) {
    response.cookies.delete(name);
  }
  return response;
}
