/// <reference path="../../.sst/platform/config.d.ts" />

/**
 * Cognito User Pool — single source of identity for both web and iOS clients.
 *
 * The web app uses Cognito's InitiateAuth API directly (USER_PASSWORD_AUTH)
 * via `web/src/lib/cognito.ts` and stores tokens in localStorage rather than
 * cookies — see the `[[project-auth]]` memory entry for the why. The Hosted
 * UI is not in use; we keep the prefix domain provisioned so it's available
 * if a future native client wants the OAuth code-grant flow.
 *
 * iOS will eventually use Amplify Swift against the same user pool + client.
 */

// The callback URL list is a leftover requirement from when we used the
// Hosted UI. With direct API auth there's no callback, but the user pool
// client still requires at least one entry when OAuth flows are enabled. We
// list the current app origins so that if we ever re-enable the Hosted UI
// (e.g., for a federated identity provider) it's already configured.
const CALLBACK_PATH = '/api/auth/callback';
const WEB_URLS = [
  'http://localhost:3000',
  'https://stablebook.retrouvez.net',
  'https://main.d3gmb1eaiag2ib.amplifyapp.com',
];

export const userPool = new sst.aws.CognitoUserPool('UserPool', {
  usernames: ['email'],
  // Cognito-managed prefix domain. Reverted from the auth.retrouvez.net
  // custom domain (commit history) once we stopped using the Hosted UI —
  // the custom domain was only needed to make the OAuth bounce same-site
  // for cookie purposes, and we no longer set cookies on that flow.
  domain: { prefix: `stablebook-${$app.stage}` },
  transform: {
    userPool: (args) => {
      args.autoVerifiedAttributes = ['email'];
      args.accountRecoverySetting = {
        recoveryMechanisms: [{ name: 'verified_email', priority: 1 }],
      };
    },
  },
});

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
      // ALLOW_USER_PASSWORD_AUTH is what the web Lambda actually uses now —
      // it sends username + password to Cognito's InitiateAuth on behalf of
      // the user. ALLOW_USER_SRP_AUTH stays available for future native
      // clients (iOS/Amplify Swift) that prefer the SRP handshake.
      args.explicitAuthFlows = [
        'ALLOW_REFRESH_TOKEN_AUTH',
        'ALLOW_USER_SRP_AUTH',
        'ALLOW_USER_PASSWORD_AUTH',
      ];
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
