import 'server-only';

import { getApiUrl } from './env';

/**
 * Server-side helper for calling the Stablebook backend API as the current
 * user. The access token is passed in by the route handler (extracted from
 * the request's Authorization header — see /api/vehicles/route.ts) rather
 * than read from cookies, because client tokens now live in localStorage and
 * are sent on every XHR via the Authorization: Bearer header.
 *
 * `cache: 'no-store'` because vehicles are per-user data — never safe to
 * cache cross-request.
 */

export class UnauthenticatedError extends Error {
  constructor() {
    super('Not authenticated');
    this.name = 'UnauthenticatedError';
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`API ${status}: ${body || '(empty body)'}`);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  accessToken: string | null,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (!accessToken) throw new UnauthenticatedError();
  const res = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body);
  }
  return (await res.json()) as T;
}

/** Extract a Bearer token from the standard Authorization header. */
export function bearerFromRequest(request: Request): string | null {
  const auth = request.headers.get('authorization');
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}
