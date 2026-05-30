import { maintenanceTasks } from '@stablebook/db';
import { CreateMaintenanceTaskInputSchema, type MaintenanceTask } from '@stablebook/shared';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';

import { getDb } from '../db';
import { getOrCreateUser } from '../users';

/**
 * POST /v1/maintenance-tasks — create a custom task owned by the caller. The
 * per-user partial unique index (`maintenance_tasks_user_name_uq`) prevents
 * duplicate names per user; we surface that collision as 409.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  if (!event.body) {
    return jsonError(400, 'missing_body', 'Request body is required.');
  }

  let raw: unknown;
  try {
    raw = JSON.parse(event.body);
  } catch {
    return jsonError(400, 'invalid_json', 'Request body must be valid JSON.');
  }

  const parsed = CreateMaintenanceTaskInputSchema.safeParse(raw);
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
  const i = parsed.data;

  let row;
  try {
    [row] = await db
      .insert(maintenanceTasks)
      .values({
        userId: user.id,
        name: i.name,
        description: i.description ?? null,
      })
      .returning();
  } catch (err) {
    if (isUniqueViolation(err)) {
      return jsonError(409, 'duplicate_task', `You already have a task named "${i.name}".`);
    }
    throw err;
  }

  if (!row) {
    return jsonError(500, 'insert_failed', 'Failed to create task.');
  }

  const response: MaintenanceTask = {
    id: row.id,
    userId: row.userId,
    name: row.name,
    description: row.description,
  };

  return {
    statusCode: 201,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(response),
  };
};

/** Postgres unique-violation SQLSTATE. */
function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === '23505';
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
