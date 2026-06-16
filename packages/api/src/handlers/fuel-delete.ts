import { fuelEntries, vehicles } from '@stablebook/db';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { and, eq } from 'drizzle-orm';

import { getDb } from '../db';
import { getOrCreateUser } from '../users';

/**
 * DELETE /v1/vehicles/{id}/fuel/{entryId} — delete a fuel entry on one of the
 * caller's vehicles. 404 if the vehicle isn't theirs or the entry doesn't
 * belong to it.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  const vehicleId = event.pathParameters?.id;
  const entryId = event.pathParameters?.entryId;
  if (!vehicleId || !isUuid(vehicleId) || !entryId || !isUuid(entryId)) {
    return jsonError(404, 'not_found', 'Fuel entry not found.');
  }

  const claims = event.requestContext.authorizer.jwt.claims;
  const user = await getOrCreateUser({
    sub: String(claims.sub),
    username: typeof claims.username === 'string' ? claims.username : undefined,
    email: typeof claims.email === 'string' ? claims.email : undefined,
  });

  const db = getDb();
  const [vehicle] = await db
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(and(eq(vehicles.id, vehicleId), eq(vehicles.userId, user.id)));
  if (!vehicle) {
    return jsonError(404, 'not_found', 'Fuel entry not found.');
  }

  const [row] = await db
    .delete(fuelEntries)
    .where(and(eq(fuelEntries.id, entryId), eq(fuelEntries.vehicleId, vehicleId)))
    .returning({ id: fuelEntries.id });

  if (!row) {
    return jsonError(404, 'not_found', 'Fuel entry not found.');
  }

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: row.id, deleted: true }),
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
