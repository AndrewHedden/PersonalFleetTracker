/// <reference path="../../.sst/platform/config.d.ts" />

import { userPool, userPoolClient } from './auth';
import { db, vpc } from './storage';

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
 * Returns the authenticated user's Cognito claims. Useful as a sanity check
 * that the JWT authorizer is wiring claims through correctly.
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

/**
 * GET /v1/vehicles — list the authenticated user's vehicles.
 *
 * In-VPC + linked to `db` so the handler can reach RDS on its private
 * endpoint. This is the first DB-backed route — possible thanks to the
 * SST v4 upgrade (the v3.5 deploy crash on `vpc:` + `link:[db]` is gone).
 */
api.route(
  'GET /v1/vehicles',
  {
    handler: 'packages/api/src/handlers/vehicles-list.handler',
    description: "List the authenticated user's vehicles",
    vpc,
    link: [db],
  },
  {
    auth: { jwt: { authorizer: jwtAuthorizer.id } },
  },
);
