import { cookies } from 'next/headers';

import { verifyAccessToken } from './auth';

/**
 * Cookie names + base options for the Cognito session.
 *
 * Mutations (set / delete) must happen on the outgoing NextResponse, not on
 * the request-side `cookies()` store — on AWS Amplify Hosting's Next.js
 * runtime, mutations applied via `cookies().set()` / `cookies().delete()`
 * fail to merge into an explicitly-constructed `NextResponse`, and the
 * Lambda returns an empty body that CloudFront reports as
 * `x-cache: Error from cloudfront`. Route handlers must build the response
 * first and then call `response.cookies.set/delete(...)`.
 *
 *   sb_access     — Cognito access token (used for the API authorizer)
 *   sb_id         — Cognito ID token (surfaces user email/sub)
 *   sb_refresh    — Cognito refresh token (future silent renewal)
 *   sb_oauth_state     — CSRF guard for the callback
 *   sb_oauth_verifier  — PKCE code verifier
 */

export const COOKIE_NAMES = {
  ACCESS: 'sb_access',
  ID: 'sb_id',
  REFRESH: 'sb_refresh',
  OAUTH_STATE: 'sb_oauth_state',
  OAUTH_VERIFIER: 'sb_oauth_verifier',
} as const;

export function baseCookieOptions() {
  return {
    httpOnly: true,
    // Secure cookies are dropped over HTTP in local dev — only require it in prod.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };
}

/**
 * Read (but do not delete) the short-lived OAuth state + PKCE verifier
 * cookies. Callers delete them on the outgoing response.
 */
export async function readOAuthCookies(): Promise<{
  state: string | null;
  codeVerifier: string | null;
}> {
  const store = await cookies();
  return {
    state: store.get(COOKIE_NAMES.OAUTH_STATE)?.value ?? null,
    codeVerifier: store.get(COOKIE_NAMES.OAUTH_VERIFIER)?.value ?? null,
  };
}

export interface AuthenticatedSession {
  cognitoSub: string;
  username: string;
  email?: string;
  expiresAt: number;
}

/**
 * Returns the authenticated session for the current request, or `null` if the
 * caller is unauthenticated / has an invalid token.
 *
 * Verifies the access-token signature against Cognito JWKS on every call.
 */
export async function getSession(): Promise<AuthenticatedSession | null> {
  const store = await cookies();
  const accessToken = store.get(COOKIE_NAMES.ACCESS)?.value;
  const idToken = store.get(COOKIE_NAMES.ID)?.value;
  if (!accessToken) return null;

  const payload = await verifyAccessToken(accessToken);
  if (!payload) return null;

  let email: string | undefined;
  if (idToken) {
    try {
      const [, base64] = idToken.split('.');
      const decoded = JSON.parse(Buffer.from(base64!, 'base64url').toString('utf8'));
      if (typeof decoded.email === 'string') email = decoded.email;
    } catch {
      // Best-effort — fall through without an email
    }
  }

  return {
    cognitoSub: String(payload.sub),
    username: String(payload.username ?? payload.sub),
    email,
    expiresAt: Number(payload.exp) * 1000,
  };
}
