import {
  maintenanceEntries,
  maintenanceEntryTasks,
  maintenanceTasks,
  vehicles,
} from '@stablebook/db';
import {
  UpdateMaintenanceEntryInputSchema,
  type MaintenanceEntry,
  type MaintenanceTask,
} from '@stablebook/shared';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { and, eq, inArray, isNull, or } from 'drizzle-orm';

import { getDb } from '../db';
import { getOrCreateUser } from '../users';

/**
 * PATCH /v1/vehicles/{id}/maintenance/{entryId} — update a maintenance entry on
 * one of the caller's vehicles. Only provided entry fields are written. If
 * `taskIds` is present it replaces the entry's full task set (validated against
 * the tasks visible to the caller); when omitted, tasks are left unchanged.
 * 404 if the vehicle isn't theirs or the entry doesn't belong to it.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  const vehicleId = event.pathParameters?.id;
  const entryId = event.pathParameters?.entryId;
  if (!vehicleId || !isUuid(vehicleId) || !entryId || !isUuid(entryId)) {
    return jsonError(404, 'not_found', 'Maintenance entry not found.');
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

  const parsed = UpdateMaintenanceEntryInputSchema.safeParse(raw);
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
    return jsonError(404, 'not_found', 'Maintenance entry not found.');
  }

  const [existing] = await db
    .select({ id: maintenanceEntries.id })
    .from(maintenanceEntries)
    .where(and(eq(maintenanceEntries.id, entryId), eq(maintenanceEntries.vehicleId, vehicleId)));
  if (!existing) {
    return jsonError(404, 'not_found', 'Maintenance entry not found.');
  }

  const i = parsed.data;

  // Resolve + validate the replacement task set (if one was provided).
  let newTaskRows: MaintenanceTask[] | null = null;
  if (i.taskIds !== undefined) {
    const uniqueTaskIds = [...new Set(i.taskIds)];
    const rows = await db
      .select()
      .from(maintenanceTasks)
      .where(
        and(
          inArray(maintenanceTasks.id, uniqueTaskIds),
          or(isNull(maintenanceTasks.userId), eq(maintenanceTasks.userId, user.id)),
        ),
      );
    if (rows.length !== uniqueTaskIds.length) {
      return jsonError(400, 'invalid_tasks', 'One or more tasks are unknown.');
    }
    newTaskRows = rows.map((t) => ({
      id: t.id,
      userId: t.userId,
      name: t.name,
      description: t.description,
    }));
  }

  const updates: Partial<typeof maintenanceEntries.$inferInsert> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };
  if (i.entryDate !== undefined) updates.entryDate = i.entryDate;
  if (i.odometer !== undefined) updates.odometer = i.odometer;
  if (i.totalCost !== undefined) updates.totalCost = i.totalCost.toFixed(2);
  if (i.shopName !== undefined) updates.shopName = i.shopName ?? null;
  if (i.notes !== undefined) updates.notes = i.notes ?? null;

  const entry = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(maintenanceEntries)
      .set(updates)
      .where(eq(maintenanceEntries.id, entryId))
      .returning();
    if (!row) throw new Error('Failed to update maintenance entry.');

    if (newTaskRows !== null) {
      await tx.delete(maintenanceEntryTasks).where(eq(maintenanceEntryTasks.entryId, entryId));
      await tx
        .insert(maintenanceEntryTasks)
        .values(newTaskRows.map((t) => ({ entryId, taskId: t.id })));
    }
    return row;
  });

  // Resolve tasks for the response: the new set if it changed, else the current.
  const tasks =
    newTaskRows ??
    (
      await db
        .select({
          id: maintenanceTasks.id,
          userId: maintenanceTasks.userId,
          name: maintenanceTasks.name,
          description: maintenanceTasks.description,
        })
        .from(maintenanceEntryTasks)
        .innerJoin(maintenanceTasks, eq(maintenanceEntryTasks.taskId, maintenanceTasks.id))
        .where(eq(maintenanceEntryTasks.entryId, entryId))
    ).map((t) => ({ id: t.id, userId: t.userId, name: t.name, description: t.description }));

  const response: MaintenanceEntry = {
    id: entry.id,
    vehicleId: entry.vehicleId,
    entryDate: entry.entryDate,
    odometer: entry.odometer,
    totalCost: entry.totalCost,
    shopName: entry.shopName,
    notes: entry.notes,
    tasks,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
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
