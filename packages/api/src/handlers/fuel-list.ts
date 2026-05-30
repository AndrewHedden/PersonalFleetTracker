import { fuelEntries, vehicles } from '@stablebook/db';
import type { ListFuelEntriesResponse } from '@stablebook/shared';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { and, desc, eq } from 'drizzle-orm';

import { getDb } from '../db';
import { getOrCreateUser } from '../users';

/**
 * GET /v1/vehicles/{id}/fuel — list fuel entries for one of the caller's
 * vehicles, newest entry first. The handler verifies vehicle ownership
 * before returning entries; 404 (not 403) if the vehicle isn't theirs, to
 * avoid leaking which ids exist.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  const vehicleId = event.pathParameters?.id;
  if (!vehicleId || !isUuid(vehicleId)) {
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
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(and(eq(vehicles.id, vehicleId), eq(vehicles.userId, user.id)));
  if (!vehicle) {
    return jsonError(404, 'not_found', 'Vehicle not found.');
  }

  const rows = await db
    .select()
    .from(fuelEntries)
    .where(eq(fuelEntries.vehicleId, vehicleId))
    .orderBy(desc(fuelEntries.entryDate), desc(fuelEntries.createdAt));

  const response: ListFuelEntriesResponse = {
    entries: rows.map((row) => ({
      id: row.id,
      vehicleId: row.vehicleId,
      entryDate: row.entryDate,
      odometer: row.odometer,
      gallons: row.gallons,
      totalCost: row.totalCost,
      pricePerGallon: row.pricePerGallon,
      tankFilled: row.tankFilled,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  };

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(response),
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
