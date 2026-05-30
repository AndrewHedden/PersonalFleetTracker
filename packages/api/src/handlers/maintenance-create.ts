import {
  maintenanceEntries,
  maintenanceEntryTasks,
  maintenanceTasks,
  vehicles,
} from '@stablebook/db';
import { CreateMaintenanceEntryInputSchema, type MaintenanceEntry } from '@stablebook/shared';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { and, eq, inArray, isNull, or } from 'drizzle-orm';

import { getDb } from '../db';
import { getOrCreateUser } from '../users';

/**
 * POST /v1/vehicles/{id}/maintenance — log a completed service on one of the
 * caller's vehicles. Validates that every task id is visible to the caller
 * (system task or their own), then inserts the entry and its task links in a
 * single transaction. Returns the created entry with its resolved tasks.
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

  const parsed = CreateMaintenanceEntryInputSchema.safeParse(raw);
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
  const uniqueTaskIds = [...new Set(i.taskIds)];

  // Resolve the tasks, scoped to what the caller can see (system + own). Any
  // id that doesn't come back is unknown or not theirs → reject the whole entry.
  const taskRows = await db
    .select()
    .from(maintenanceTasks)
    .where(
      and(
        inArray(maintenanceTasks.id, uniqueTaskIds),
        or(isNull(maintenanceTasks.userId), eq(maintenanceTasks.userId, user.id)),
      ),
    );

  if (taskRows.length !== uniqueTaskIds.length) {
    return jsonError(400, 'invalid_tasks', 'One or more tasks are unknown.');
  }

  const entry = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(maintenanceEntries)
      .values({
        vehicleId,
        entryDate: i.entryDate,
        odometer: i.odometer,
        totalCost: i.totalCost !== undefined ? i.totalCost.toFixed(2) : null,
        shopName: i.shopName ?? null,
        notes: i.notes ?? null,
      })
      .returning();

    if (!row) {
      throw new Error('Failed to insert maintenance entry.');
    }

    await tx
      .insert(maintenanceEntryTasks)
      .values(uniqueTaskIds.map((taskId) => ({ entryId: row.id, taskId })));

    return row;
  });

  const response: MaintenanceEntry = {
    id: entry.id,
    vehicleId: entry.vehicleId,
    entryDate: entry.entryDate,
    odometer: entry.odometer,
    totalCost: entry.totalCost,
    shopName: entry.shopName,
    notes: entry.notes,
    tasks: taskRows.map((t) => ({
      id: t.id,
      userId: t.userId,
      name: t.name,
      description: t.description,
    })),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
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
