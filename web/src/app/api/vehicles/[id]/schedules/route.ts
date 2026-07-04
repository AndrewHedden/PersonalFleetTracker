import {
  CreateScheduleInputSchema,
  type ListSchedulesResponse,
  type MaintenanceSchedule,
} from '@stablebook/shared';
import type { NextRequest } from 'next/server';

import { apiFetch, ApiError, UnauthenticatedError, bearerFromRequest } from '@/lib/api';

/**
 * GET  /api/vehicles/:id/schedules — list schedules (with due status).
 * POST /api/vehicles/:id/schedules — add a schedule.
 */

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = bearerFromRequest(request);
  try {
    const body = await apiFetch<ListSchedulesResponse>(
      token,
      `/v1/vehicles/${encodeURIComponent(id)}/schedules`,
    );
    return Response.json(body);
  } catch (err) {
    return mapError(err);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = bearerFromRequest(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'invalid_json', 'Request body must be valid JSON.');
  }

  const parsed = CreateScheduleInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      'invalid_input',
      'Request body does not match the schema.',
      parsed.error.flatten(),
    );
  }

  try {
    const created = await apiFetch<MaintenanceSchedule>(
      token,
      `/v1/vehicles/${encodeURIComponent(id)}/schedules`,
      { method: 'POST', body: JSON.stringify(parsed.data) },
    );
    return Response.json(created, { status: 201 });
  } catch (err) {
    return mapError(err);
  }
}

function mapError(err: unknown): Response {
  if (err instanceof UnauthenticatedError)
    return jsonError(401, 'unauthenticated', 'Sign in required.');
  if (err instanceof ApiError)
    return jsonError(err.status, 'api_error', err.body || 'API request failed.');
  return jsonError(500, 'internal_error', err instanceof Error ? err.message : 'Unknown error');
}

function jsonError(status: number, code: string, message: string, details?: unknown) {
  return Response.json({ error: code, message, ...(details ? { details } : {}) }, { status });
}
