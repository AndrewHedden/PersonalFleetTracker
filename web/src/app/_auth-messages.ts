/**
 * Map a server-side auth error code (from /api/auth/*) to a human-readable
 * message shown above the sign-in / sign-up / confirm form. Centralized so
 * all three pages stay in sync on copy.
 */
export function authErrorMessage(code: string): string {
  switch (code) {
    case 'invalid_credentials':
      return 'Incorrect email or password.';
    case 'invalid_input':
      return 'Please check the form and try again.';
    case 'email_exists':
      return 'An account already exists for that email.';
    case 'weak_password':
      return 'Password does not meet requirements (min 8 chars, with upper, lower, digit, and symbol).';
    case 'code_mismatch':
      return 'The confirmation code is incorrect.';
    case 'code_expired':
      return 'The confirmation code has expired. Request a new one.';
    case 'rate_limited':
      return 'Too many attempts. Please wait and try again.';
    case 'user_not_confirmed':
      return 'Please confirm your email before signing in.';
    case 'handoff_invalid':
      return 'Sign-in took too long. Please try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
