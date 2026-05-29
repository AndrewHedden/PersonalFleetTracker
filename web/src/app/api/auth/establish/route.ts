import { NextResponse, type NextRequest } from 'next/server';

import { getAppUrl } from '@/lib/env';
import { decodeHandoff } from '@/lib/handoff';
import { COOKIE_NAMES, baseCookieOptions } from '@/lib/session';

/**
 * GET endpoint that completes the sign-in flow by setting session cookies
 * from an encrypted handoff token. Triggered as the redirect target of
 * /api/auth/sign-in; the GET → 302 chain ending here is what makes browsers
 * actually persist the cookies.
 */
export async function GET(request: NextRequest) {
  const appUrl = getAppUrl(request);
  const token = request.nextUrl.searchParams.get('h');

  if (!token) {
    return failureRedirect(appUrl);
  }

  const payload = decodeHandoff(token);
  if (!payload) {
    return failureRedirect(appUrl);
  }

  const response = NextResponse.redirect(`${appUrl}/dashboard`, { status: 302 });
  const base = baseCookieOptions();
  response.cookies.set(COOKIE_NAMES.ACCESS, payload.accessToken, {
    ...base,
    maxAge: payload.expiresIn,
  });
  response.cookies.set(COOKIE_NAMES.ID, payload.idToken, {
    ...base,
    maxAge: payload.expiresIn,
  });
  return response;
}

function failureRedirect(appUrl: string): NextResponse {
  const url = new URL(`${appUrl}/sign-in`);
  url.searchParams.set('error', 'handoff_invalid');
  return NextResponse.redirect(url.toString(), { status: 302 });
}
