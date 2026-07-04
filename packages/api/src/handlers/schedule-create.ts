import { maintenanceSchedules, maintenanceTasks, vehicles } from '@stablebook/db';
import { CreateScheduleInputSchema, type MaintenanceSchedule } from '@stablebook/shared';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { and, eq, isNull, or } from 'drizzle-orm';

import { getDb } from '../db';
import { enrichSchedules } from '../reminders';
import { getOrCreateUser } from '../users';

/**
 * POST /v1/vehicles/{id}/schedules — add a maintenance schedule (task + mileage
 * and/or month interval). Task must be visible to the caller; one schedule per
 * (vehicle, task) — a duplicate is 409. Returns the created schedule with status.
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

  const parsed = CreateScheduleInputSchema.safeParse(raw);
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
    return jsonError(404, 'not_found', 'Vehicle not found.');
  }

  const i = parsed.data;
  const [task] = await db
    .select({ id: maintenanceTasks.id, name: maintenanceTasks.name })
    .from(maintenanceTasks)
    .where(
      and(
        eq(maintenanceTasks.id, i.taskId),
        or(isNull(maintenanceTasks.userId), eq(maintenanceTasks.userId, user.id)),
      ),
    );
  if (!task) {
    return jsonError(400, 'invalid_task', 'Task is unknown.');
  }

  let row;
  try {
    [row] = await db
      .insert(maintenanceSchedules)
      .values({
        vehicleId,
        taskId: i.taskId,
        intervalMiles: i.intervalMiles ?? null,
        intervalMonths: i.intervalMonths ?? null,
      })
      .returning();
  } catch (err) {
    if (isUniqueViolation(err)) {
      return jsonError(
        409,
        'duplicate_schedule',
        'This task already has a schedule on this vehicle.',
      );
    }
    throw err;
  }
  if (!row) {
    return jsonError(500, 'insert_failed', 'Failed to create schedule.');
  }

  const [enriched] = await enrichSchedules(db, vehicle, [{ ...row, taskName: task.name }]);
  const response: MaintenanceSchedule = enriched!;

  return {
    statusCode: 201,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(response),
  };
};

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === '23505';
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
