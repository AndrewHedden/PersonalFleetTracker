import { SignInInputSchema, type SignInResponse } from '@stablebook/shared';
import { NextResponse, type NextRequest } from 'next/server';

import { initiateAuth } from '@/lib/cognito';

import { authErrorFromCognito, badInput } from '../_helpers';

/**
 * POST handler that authenticates with Cognito and returns the tokens in a
 * JSON body. The client stashes them in localStorage and sends them to API
 * routes via the Authorization header.
 *
 * Why not HttpOnly cookies: in this project's deployment, Safari and Chrome
 * silently evict cookies set on responses to navigations in our flow,
 * regardless of the cookie pattern (Hosted UI, custom domain, XHR, form POST
 * + 303, GET handoff). Switching to localStorage trades HttpOnly XSS
 * protection for reliable persistence; XSS risk is mitigated by strict CSP
 * and careful input handling on render boundaries.
 */
export async function POST(request: NextRequest) {
  const parsed = SignInInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badInput(parsed.error);

  try {
    const tokens = await initiateAuth(parsed.data.email, parsed.data.password);
    const body: SignInResponse = {
      accessToken: tokens.accessToken,
      idToken: tokens.idToken,
      expiresIn: tokens.expiresIn,
    };
    return NextResponse.json(body);
  } catch (err) {
    return authErrorFromCognito(err, 'sign-in');
  }
}
