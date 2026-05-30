import { fuelEntries, vehicles } from '@stablebook/db';
import { CreateFuelEntryInputSchema, type FuelEntry } from '@stablebook/shared';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { and, eq } from 'drizzle-orm';

import { getDb } from '../db';
import { getOrCreateUser } from '../users';

/**
 * POST /v1/vehicles/{id}/fuel — log a fill-up for one of the caller's
 * vehicles. Returns the created entry. 404 (not 403) if the vehicle isn't
 * theirs, same as the rest of the vehicles API.
 *
 * Numeric values come in as JSON numbers from the form; we convert to the
 * fixed-precision string format Postgres `numeric` columns expect.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  const vehicleId = event.pathParameters?.id;
  if (!vehicleId || !isUuid(vehicleId)) {
    return jsonError(404, 'not_found', 'Vehicle not found.');
  }

  if (!event.body) {
    return jsonError(400, 'missing_body', 'Request body is required.');
  }

  let raw: unknown;
  try {
    raw = JSON.parse(event.body);
  } catch {
    return jsonError(400, 'invalid_json', 'Request body must be valid JSON.');
  }

  const parsed = CreateFuelEntryInputSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(
      400,
      'invalid_input',
      'Request body does not match the schema.',
      parsed.error.flatten(),
    );
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

  const i = parsed.data;
  const [row] = await db
    .insert(fuelEntries)
    .values({
      vehicleId,
      entryDate: i.entryDate,
      odometer: i.odometer,
      gallons: i.gallons.toFixed(3),
      totalCost: i.totalCost.toFixed(2),
      pricePerGallon: i.pricePerGallon.toFixed(3),
      tankFilled: i.tankFilled ?? true,
      notes: i.notes ?? null,
    })
    .returning();

  if (!row) {
    return jsonError(500, 'insert_failed', 'Failed to log fuel entry.');
  }

  const response: FuelEntry = {
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
  };

  return {
    statusCode: 201,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(response),
  };
};

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function jsonError(
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ error: code, message, ...(details ? { details } : {}) }),
  };
}
