import { Resource } from 'sst';

/**
 * Validated, typed access to the Cognito + AWS env vars wired in by SST.
 *
 * IDs flow through SST `link:` (`Resource.UserPool.id`, etc.). Other strings
 * come in via the `environment:` block in `infra/src/web.ts`.
 *
 * All access is wrapped in a function so build-time tools (Next.js static
 * page collection) don't crash when running outside an SST runtime.
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
    userPoolId: Resource.UserPool.id,
    clientId: Resource.AppClient.id,
    /** Hosted UI base URL, e.g. https://pft-andrew.auth.us-east-1.amazoncognito.com */
    domainUrl: requireEnv('COGNITO_DOMAIN_URL'),
  };
}

export function getAppUrl(request: Request): string {
  // Trust the X-Forwarded-* headers CloudFront sets when forwarding to Lambda.
  const url = new URL(request.url);
  const proto = request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '');
  const host = request.headers.get('x-forwarded-host') ?? url.host;
  return `${proto}://${host}`;
}
