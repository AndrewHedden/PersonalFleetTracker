import { CreateVehicleInputSchema, type Vehicle } from '@stablebook/shared';
import type { NextRequest } from 'next/server';

import { apiFetch, ApiError, UnauthenticatedError } from '@/lib/api';

/**
 * POST /api/vehicles — proxy from the browser to the backend `POST /v1/vehicles`.
 *
 * Exists because Next.js 16 server actions (over multipart/form-data) don't
 * reliably forward the user's `sb_access` cookie through CloudFront/OpenNext
 * in our setup — the cookie header arrives empty at the Lambda. Route handlers
 * read cookies normally, so we use this as the form's submit target instead.
 *
 * Validates against `CreateVehicleInputSchema` (the same shape the API uses),
 * forwards the validated body via the server-side `apiFetch` helper which
 * adds the Bearer header.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'invalid_json', 'Request body must be valid JSON.');
  }

  const parsed = CreateVehicleInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      'invalid_input',
      'Request body does not match the schema.',
      parsed.error.flatten(),
    );
  }

  try {
    const created = await apiFetch<Vehicle>('/v1/vehicles', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
    return Response.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return jsonError(401, 'unauthenticated', 'Sign in required.');
    }
    if (err instanceof ApiError) {
      return jsonError(err.status, 'api_error', err.body || 'API request failed.');
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonError(500, 'internal_error', message);
  }
}

function jsonError(status: number, code: string, message: string, details?: unknown) {
  return Response.json({ error: code, message, ...(details ? { details } : {}) }, { status });
}
