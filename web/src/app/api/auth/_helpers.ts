import 'server-only';

import type { AuthErrorResponse } from '@stablebook/shared';
import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

/**
 * Shared response helpers for the /api/auth/* routes. Keeps the route
 * handlers tight and gives us one place to translate Cognito SDK errors into
 * stable machine-readable codes the UI can branch on.
 */

export function badInput(err: ZodError): NextResponse<AuthErrorResponse> {
  return NextResponse.json(
    { code: 'invalid_input', message: err.issues[0]?.message ?? 'Invalid input' },
    { status: 400 },
  );
}

interface CognitoErrorLike {
  name?: string;
  message?: string;
}

function isCognitoError(err: unknown): err is CognitoErrorLike {
  return typeof err === 'object' && err !== null && 'name' in err;
}

/**
 * Map a Cognito SDK error to an HTTP response with a stable error code.
 * The `flow` parameter scopes the mapping — same Cognito exception name can
 * mean different things in sign-in vs sign-up vs confirm contexts.
 *
 * Security note: sign-in deliberately collapses NotAuthorizedException and
 * UserNotFoundException into a single generic message so we don't reveal
 * which addresses have accounts.
 */
export function authErrorFromCognito(
  err: unknown,
  flow: 'sign-in' | 'sign-up' | 'confirm' | 'resend',
): NextResponse<AuthErrorResponse> {
  const name = isCognitoError(err) ? err.name : undefined;
  const message = isCognitoError(err) ? err.message : undefined;

  // Log full error server-side so we can debug from CloudWatch without
  // leaking it to the client.
  console.log(JSON.stringify({ tag: 'auth_error', flow, name, message }));

  switch (name) {
    case 'NotAuthorizedException':
    case 'UserNotFoundException':
      if (flow === 'sign-in') {
        return NextResponse.json(
          { code: 'invalid_credentials', message: 'Incorrect email or password.' },
          { status: 401 },
        );
      }
      break;
    case 'UserNotConfirmedException':
      return NextResponse.json(
        { code: 'user_not_confirmed', message: 'Please confirm your email before signing in.' },
        { status: 403 },
      );
    case 'UsernameExistsException':
      return NextResponse.json(
        { code: 'email_exists', message: 'An account already exists for that email.' },
        { status: 409 },
      );
    case 'InvalidPasswordException':
      return NextResponse.json(
        {
          code: 'weak_password',
          message:
            message ??
            'Password does not meet requirements (min 8 chars, with upper, lower, digit, and symbol).',
        },
        { status: 400 },
      );
    case 'CodeMismatchException':
      return NextResponse.json(
        { code: 'code_mismatch', message: 'The confirmation code is incorrect.' },
        { status: 400 },
      );
    case 'ExpiredCodeException':
      return NextResponse.json(
        { code: 'code_expired', message: 'The confirmation code has expired. Request a new one.' },
        { status: 400 },
      );
    case 'LimitExceededException':
      return NextResponse.json(
        { code: 'rate_limited', message: 'Too many attempts. Please wait and try again.' },
        { status: 429 },
      );
    case 'InvalidParameterException':
      return NextResponse.json(
        { code: 'invalid_input', message: message ?? 'Invalid input.' },
        { status: 400 },
      );
  }

  return NextResponse.json(
    { code: 'auth_failed', message: 'Something went wrong. Please try again.' },
    { status: 500 },
  );
}
