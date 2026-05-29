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

// ACM cert for auth.retrouvez.net, manually pre-created in us-east-1.
// Cognito custom domains require the cert to be in us-east-1 regardless
// of the user pool's region. Manually managed (not Pulumi-owned) because
// SST's default cert provisioning expects Route 53 for DNS validation,
// and our DNS lives at Squarespace.
const COGNITO_CUSTOM_DOMAIN_CERT_ARN =
  'arn:aws:acm:us-east-1:537557168578:certificate/ef771050-6d9d-4ca5-9f1f-c7cad810b339';

export const userPool = new sst.aws.CognitoUserPool('UserPool', {
  usernames: ['email'],
  // Custom domain for the Hosted UI on auth.retrouvez.net. We previously
  // used the Cognito-managed prefix domain (stablebook-<stage>.auth.<region>.
  // amazoncognito.com) but Safari/Chrome bounce-tracking protection killed
  // session cookies set via the cross-site redirect chain from the
  // amazoncognito.com domain back to our app. Hosting the auth UI on a
  // same-site subdomain (auth.retrouvez.net + stablebook.retrouvez.net both
  // sharing retrouvez.net as the eTLD+1) lets browsers treat the entire
  // OAuth flow as first-party.
  domain: {
    name: 'auth.retrouvez.net',
    cert: COGNITO_CUSTOM_DOMAIN_CERT_ARN,
    dns: false, // DNS is at Squarespace; we add the CNAME manually
  },
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
      // ALLOW_USER_PASSWORD_AUTH lets our Next.js Lambda send username +
      // password to Cognito's InitiateAuth on behalf of the user (we own the
      // sign-in UI and the connection is server-to-server over TLS, so the
      // password is never exposed to the client). ALLOW_USER_SRP_AUTH stays
      // available for future native clients (iOS/Amplify Swift) that prefer
      // the SRP handshake.
      args.explicitAuthFlows = [
        'ALLOW_REFRESH_TOKEN_AUTH',
        'ALLOW_USER_SRP_AUTH',
        'ALLOW_USER_PASSWORD_AUTH',
      ];
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
