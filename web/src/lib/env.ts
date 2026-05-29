/**
 * Typed access to the Stablebook environment.
 *
 * Variables are set on AWS Amplify Hosting at the app level (Console →
 * Hosting → Environment variables). Locally, drop them in `web/.env.local`
 * (gitignored). Required values:
 *
 *   NEXT_PUBLIC_AWS_REGION       us-east-1
 *   COGNITO_USER_POOL_ID         e.g. us-east-1_MYtNDBVTj
 *   COGNITO_APP_CLIENT_ID        e.g. 4ikt4vl47ugh8u17s02oaakrgi
 *   API_URL                      https://<id>.execute-api.<region>.amazonaws.com
 *
 * COGNITO_DOMAIN_URL is no longer required — we use Cognito's InitiateAuth
 * API directly from our route handlers rather than the Hosted UI.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getCognitoConfig() {
  return {
    region: requireEnv('NEXT_PUBLIC_AWS_REGION'),
    userPoolId: requireEnv('COGNITO_USER_POOL_ID'),
    clientId: requireEnv('COGNITO_APP_CLIENT_ID'),
  };
}

export function getApiUrl(): string {
  return requireEnv('API_URL');
}

export function getAppUrl(request: Request): string {
  // Trust the X-Forwarded-* headers AWS infra (CloudFront / Amplify) sets
  // when forwarding to the SSR runtime.
  const url = new URL(request.url);
  const proto = request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '');
  const host = request.headers.get('x-forwarded-host') ?? url.host;
  return `${proto}://${host}`;
}
