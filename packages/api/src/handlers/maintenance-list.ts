import {
  maintenanceEntries,
  maintenanceEntryTasks,
  maintenanceTasks,
  vehicles,
} from '@stablebook/db';
import type { ListMaintenanceEntriesResponse, MaintenanceTask } from '@stablebook/shared';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { and, desc, eq, inArray } from 'drizzle-orm';

import { getDb } from '../db';
import { getOrCreateUser } from '../users';

/**
 * GET /v1/vehicles/{id}/maintenance — list maintenance entries for one of the
 * caller's vehicles, newest first, each with the tasks performed. Tasks are
 * resolved with a single joined query over the page's entry ids (no N+1).
 * 404 (not 403) if the vehicle isn't theirs, to avoid leaking which ids exist.
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
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(and(eq(vehicles.id, vehicleId), eq(vehicles.userId, user.id)));
  if (!vehicle) {
    return jsonError(404, 'not_found', 'Vehicle not found.');
  }

  const entries = await db
    .select()
    .from(maintenanceEntries)
    .where(eq(maintenanceEntries.vehicleId, vehicleId))
    .orderBy(desc(maintenanceEntries.entryDate), desc(maintenanceEntries.createdAt));

  // Resolve tasks for all entries in one query, then group by entry id.
  const tasksByEntry = new Map<string, MaintenanceTask[]>();
  if (entries.length > 0) {
    const joined = await db
      .select({
        entryId: maintenanceEntryTasks.entryId,
        id: maintenanceTasks.id,
        userId: maintenanceTasks.userId,
        name: maintenanceTasks.name,
        description: maintenanceTasks.description,
      })
      .from(maintenanceEntryTasks)
      .innerJoin(maintenanceTasks, eq(maintenanceEntryTasks.taskId, maintenanceTasks.id))
      .where(
        inArray(
          maintenanceEntryTasks.entryId,
          entries.map((e) => e.id),
        ),
      );

    for (const r of joined) {
      const list = tasksByEntry.get(r.entryId) ?? [];
      list.push({ id: r.id, userId: r.userId, name: r.name, description: r.description });
      tasksByEntry.set(r.entryId, list);
    }
  }

  const response: ListMaintenanceEntriesResponse = {
    entries: entries.map((e) => ({
      id: e.id,
      vehicleId: e.vehicleId,
      entryDate: e.entryDate,
      odometer: e.odometer,
      totalCost: e.totalCost,
      shopName: e.shopName,
      notes: e.notes,
      tasks: tasksByEntry.get(e.id) ?? [],
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })),
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

function jsonError(statusCode: number, code: string, message: string): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ error: code, message }),
  };
}
