import 'server-only';

import type { NextRequest } from 'next/server';

/**
 * Shared helpers for the /api/auth/* route handlers.
 *
 * Forms in /sign-in, /sign-up, /confirm POST as standard
 * application/x-www-form-urlencoded (or multipart/form-data — both arrive on
 * the FormData API) and the route handlers respond with 303 redirects that
 * carry Set-Cookie headers. We switched away from JS fetch + JSON because
 * Safari and Chrome silently evict cookies set via XHR responses in some
 * conditions, while cookies set on a 30x navigation response persist
 * normally.
 */

/**
 * Parse the form-encoded body of a POST request into a plain object. Returns
 * an empty object if parsing fails or content-type doesn't look like a form.
 */
export async function parseFormBody(request: NextRequest): Promise<Record<string, string>> {
  try {
    const formData = await request.formData();
    const out: Record<string, string> = {};
    for (const [k, v] of formData.entries()) {
      if (typeof v === 'string') out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

interface CognitoErrorLike {
  name?: string;
  message?: string;
}

function isCognitoError(err: unknown): err is CognitoErrorLike {
  return typeof err === 'object' && err !== null && 'name' in err;
}

/**
 * Map a Cognito SDK exception to a stable, lowercase error code we use as
 * the ?error=... query param on the form-page redirect. The form page
 * translates the code into a human-readable message.
 *
 * The `flow` parameter scopes the mapping — same Cognito exception name
 * can mean different things in sign-in vs sign-up vs confirm contexts.
 *
 * Security: sign-in collapses NotAuthorizedException and
 * UserNotFoundException into a single `invalid_credentials` code so we
 * don't leak which addresses have accounts.
 */
export function extractCognitoErrorCode(
  err: unknown,
  flow: 'sign-in' | 'sign-up' | 'confirm' | 'resend',
): string {
  const name = isCognitoError(err) ? err.name : undefined;
  const message = isCognitoError(err) ? err.message : undefined;

  console.log(JSON.stringify({ tag: 'auth_error', flow, name, message }));

  switch (name) {
    case 'NotAuthorizedException':
    case 'UserNotFoundException':
      if (flow === 'sign-in') return 'invalid_credentials';
      return 'auth_failed';
    case 'UserNotConfirmedException':
      return 'user_not_confirmed';
    case 'UsernameExistsException':
      return 'email_exists';
    case 'InvalidPasswordException':
      return 'weak_password';
    case 'CodeMismatchException':
      return 'code_mismatch';
    case 'ExpiredCodeException':
      return 'code_expired';
    case 'LimitExceededException':
      return 'rate_limited';
    case 'InvalidParameterException':
      return 'invalid_input';
  }
  return 'auth_failed';
}
