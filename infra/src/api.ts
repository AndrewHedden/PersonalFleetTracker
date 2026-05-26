/// <reference path="../../.sst/platform/config.d.ts" />

import { userPool, userPoolClient } from './auth';

/**
 * Public REST API consumed by both the web app and the iOS app.
 *
 * - HTTP API (cheaper than REST API; included in the 12-month free tier).
 * - JWT authorizer validates Cognito access tokens at the gateway, so
 *   Lambda handlers receive pre-verified claims and never need to call
 *   Cognito JWKS themselves (which would force NAT egress from the VPC).
 */
export const api = new sst.aws.ApiGatewayV2('Api', {
  cors: {
    // Phase 3 will narrow this once we know the web origin.
    allowOrigins: ['*'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type'],
  },
});

const jwtAuthorizer = api.addAuthorizer({
  name: 'CognitoJwt',
  jwt: {
    audiences: [userPoolClient.id],
    issuer: $interpolate`https://cognito-idp.${aws.getRegionOutput().name}.amazonaws.com/${userPool.id}`,
  },
});

/**
 * Unauthenticated liveness probe — useful for uptime checks and a tiny smoke
 * test that the API itself is wired up before we trust the auth path.
 */
api.route('GET /v1/health', {
  handler: 'packages/api/src/handlers/health.handler',
  description: 'Liveness probe',
});

/**
 * Sample authenticated route. Will be replaced by the real Vehicles CRUD
 * routes in Phase 3 — kept now so we exercise the JWT authorizer wiring.
 *
 * Intentionally NOT linked to the DB or placed in the VPC yet: an SST/Pulumi
 * issue triggers a `RangeError: Invalid string length` during deploy when a
 * Lambda is linked to `sst.aws.Postgres` (the link metadata payload is large
 * enough to crash Node's `util.inspect`). We'll re-link as Phase 3c brings in
 * real DB-backed routes and we have a workaround.
 */
api.route(
  'GET /v1/me',
  {
    handler: 'packages/api/src/handlers/me.handler',
    description: 'Returns the authenticated user',
  },
  {
    auth: { jwt: { authorizer: jwtAuthorizer.id } },
  },
);
