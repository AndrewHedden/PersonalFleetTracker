import { vehicles } from '@stablebook/db';
import { CreateVehicleInputSchema, type Vehicle } from '@stablebook/shared';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';

import { getDb } from '../db';
import { getOrCreateUser } from '../users';

/**
 * POST /v1/vehicles — create a vehicle for the authenticated user.
 *
 * Body shape validated against `CreateVehicleInputSchema` (Zod). Returns
 * the created row as a `Vehicle`. The caller's `user_id` comes from the
 * verified JWT — clients can't spoof ownership.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  if (!event.body) {
    return jsonError(400, 'missing_body', 'Request body is required.');
  }

  let raw: unknown;
  try {
    raw = JSON.parse(event.body);
  } catch {
    return jsonError(400, 'invalid_json', 'Request body must be valid JSON.');
  }

  const parsed = CreateVehicleInputSchema.safeParse(raw);
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
  const [row] = await db
    .insert(vehicles)
    .values({
      userId: user.id,
      nickname: parsed.data.nickname,
      year: parsed.data.year ?? null,
      make: parsed.data.make,
      model: parsed.data.model,
      trim: parsed.data.trim ?? null,
      vin: parsed.data.vin ?? null,
      licensePlate: parsed.data.licensePlate ?? null,
      color: parsed.data.color ?? null,
      purchaseOdometer: parsed.data.purchaseOdometer ?? null,
    })
    .returning();

  if (!row) {
    return jsonError(500, 'insert_failed', 'Failed to create vehicle.');
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
    retiredAt: row.retiredAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };

  return {
    statusCode: 201,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(response),
  };
};

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
