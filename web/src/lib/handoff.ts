import 'server-only';

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Stateless sign-in → cookie handoff via an encrypted URL token.
 *
 * Why: Safari and Chrome silently evict cookies set on responses to form
 * POSTs (verified across both browsers: cookies present on the immediate
 * redirect target, gone on the next request). The pattern that DOES persist
 * cookies is GET → 30x with Set-Cookie → GET (confirmed via the
 * test-callback-mock experiment).
 *
 * Solution: the sign-in POST handler encrypts the freshly-issued Cognito
 * tokens into a URL-safe blob and redirects to /api/auth/establish?h=<blob>.
 * Establish is a GET that decrypts, sets cookies on its own 302 response,
 * and redirects to /dashboard. The cookie-setting response is now part of a
 * GET → GET chain that browsers persist normally.
 *
 * Security:
 *   - Tokens are encrypted with AES-256-GCM using a per-deployment secret
 *     (env var HANDOFF_SECRET, 32 random bytes base64-encoded).
 *   - The blob is one-time-use in practice — establish immediately swaps it
 *     for HttpOnly cookies and redirects to a cookie-bearing URL.
 *   - The handoff URL never appears in browser history (browsers omit
 *     intermediate redirect targets from back-forward navigation).
 *   - Server logs may capture the URL, but the blob is encrypted and useless
 *     without HANDOFF_SECRET.
 */

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

function getKey(): Buffer {
  const secret = process.env.HANDOFF_SECRET;
  if (!secret) {
    throw new Error('HANDOFF_SECRET env var not set');
  }
  const key = Buffer.from(secret, 'base64');
  if (key.length !== 32) {
    throw new Error(
      `HANDOFF_SECRET must decode to exactly 32 bytes (got ${key.length}). Generate with: ` +
        `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`,
    );
  }
  return key;
}

export interface HandoffPayload {
  accessToken: string;
  idToken: string;
  /** Lifetime of the access token in seconds at issue time. */
  expiresIn: number;
  /** Unix seconds at which the handoff was created. Used to reject stale handoffs. */
  issuedAt: number;
}

/** Encrypt a handoff payload for placement in a URL query parameter. */
export function encodeHandoff(payload: HandoffPayload): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64url');
}

/**
 * Decrypt + parse a handoff token. Returns null if the blob is malformed,
 * the auth tag fails, or the payload is older than 60 seconds (an arbitrary
 * but generous bound — the establish redirect happens within milliseconds in
 * practice, so anything older is almost certainly stale or replayed).
 */
export function decodeHandoff(token: string): HandoffPayload | null {
  try {
    const key = getKey();
    const data = Buffer.from(token, 'base64url');
    if (data.length < IV_BYTES + AUTH_TAG_BYTES) return null;
    const iv = data.subarray(0, IV_BYTES);
    const authTag = data.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES);
    const ciphertext = data.subarray(IV_BYTES + AUTH_TAG_BYTES);
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
      'utf8',
    );
    const payload = JSON.parse(plaintext) as HandoffPayload;
    if (typeof payload.accessToken !== 'string' || typeof payload.idToken !== 'string') return null;
    const ageSeconds = Math.floor(Date.now() / 1000) - payload.issuedAt;
    if (ageSeconds > 60 || ageSeconds < -5) return null;
    return payload;
  } catch {
    return null;
  }
}
