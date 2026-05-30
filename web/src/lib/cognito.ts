import 'server-only';

import {
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  SignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider';

import { getCognitoConfig } from './env';

/**
 * Server-side wrapper around the Cognito Identity Provider API. The Cognito
 * hosted UI is bypassed entirely — we own the sign-in/sign-up/confirm forms
 * and call these endpoints from our route handlers, then set session cookies
 * on the same-origin response. This avoids the cross-origin redirect chain
 * that triggers Safari/Chrome bounce-tracking cookie eviction.
 *
 * InitiateAuth + SignUp + ConfirmSignUp + ResendConfirmationCode are all
 * unauthenticated Cognito APIs (they take a `ClientId`, not AWS credentials),
 * so the Lambda doesn't need an IAM policy granting Cognito access.
 */

let _client: CognitoIdentityProviderClient | undefined;

function getClient(): CognitoIdentityProviderClient {
  if (!_client) {
    const { region } = getCognitoConfig();
    _client = new CognitoIdentityProviderClient({ region });
  }
  return _client;
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string | null;
  /** Lifetime of the access token in seconds (Cognito default: 3600). */
  expiresIn: number;
}

/**
 * Authenticate a user with their email + password. Uses USER_PASSWORD_AUTH
 * (enabled on the user pool client in infra/src/auth.ts). The password
 * travels server-to-server over TLS, never to the client.
 */
export async function initiateAuth(email: string, password: string): Promise<AuthTokens> {
  const { clientId } = getCognitoConfig();
  const res = await getClient().send(
    new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: clientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    }),
  );
  const result = res.AuthenticationResult;
  if (!result?.AccessToken || !result.IdToken) {
    // Either a challenge was returned (MFA, password reset, etc.) or the
    // response shape was unexpected. We don't currently support challenges.
    throw new Error(
      'Authentication did not return tokens — challenge response or unsupported flow',
    );
  }
  return {
    accessToken: result.AccessToken,
    idToken: result.IdToken,
    refreshToken: result.RefreshToken ?? null,
    expiresIn: result.ExpiresIn ?? 3600,
  };
}

export async function signUp(email: string, password: string): Promise<{ userConfirmed: boolean }> {
  const { clientId } = getCognitoConfig();
  const res = await getClient().send(
    new SignUpCommand({
      ClientId: clientId,
      Username: email,
      Password: password,
      UserAttributes: [{ Name: 'email', Value: email }],
    }),
  );
  return { userConfirmed: res.UserConfirmed ?? false };
}

export async function confirmSignUp(email: string, code: string): Promise<void> {
  const { clientId } = getCognitoConfig();
  await getClient().send(
    new ConfirmSignUpCommand({
      ClientId: clientId,
      Username: email,
      ConfirmationCode: code,
    }),
  );
}

export async function resendConfirmationCode(email: string): Promise<void> {
  const { clientId } = getCognitoConfig();
  await getClient().send(
    new ResendConfirmationCodeCommand({
      ClientId: clientId,
      Username: email,
    }),
  );
}

/**
 * Triggers Cognito to email a 6-digit password-reset code to the user.
 * Cognito always responds 200 (no info about whether the email exists) when
 * `preventUserExistenceErrors` is `ENABLED` on the user pool client, so we
 * can safely surface success without leaking account existence.
 */
export async function forgotPassword(email: string): Promise<void> {
  const { clientId } = getCognitoConfig();
  await getClient().send(
    new ForgotPasswordCommand({
      ClientId: clientId,
      Username: email,
    }),
  );
}

/**
 * Sets a new password using the reset code from `forgotPassword`. The new
 * password must satisfy the user pool's password policy.
 */
export async function confirmForgotPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  const { clientId } = getCognitoConfig();
  await getClient().send(
    new ConfirmForgotPasswordCommand({
      ClientId: clientId,
      Username: email,
      ConfirmationCode: code,
      Password: newPassword,
    }),
  );
}
