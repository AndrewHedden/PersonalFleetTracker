import { fuelEntries, vehicles } from '@stablebook/db';
import { UpdateFuelEntryInputSchema, type FuelEntry } from '@stablebook/shared';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { and, eq } from 'drizzle-orm';

import { getDb } from '../db';
import { getOrCreateUser } from '../users';

/**
 * PATCH /v1/vehicles/{id}/fuel/{entryId} — update a fuel entry on one of the
 * caller's vehicles. Only provided fields are written. 404 if the vehicle isn't
 * theirs or the entry doesn't belong to it.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  const vehicleId = event.pathParameters?.id;
  const entryId = event.pathParameters?.entryId;
  if (!vehicleId || !isUuid(vehicleId) || !entryId || !isUuid(entryId)) {
    return jsonError(404, 'not_found', 'Fuel entry not found.');
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

  const parsed = UpdateFuelEntryInputSchema.safeParse(raw);
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
    return jsonError(404, 'not_found', 'Fuel entry not found.');
  }

  const i = parsed.data;
  const updates: Partial<typeof fuelEntries.$inferInsert> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };
  if (i.entryDate !== undefined) updates.entryDate = i.entryDate;
  if (i.odometer !== undefined) updates.odometer = i.odometer;
  if (i.gallons !== undefined) updates.gallons = i.gallons.toFixed(3);
  if (i.totalCost !== undefined) updates.totalCost = i.totalCost.toFixed(2);
  if (i.pricePerGallon !== undefined) updates.pricePerGallon = i.pricePerGallon.toFixed(3);
  if (i.tankFilled !== undefined) updates.tankFilled = i.tankFilled;
  if (i.notes !== undefined) updates.notes = i.notes ?? null;

  const [row] = await db
    .update(fuelEntries)
    .set(updates)
    .where(and(eq(fuelEntries.id, entryId), eq(fuelEntries.vehicleId, vehicleId)))
    .returning();

  if (!row) {
    return jsonError(404, 'not_found', 'Fuel entry not found.');
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
    statusCode: 200,
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
