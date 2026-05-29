import { SignUpInputSchema } from '@stablebook/shared';
import { NextResponse, type NextRequest } from 'next/server';

import { signUp } from '@/lib/cognito';
import { getAppUrl } from '@/lib/env';

import { extractCognitoErrorCode, parseFormBody } from '../_helpers';

export async function POST(request: NextRequest) {
  const appUrl = getAppUrl(request);
  const body = await parseFormBody(request);

  const parsed = SignUpInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorRedirect(appUrl, 'invalid_input', body.email);
  }

  let userConfirmed = false;
  try {
    ({ userConfirmed } = await signUp(parsed.data.email, parsed.data.password));
  } catch (err) {
    return errorRedirect(appUrl, extractCognitoErrorCode(err, 'sign-up'), parsed.data.email);
  }

  const nextPath = userConfirmed ? '/sign-in' : '/confirm';
  const url = new URL(`${appUrl}${nextPath}`);
  url.searchParams.set('email', parsed.data.email);
  return NextResponse.redirect(url.toString(), { status: 303 });
}

function errorRedirect(
  appUrl: string,
  errorCode: string,
  email: string | null | undefined,
): NextResponse {
  const url = new URL(`${appUrl}/sign-up`);
  url.searchParams.set('error', errorCode);
  if (email) url.searchParams.set('email', email);
  return NextResponse.redirect(url.toString(), { status: 303 });
}
