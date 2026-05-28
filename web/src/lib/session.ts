import { cookies } from 'next/headers';

import { verifyAccessToken } from './auth';

/**
 * HTTP-only cookie helpers for the Cognito session.
 *
 * We store three cookies, all HttpOnly + Secure + SameSite=Lax:
 *   - `sb_access`     — Cognito access token (used for the API authorizer)
 *   - `sb_id`         — Cognito ID token (used to surface user email/sub)
 *   - `sb_refresh`    — Cognito refresh token (for future silent renewals)
 *
 * Short-lived helper cookies for the OAuth dance live alongside:
 *   - `sb_oauth_state`     — CSRF guard for the callback
 *   - `sb_oauth_verifier`  — PKCE code verifier
 */

const ACCESS = 'sb_access';
const ID = 'sb_id';
const REFRESH = 'sb_refresh';
const OAUTH_STATE = 'sb_oauth_state';
const OAUTH_VERIFIER = 'sb_oauth_verifier';

interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  maxAge?: number;
}

function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    // In local dev (HTTP), Secure cookies are dropped — only require Secure in prod.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };
}

export async function setSessionCookies(tokens: {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresIn: number;
}) {
  const store = await cookies();
  const access = baseOptions();
  access.maxAge = tokens.expiresIn;
  store.set(ACCESS, tokens.accessToken, access);

  const id = baseOptions();
  id.maxAge = tokens.expiresIn;
  store.set(ID, tokens.idToken, id);

  if (tokens.refreshToken) {
    const refresh = baseOptions();
    refresh.maxAge = 60 * 60 * 24 * 30; // 30 days, matches Cognito client setting
    store.set(REFRESH, tokens.refreshToken, refresh);
  }
}

export async function clearSessionCookies() {
  const store = await cookies();
  for (const name of [ACCESS, ID, REFRESH, OAUTH_STATE, OAUTH_VERIFIER]) {
    store.delete(name);
  }
}

export async function setOAuthCookies(state: string, codeVerifier: string) {
  const store = await cookies();
  const opts = baseOptions();
  opts.maxAge = 60 * 10; // 10 min — covers the user authenticating on Hosted UI
  store.set(OAUTH_STATE, state, opts);
  store.set(OAUTH_VERIFIER, codeVerifier, opts);
}

export async function takeOAuthCookies(): Promise<{
  state: string | null;
  codeVerifier: string | null;
}> {
  const store = await cookies();
  const state = store.get(OAUTH_STATE)?.value ?? null;
  const codeVerifier = store.get(OAUTH_VERIFIER)?.value ?? null;
  // Always consume these — they're one-shot.
  store.delete(OAUTH_STATE);
  store.delete(OAUTH_VERIFIER);
  return { state, codeVerifier };
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
  const accessToken = store.get(ACCESS)?.value;
  const idToken = store.get(ID)?.value;
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
