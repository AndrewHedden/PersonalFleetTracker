import { vehicles } from '@stablebook/db';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { and, eq } from 'drizzle-orm';

import { getDb } from '../db';
import { getOrCreateUser } from '../users';

/**
 * DELETE /v1/vehicles/{id} — permanently delete a vehicle the caller owns,
 * along with all of its related data. Fuel entries, maintenance entries (and
 * their task links), and maintenance schedules all reference the vehicle with
 * `onDelete: 'cascade'`, so removing the vehicle row removes everything attached.
 *
 * Guard: only a *retired* vehicle can be deleted. The web UI requires the user
 * to retire first and then double-confirms, but we re-enforce the rule here so
 * the destructive path can't be triggered against an active vehicle via the API.
 * 404 (not 403) if the vehicle isn't theirs, consistent with the rest of the API.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  const id = event.pathParameters?.id;
  if (!id || !isUuid(id)) {
    return jsonError(404, 'not_found', 'Vehicle not found.');
  }

  const claims = event.requestContext.authorizer.jwt.claims;
  const user = await getOrCreateUser({
    sub: String(claims.sub),
    username: typeof claims.username === 'string' ? claims.username : undefined,
    email: typeof claims.email === 'string' ? claims.email : undefined,
  });

  const db = getDb();
  const [vehicle] = await db
    .select({ id: vehicles.id, retiredAt: vehicles.retiredAt })
    .from(vehicles)
    .where(and(eq(vehicles.id, id), eq(vehicles.userId, user.id)));
  if (!vehicle) {
    return jsonError(404, 'not_found', 'Vehicle not found.');
  }

  if (vehicle.retiredAt === null) {
    return jsonError(409, 'not_retired', 'Retire the vehicle before deleting it.');
  }

  await db.delete(vehicles).where(and(eq(vehicles.id, id), eq(vehicles.userId, user.id)));

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, deleted: true }),
  };
};

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function jsonError(statusCode: number, code: string, message: string): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ error: code, message }),
  };
}
