import { OAuth2Client } from 'arctic';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

import { getCognitoConfig } from './env';

/**
 * Cognito + Hosted UI client wiring.
 *
 * Authorization flow:
 *   1. `/api/auth/sign-in` builds an Authorization URL pointing at the Hosted
 *      UI with `code` response_type + PKCE (S256). State + code verifier are
 *      stored in short-lived HTTP-only cookies before the redirect.
 *   2. The user authenticates on the Hosted UI domain.
 *   3. Cognito redirects back to `/api/auth/callback?code=...&state=...`.
 *   4. We validate `state` against the cookie, exchange the code at Cognito's
 *      `/oauth2/token` endpoint, and stash the resulting tokens in HTTP-only
 *      cookies for downstream requests.
 *
 * The OAuth2Client is built fresh per request because `getCognitoConfig()`
 * resolves SST `Resource.*` values that aren't safe to capture at module
 * import time during Next.js build.
 */

export function getOAuth2Client(appUrl: string): OAuth2Client {
  const { domainUrl, clientId } = getCognitoConfig();
  return new OAuth2Client(
    clientId,
    null, // no client secret — public client
    `${appUrl}/api/auth/callback`,
  );
}

export function getCognitoUrls() {
  const { domainUrl } = getCognitoConfig();
  return {
    authorize: `${domainUrl}/oauth2/authorize`,
    token: `${domainUrl}/oauth2/token`,
    logout: `${domainUrl}/logout`,
  };
}

/**
 * JWT verifier for Cognito access tokens. Caches the JWKS internally; the
 * first verification per cold start fetches the JWKS from Cognito over HTTPS.
 *
 * We re-verify the JWT here even though API Gateway also verifies it, because
 * Next.js page routes need their own server-side trust decision (a forged
 * cookie shouldn't let a request through to a server component that reads
 * the user's data).
 */
let _verifier: ReturnType<typeof CognitoJwtVerifier.create> | undefined;

export function getAccessTokenVerifier() {
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

export async function verifyAccessToken(token: string) {
  try {
    return await getAccessTokenVerifier().verify(token);
  } catch {
    return null;
  }
}
