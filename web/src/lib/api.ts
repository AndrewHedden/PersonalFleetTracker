import 'server-only';

import { cookies } from 'next/headers';
import { Resource } from 'sst';

/**
 * Server-side helper for calling the Stablebook API as the current user.
 *
 * Pulls the access-token cookie set by `/api/auth/callback`, forwards it as
 * a Bearer to API Gateway, which validates the JWT against Cognito before
 * the Lambda even runs. `cache: 'no-store'` because vehicles are per-user
 * data — never safe to cache cross-request.
 *
 * If there's no access-token cookie, throws `UnauthenticatedError`. Server
 * components should let it propagate to a redirect or 401 boundary; route
 * handlers should map it to a 401 response.
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

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const store = await cookies();
  const accessToken = store.get('sb_access')?.value;
  if (!accessToken) throw new UnauthenticatedError();

  const res = await fetch(`${Resource.Api.url}${path}`, {
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
