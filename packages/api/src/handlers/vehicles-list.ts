import { vehicles } from '@stablebook/db';
import type { ListVehiclesResponse } from '@stablebook/shared';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { eq } from 'drizzle-orm';

import { getDb } from '../db';
import { getOrCreateUser } from '../users';

/**
 * GET /v1/vehicles — list the authenticated user's vehicles.
 *
 * API Gateway has already verified the JWT signature against the Cognito
 * user pool before this handler runs; an unauthenticated request never gets
 * here (it gets a 401 from the authorizer).
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  const claims = event.requestContext.authorizer.jwt.claims;

  const user = await getOrCreateUser({
    sub: String(claims.sub),
    username: typeof claims.username === 'string' ? claims.username : undefined,
    email: typeof claims.email === 'string' ? claims.email : undefined,
  });

  const db = getDb();
  const rows = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.userId, user.id))
    .orderBy(vehicles.nickname);

  const response: ListVehiclesResponse = {
    vehicles: rows.map((row) => ({
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
      retiredAt: row.retiredAt?.toISOString() ?? null,
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
