/**
 * Client-side token store backed by localStorage.
 *
 * Why localStorage (and the trade-off): in this project's deployment, HttpOnly
 * cookies set on Set-Cookie responses are silently evicted by Safari and
 * Chrome regardless of pattern, so we store Cognito tokens in localStorage
 * and send them via Authorization: Bearer headers. The trade-off is loss of
 * HttpOnly XSS protection — any script with execution in our origin could
 * read the tokens. Mitigations: strict CSP, no untrusted third-party scripts,
 * careful handling at React render boundaries (no `dangerouslySetInnerHTML`
 * over user input).
 */

const ACCESS_KEY = 'sb_access';
const ID_KEY = 'sb_id';
/** Unix-second timestamp at which the access token expires. */
const EXPIRES_AT_KEY = 'sb_expires_at';

export interface StoredSession {
  accessToken: string;
  idToken: string;
  /** Unix seconds at which the access token expires. */
  expiresAt: number;
  /** Best-effort email read from the id token; may be undefined. */
  email?: string;
}

export function saveTokens(input: { accessToken: string; idToken: string; expiresIn: number }) {
  if (typeof window === 'undefined') return;
  const expiresAt = Math.floor(Date.now() / 1000) + input.expiresIn;
  window.localStorage.setItem(ACCESS_KEY, input.accessToken);
  window.localStorage.setItem(ID_KEY, input.idToken);
  window.localStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));
}

export function clearTokens() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(ID_KEY);
  window.localStorage.removeItem(EXPIRES_AT_KEY);
}

/**
 * Read the current session from localStorage. Returns null if no tokens are
 * stored or if the access token is expired (no refresh-token handling yet —
 * user re-signs-in every 60 minutes).
 */
export function readSession(): StoredSession | null {
  if (typeof window === 'undefined') return null;
  const accessToken = window.localStorage.getItem(ACCESS_KEY);
  const idToken = window.localStorage.getItem(ID_KEY);
  const expiresAtStr = window.localStorage.getItem(EXPIRES_AT_KEY);
  if (!accessToken || !idToken || !expiresAtStr) return null;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    clearTokens();
    return null;
  }
  return {
    accessToken,
    idToken,
    expiresAt,
    email: decodeEmailFromIdToken(idToken) ?? undefined,
  };
}

function decodeEmailFromIdToken(idToken: string): string | null {
  try {
    const [, base64] = idToken.split('.');
    if (!base64) return null;
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/'))) as {
      email?: unknown;
    };
    return typeof decoded.email === 'string' ? decoded.email : null;
  } catch {
    return null;
  }
}

/**
 * Make an authenticated request to one of our /api/* proxy routes. The
 * proxy forwards the access token to API Gateway. Returns the parsed JSON
 * response, or throws on non-2xx.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = readSession();
  if (!session) {
    throw new Error('Not signed in');
  }
  const res = await fetch(path, {
    ...init,
    headers: {
      ...init.headers,
      authorization: `Bearer ${session.accessToken}`,
      'content-type': 'application/json',
    },
  });
  if (res.status === 401) {
    clearTokens();
    throw new Error('Session expired');
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body || '(empty body)'}`);
  }
  return (await res.json()) as T;
}
