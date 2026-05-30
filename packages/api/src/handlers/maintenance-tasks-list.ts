import { maintenanceTasks } from '@stablebook/db';
import type { ListMaintenanceTasksResponse } from '@stablebook/shared';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { asc, isNull, or, eq } from 'drizzle-orm';

import { getDb } from '../db';
import { getOrCreateUser } from '../users';

/**
 * GET /v1/maintenance-tasks — the task catalog visible to the caller: the
 * seeded system tasks (`user_id IS NULL`) plus the caller's own custom tasks.
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
    .from(maintenanceTasks)
    .where(or(isNull(maintenanceTasks.userId), eq(maintenanceTasks.userId, user.id)))
    .orderBy(asc(maintenanceTasks.name));

  const response: ListMaintenanceTasksResponse = {
    tasks: rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      name: row.name,
      description: row.description,
    })),
  };

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(response),
  };
};
