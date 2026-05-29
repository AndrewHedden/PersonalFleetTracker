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
/**
 * JWT-shaped fake value: 3 base64url chunks separated by dots, ~900 chars
 * total, comparable to a real Cognito ID token. Used to test whether the
 * cookie persistence failure is driven by value size rather than the
 * navigation context.
 */
const FAKE_JWT_LIKE_VALUE =
  'eyJraWQiOiI5d1FzUWZYX2NRaEZJUE9FcURBamRTV2ZmN3VnTl9wU2lvcU9ib3BXMHM4PSIsImFsZyI6IlJTMjU2In0' +
  '.' +
  'eyJzdWIiOiJhYWFhYWFhYS1iYmJiLWNjY2MtZGRkZC1lZWVlZWVlZWVlZWUiLCJjb2duaXRvOmdyb3VwcyI6WyJ1c2Vy' +
  'cyJdLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV9' +
  'YWVpaeXl5IiwiY2xpZW50X2lkIjoiMTIzNDU2Nzg5MGFiY2RlZmdoaWprbG1ub3AiLCJvcmlnaW5fanRpIjoiYWFhYS' +
  'aiVHpHaXNZeFNXalNoTW9SeWRtSnh5SUVlIiwiZXZlbnRfaWQiOiJiYmJiYmJiYi1iYmJiLWJiYmItYmJiYi1iYmJiY' +
  'mJiYmJiYmIiLCJ0b2tlbl91c2UiOiJhY2Nlc3MiLCJzY29wZSI6Im9wZW5pZCBlbWFpbCBwcm9maWxlIiwiYXV0aF90' +
  'aW1lIjoxNzMxMjM0NTY3LCJleHAiOjE3MzEyMzgxNjcsImlhdCI6MTczMTIzNDU2NywianRpIjoiY2NjY2NjY2MtY2N' +
  'jYy1jY2NjLWNjY2MtY2NjY2NjY2NjY2NjIiwidXNlcm5hbWUiOiJ0ZXN0dXNlckBleGFtcGxlLmNvbSJ9' +
  '.' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB' +
  'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC' +
  'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD';

export async function GET(request: NextRequest) {
  const appUrl = getAppUrl(request);
  const response = NextResponse.redirect(`${appUrl}/api/health`, { status: 302 });

  const base = baseCookieOptions();
  response.cookies.set(COOKIE_NAMES.ACCESS, FAKE_JWT_LIKE_VALUE, {
    ...base,
    maxAge: 3600,
  });
  response.cookies.set(COOKIE_NAMES.ID, FAKE_JWT_LIKE_VALUE, {
    ...base,
    maxAge: 3600,
  });
  response.cookies.delete(COOKIE_NAMES.OAUTH_STATE);
  response.cookies.delete(COOKIE_NAMES.OAUTH_VERIFIER);

  return response;
}
