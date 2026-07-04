import type { RemindersSummaryResponse } from '@stablebook/shared';
import type { NextRequest } from 'next/server';

import { apiFetch, ApiError, UnauthenticatedError, bearerFromRequest } from '@/lib/api';

/** GET /api/reminders — per-vehicle due/overdue counts for the dashboard. */
export async function GET(request: NextRequest) {
  const token = bearerFromRequest(request);
  try {
    const body = await apiFetch<RemindersSummaryResponse>(token, '/v1/reminders');
    return Response.json(body);
  } catch (err) {
    if (err instanceof UnauthenticatedError)
      return jsonError(401, 'unauthenticated', 'Sign in required.');
    if (err instanceof ApiError)
      return jsonError(err.status, 'api_error', err.body || 'API request failed.');
    return jsonError(500, 'internal_error', err instanceof Error ? err.message : 'Unknown error');
  }
}

function jsonError(status: number, code: string, message: string) {
  return Response.json({ error: code, message }, { status });
}
