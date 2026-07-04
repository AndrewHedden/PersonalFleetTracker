import { maintenanceSchedules, vehicles } from '@stablebook/db';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { and, eq } from 'drizzle-orm';

import { getDb } from '../db';
import { getOrCreateUser } from '../users';

/**
 * DELETE /v1/vehicles/{id}/schedules/{scheduleId} — remove a maintenance
 * schedule. 404 if the vehicle isn't the caller's or the schedule isn't on it.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  const vehicleId = event.pathParameters?.id;
  const scheduleId = event.pathParameters?.scheduleId;
  if (!vehicleId || !isUuid(vehicleId) || !scheduleId || !isUuid(scheduleId)) {
    return jsonError(404, 'not_found', 'Schedule not found.');
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
    return jsonError(404, 'not_found', 'Schedule not found.');
  }

  const [row] = await db
    .delete(maintenanceSchedules)
    .where(
      and(eq(maintenanceSchedules.id, scheduleId), eq(maintenanceSchedules.vehicleId, vehicleId)),
    )
    .returning({ id: maintenanceSchedules.id });

  if (!row) {
    return jsonError(404, 'not_found', 'Schedule not found.');
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
