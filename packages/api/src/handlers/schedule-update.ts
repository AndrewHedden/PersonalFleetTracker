import { maintenanceSchedules, maintenanceTasks, vehicles } from '@stablebook/db';
import { UpdateScheduleInputSchema, type MaintenanceSchedule } from '@stablebook/shared';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { and, eq } from 'drizzle-orm';

import { getDb } from '../db';
import { enrichSchedules } from '../reminders';
import { getOrCreateUser } from '../users';

/**
 * PATCH /v1/vehicles/{id}/schedules/{scheduleId} — update a schedule's mileage /
 * month intervals. At least one interval must remain set (DB check → 400 if not).
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  const vehicleId = event.pathParameters?.id;
  const scheduleId = event.pathParameters?.scheduleId;
  if (!vehicleId || !isUuid(vehicleId) || !scheduleId || !isUuid(scheduleId)) {
    return jsonError(404, 'not_found', 'Schedule not found.');
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

  const parsed = UpdateScheduleInputSchema.safeParse(raw);
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
    .select({
      id: vehicles.id,
      purchaseOdometer: vehicles.purchaseOdometer,
      purchaseDate: vehicles.purchaseDate,
    })
    .from(vehicles)
    .where(and(eq(vehicles.id, vehicleId), eq(vehicles.userId, user.id)));
  if (!vehicle) {
    return jsonError(404, 'not_found', 'Schedule not found.');
  }

  const i = parsed.data;
  const updates: Partial<typeof maintenanceSchedules.$inferInsert> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };
  if (i.intervalMiles !== undefined) updates.intervalMiles = i.intervalMiles ?? null;
  if (i.intervalMonths !== undefined) updates.intervalMonths = i.intervalMonths ?? null;

  let row;
  try {
    [row] = await db
      .update(maintenanceSchedules)
      .set(updates)
      .where(
        and(eq(maintenanceSchedules.id, scheduleId), eq(maintenanceSchedules.vehicleId, vehicleId)),
      )
      .returning();
  } catch (err) {
    if (isCheckViolation(err)) {
      return jsonError(400, 'invalid_intervals', 'A schedule must keep at least one interval.');
    }
    throw err;
  }
  if (!row) {
    return jsonError(404, 'not_found', 'Schedule not found.');
  }

  const [task] = await db
    .select({ name: maintenanceTasks.name })
    .from(maintenanceTasks)
    .where(eq(maintenanceTasks.id, row.taskId));

  const [enriched] = await enrichSchedules(db, vehicle, [{ ...row, taskName: task?.name ?? '' }]);
  const response: MaintenanceSchedule = enriched!;

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(response),
  };
};

function isCheckViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === '23514';
}
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
