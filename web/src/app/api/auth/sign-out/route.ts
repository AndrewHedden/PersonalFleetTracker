import { NextResponse, type NextRequest } from 'next/server';

import { getCognitoUrls } from '@/lib/auth';
import { getAppUrl, getCognitoConfig } from '@/lib/env';
import { clearSessionCookies } from '@/lib/session';

export async function GET(request: NextRequest) {
  await clearSessionCookies();

  const { clientId } = getCognitoConfig();
  const { logout } = getCognitoUrls();
  const appUrl = getAppUrl(request);

  const logoutUrl = new URL(logout);
  logoutUrl.searchParams.set('client_id', clientId);
  logoutUrl.searchParams.set('logout_uri', appUrl);

  // NextResponse.redirect so the cookie-clearing Set-Cookie headers attach.
  return NextResponse.redirect(logoutUrl.toString(), { status: 302 });
}
