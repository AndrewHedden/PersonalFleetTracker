import { maintenanceSchedules, maintenanceTasks, vehicles } from '@stablebook/db';
import type { RemindersSummaryResponse } from '@stablebook/shared';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { eq } from 'drizzle-orm';

import { getDb } from '../db';
import { enrichSchedules } from '../reminders';
import { getOrCreateUser } from '../users';

/**
 * GET /v1/reminders — per-vehicle due/overdue counts across all the caller's
 * vehicles, for the dashboard roll-up. Only vehicles with at least one schedule
 * are returned.
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
  const ownVehicles = await db
    .select({
      id: vehicles.id,
      nickname: vehicles.nickname,
      purchaseOdometer: vehicles.purchaseOdometer,
      purchaseDate: vehicles.purchaseDate,
    })
    .from(vehicles)
    .where(eq(vehicles.userId, user.id));

  const summary: RemindersSummaryResponse['vehicles'] = [];
  for (const vehicle of ownVehicles) {
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
      .where(eq(maintenanceSchedules.vehicleId, vehicle.id));

    if (rows.length === 0) continue;

    const enriched = await enrichSchedules(db, vehicle, rows);
    summary.push({
      vehicleId: vehicle.id,
      nickname: vehicle.nickname,
      dueSoon: enriched.filter((s) => s.status === 'due_soon').length,
      overdue: enriched.filter((s) => s.status === 'overdue').length,
    });
  }

  const response: RemindersSummaryResponse = { vehicles: summary };

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(response),
  };
};
