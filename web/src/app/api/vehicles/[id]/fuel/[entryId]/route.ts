import { UpdateFuelEntryInputSchema, type FuelEntry } from '@stablebook/shared';
import type { NextRequest } from 'next/server';

import { apiFetch, ApiError, UnauthenticatedError, bearerFromRequest } from '@/lib/api';

/**
 * PATCH  /api/vehicles/:id/fuel/:entryId — update a fuel entry.
 * DELETE /api/vehicles/:id/fuel/:entryId — delete a fuel entry.
 *
 * Both forward the access token from the incoming Authorization header to the
 * backend API.
 */

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  const { id, entryId } = await params;
  const token = bearerFromRequest(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'invalid_json', 'Request body must be valid JSON.');
  }

  const parsed = UpdateFuelEntryInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      'invalid_input',
      'Request body does not match the schema.',
      parsed.error.flatten(),
    );
  }

  try {
    const updated = await apiFetch<FuelEntry>(
      token,
      `/v1/vehicles/${encodeURIComponent(id)}/fuel/${encodeURIComponent(entryId)}`,
      { method: 'PATCH', body: JSON.stringify(parsed.data) },
    );
    return Response.json(updated);
  } catch (err) {
    return mapError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  const { id, entryId } = await params;
  const token = bearerFromRequest(request);
  try {
    const body = await apiFetch<{ id: string; deleted: boolean }>(
      token,
      `/v1/vehicles/${encodeURIComponent(id)}/fuel/${encodeURIComponent(entryId)}`,
      { method: 'DELETE' },
    );
    return Response.json(body);
  } catch (err) {
    return mapError(err);
  }
}

function mapError(err: unknown): Response {
  if (err instanceof UnauthenticatedError) {
    return jsonError(401, 'unauthenticated', 'Sign in required.');
  }
  if (err instanceof ApiError) {
    return jsonError(err.status, 'api_error', err.body || 'API request failed.');
  }
  const message = err instanceof Error ? err.message : 'Unknown error';
  return jsonError(500, 'internal_error', message);
}

function jsonError(status: number, code: string, message: string, details?: unknown) {
  return Response.json({ error: code, message, ...(details ? { details } : {}) }, { status });
}
