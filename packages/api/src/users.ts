import { users, type User } from '@stablebook/db';
import { eq } from 'drizzle-orm';

import { getDb } from './db';

/**
 * Cognito access-token claims shape we care about.
 *
 * Pulled out of `event.requestContext.authorizer.jwt.claims` once API Gateway
 * has verified the signature. We trust these to be authentic.
 */
export interface AuthClaims {
  sub: string;
  /** Cognito username — with our user-pool config, this is the email. */
  username?: string;
  email?: string;
}

/**
 * Upsert the Cognito user into our internal `users` table on their first
 * authenticated request. Idempotent — subsequent requests get back the existing
 * row by `cognito_sub`. Returns the local row.
 *
 * Decoupling our `users.id` from the Cognito `sub` (rather than reusing it as
 * the primary key) keeps us free to switch identity providers without churn.
 */
export async function getOrCreateUser(claims: AuthClaims): Promise<User> {
  const db = getDb();

  const existing = await db.query.users.findFirst({
    where: eq(users.cognitoSub, claims.sub),
  });
  if (existing) return existing;

  // First-login: synthesize a placeholder email if Cognito didn't surface one
  // (access tokens often don't include email; the ID token usually does and
  // the API Gateway authorizer happens to forward `username` from Cognito,
  // which we've configured as the user's email).
  const email = claims.email ?? claims.username ?? `${claims.sub}@cognito.local`;

  const [created] = await db
    .insert(users)
    .values({
      cognitoSub: claims.sub,
      email,
      displayName: null,
    })
    .returning();

  if (!created) {
    throw new Error('Failed to create user');
  }
  return created;
}
