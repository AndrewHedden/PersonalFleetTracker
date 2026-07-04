import { maintenanceSchedules, maintenanceTasks, vehicles } from '@stablebook/db';
import type { ListSchedulesResponse } from '@stablebook/shared';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { and, eq } from 'drizzle-orm';

import { getDb } from '../db';
import { enrichSchedules } from '../reminders';
import { getOrCreateUser } from '../users';

/**
 * GET /v1/vehicles/{id}/schedules — maintenance schedules for the vehicle, each
 * enriched with computed due status. 404 if the vehicle isn't the caller's.
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
    .select({
      id: vehicles.id,
      purchaseOdometer: vehicles.purchaseOdometer,
      purchaseDate: vehicles.purchaseDate,
    })
    .from(vehicles)
    .where(and(eq(vehicles.id, vehicleId), eq(vehicles.userId, user.id)));
  if (!vehicle) {
    return jsonError(404, 'not_found', 'Vehicle not found.');
  }

  const rows = await db
    .select({
      id: maintenanceSchedules.id,
      vehicleId: maintenanceSchedules.vehicleId,
      taskId: maintenanceSchedules.taskId,
      taskName: maintenanceTasks.name,
      intervalMiles: maintenanceSchedules.intervalMiles,
      intervalMonths: maintenanceSchedules.intervalMonths,
      createdAt: maintenanceSchedules.createdAt,
      updatedAt: maintenanceSchedules.updatedAt,
    })
    .from(maintenanceSchedules)
    .innerJoin(maintenanceTasks, eq(maintenanceSchedules.taskId, maintenanceTasks.id))
    .where(eq(maintenanceSchedules.vehicleId, vehicleId));

  const response: ListSchedulesResponse = { schedules: await enrichSchedules(db, vehicle, rows) };

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
