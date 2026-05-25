/// <reference path="../../.sst/platform/config.d.ts" />

/**
 * Cognito User Pool — single source of identity for both web and iOS clients.
 *
 * Multi-user-ready from day one: signups are gated by an admin-controlled
 * trigger (`adminCreateUserOnly`-style) so randos can't register against
 * the deployed app. We toggle this open if/when we want public signup.
 */
export const userPool = new sst.aws.CognitoUserPool('UserPool', {
  usernames: ['email'],
  // Phase 5 hookups: pre-signup / pre-token-generation triggers can attach here.
});

/**
 * App client used by both the Next.js web app and the SwiftUI iOS app.
 *
 * No client secret — public client; auth code flow + PKCE (SDK default).
 * If we later want a separate machine-to-machine client, we add another
 * call to `userPool.addClient(...)` here.
 */
export const userPoolClient = userPool.addClient('AppClient');
