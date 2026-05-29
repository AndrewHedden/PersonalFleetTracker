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

// Web is hosted on AWS Amplify Hosting. We expose it via a custom domain
// (stablebook.retrouvez.net) because Safari and Chrome apply bounce-tracking
// protection to public-suffix domains like *.amplifyapp.com, which deletes
// session cookies set during the OAuth callback redirect chain. The
// auto-generated amplifyapp URL is kept here so old links/test data still
// resolve, but the custom domain is what production sign-in should use.
const WEB_URLS = [
  'http://localhost:3000',
  'https://stablebook.retrouvez.net',
  'https://main.d3gmb1eaiag2ib.amplifyapp.com',
];

export const userPool = new sst.aws.CognitoUserPool('UserPool', {
  usernames: ['email'],
  // Spins up a Cognito-managed Hosted UI at
  //   https://stablebook-<stage>.auth.<region>.amazoncognito.com
  domain: { prefix: `stablebook-${$app.stage}` },
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
