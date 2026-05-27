/// <reference path="../../.sst/platform/config.d.ts" />

/**
 * Cognito User Pool — single source of identity for both web and iOS clients.
 *
 * Web uses the Cognito **Hosted UI** with the Authorization Code grant (with
 * PKCE) — see `web/src/lib/auth.ts`. iOS will eventually use Amplify Swift
 * against the same user pool and app client.
 *
 * Both clients land tokens at the Cognito-provided Hosted UI domain
 * (`pft-<stage>.auth.<region>.amazoncognito.com`); we exchange the auth code
 * server-side and store tokens in HTTP-only cookies (web).
 */

const CALLBACK_PATH = '/api/auth/callback';

// CloudFront URL for the deployed `andrew` stage. Stable for the life of the
// distribution; if we ever rebuild the CDN this list needs updating.
const WEB_URLS = ['http://localhost:3000', 'https://d2v3k1wol4ugl8.cloudfront.net'];

export const userPool = new sst.aws.CognitoUserPool('UserPool', {
  usernames: ['email'],
  // Spins up a Cognito-managed Hosted UI at
  //   https://pft-<stage>.auth.<region>.amazoncognito.com
  domain: { prefix: `pft-${$app.stage}` },
  transform: {
    userPool: (args) => {
      // Cognito will email a 6-digit verification code on sign-up.
      args.autoVerifiedAttributes = ['email'];
      args.accountRecoverySetting = {
        recoveryMechanisms: [{ name: 'verified_email', priority: 1 }],
      };
    },
  },
});

/**
 * App client used by both the Next.js web app and (later) the SwiftUI iOS app.
 *
 * Public client (no secret) — both SPA and mobile patterns expect this. The
 * web app uses PKCE; Amplify Swift will use SRP + refresh tokens.
 */
export const userPoolClient = userPool.addClient('AppClient', {
  callbackUrls: WEB_URLS.map((url) => `${url}${CALLBACK_PATH}`),
  transform: {
    client: (args) => {
      args.allowedOauthFlows = ['code'];
      args.allowedOauthFlowsUserPoolClient = true;
      args.allowedOauthScopes = ['openid', 'email', 'profile'];
      args.logoutUrls = WEB_URLS;
      args.supportedIdentityProviders = ['COGNITO'];
      args.preventUserExistenceErrors = 'ENABLED';
      args.explicitAuthFlows = ['ALLOW_REFRESH_TOKEN_AUTH', 'ALLOW_USER_SRP_AUTH'];
      // Token lifetimes — short access token, longer refresh.
      args.accessTokenValidity = 60; // minutes
      args.idTokenValidity = 60; // minutes
      args.refreshTokenValidity = 30; // days
      args.tokenValidityUnits = {
        accessToken: 'minutes',
        idToken: 'minutes',
        refreshToken: 'days',
      };
    },
  },
});
