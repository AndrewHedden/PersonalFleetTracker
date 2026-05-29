import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { cookies } from 'next/headers';

import { getCognitoConfig } from './env';

/**
 * Cognito access-token verifier. Caches the JWKS on first use. We verify
 * tokens server-side on every protected page so a forged cookie can't reach
 * a server component that reads user data — API Gateway also verifies, but
 * the Next.js render path needs its own trust decision.
 */
let _verifier: ReturnType<typeof CognitoJwtVerifier.create> | undefined;
function getAccessTokenVerifier() {
  if (!_verifier) {
    const { userPoolId, clientId } = getCognitoConfig();
    _verifier = CognitoJwtVerifier.create({
      userPoolId,
      clientId,
      tokenUse: 'access',
    });
  }
  return _verifier;
}

async function verifyAccessToken(token: string) {
  try {
    return await getAccessTokenVerifier().verify(token);
  } catch {
    return null;
  }
}

/**
 * Cookie names + base options for the Cognito session.
 *
 * Mutations (set / delete) must happen on the outgoing NextResponse, not on
 * the request-side `cookies()` store — on AWS Amplify Hosting's Next.js
 * runtime, mutations applied via `cookies().set()` / `cookies().delete()`
 * fail to merge into an explicitly-constructed `NextResponse`. Route handlers
 * must build the response first and then call `response.cookies.set/delete()`.
 *
 *   sb_access     — Cognito access token (used for the API authorizer)
 *   sb_id         — Cognito ID token (surfaces user email/sub)
 *   sb_refresh    — reserved for future silent token renewal
 */

export const COOKIE_NAMES = {
  ACCESS: 'sb_access',
  ID: 'sb_id',
  REFRESH: 'sb_refresh',
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
