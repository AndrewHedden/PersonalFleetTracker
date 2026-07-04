import { vehicles } from '@stablebook/db';
import { UpdateVehicleInputSchema, type Vehicle } from '@stablebook/shared';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { and, eq } from 'drizzle-orm';

import { getDb } from '../db';
import { getOrCreateUser } from '../users';

/**
 * PATCH /v1/vehicles/{id} — update fields on a vehicle the caller owns.
 *
 * Body validated against UpdateVehicleInputSchema. All fields are optional;
 * only provided fields are written. `retiredAt` doubles as the retire /
 * un-retire toggle: set to an ISO timestamp to retire, set to null to
 * un-retire, omit to leave unchanged.
 *
 * Returns 404 if the id doesn't exist or doesn't belong to the caller, for
 * the same reason as vehicles-get.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  const id = event.pathParameters?.id;
  if (!id || !isUuid(id)) {
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

  const parsed = UpdateVehicleInputSchema.safeParse(raw);
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

  // Build an update object that only includes fields that were present in
  // the parsed input — Zod's .partial() leaves omitted fields undefined, and
  // we want to keep their existing DB values rather than overwrite them.
  const updates: Partial<typeof vehicles.$inferInsert> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };
  const i = parsed.data;
  if (i.nickname !== undefined) updates.nickname = i.nickname;
  if (i.year !== undefined) updates.year = i.year ?? null;
  if (i.make !== undefined) updates.make = i.make;
  if (i.model !== undefined) updates.model = i.model;
  if (i.trim !== undefined) updates.trim = i.trim ?? null;
  if (i.vin !== undefined) updates.vin = i.vin ?? null;
  if (i.licensePlate !== undefined) updates.licensePlate = i.licensePlate ?? null;
  if (i.color !== undefined) updates.color = i.color ?? null;
  if (i.purchaseOdometer !== undefined) updates.purchaseOdometer = i.purchaseOdometer ?? null;
  if (i.purchaseDate !== undefined) updates.purchaseDate = i.purchaseDate ?? null;
  if (i.specs !== undefined) updates.specs = i.specs ?? null;
  if (i.retiredAt !== undefined) {
    updates.retiredAt = i.retiredAt === null ? null : new Date(i.retiredAt);
  }

  const db = getDb();
  const [row] = await db
    .update(vehicles)
    .set(updates)
    .where(and(eq(vehicles.id, id), eq(vehicles.userId, user.id)))
    .returning();

  if (!row) {
    return jsonError(404, 'not_found', 'Vehicle not found.');
  }

  const response: Vehicle = {
    id: row.id,
    userId: row.userId,
    nickname: row.nickname,
    year: row.year,
    make: row.make,
    model: row.model,
    trim: row.trim,
    vin: row.vin,
    licensePlate: row.licensePlate,
    color: row.color,
    purchaseOdometer: row.purchaseOdometer,
    purchaseDate: row.purchaseDate,
    specs: (row.specs as Vehicle['specs']) ?? null,
    retiredAt: row.retiredAt?.toISOString() ?? null,
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
