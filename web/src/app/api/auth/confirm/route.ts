import { ConfirmInputSchema } from '@stablebook/shared';
import { NextResponse, type NextRequest } from 'next/server';

import { confirmSignUp } from '@/lib/cognito';
import { getAppUrl } from '@/lib/env';

import { extractCognitoErrorCode, parseFormBody } from '../_helpers';

export async function POST(request: NextRequest) {
  const appUrl = getAppUrl(request);
  const body = await parseFormBody(request);

  const parsed = ConfirmInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorRedirect(appUrl, 'invalid_input', body.email);
  }

  try {
    await confirmSignUp(parsed.data.email, parsed.data.code);
  } catch (err) {
    return errorRedirect(appUrl, extractCognitoErrorCode(err, 'confirm'), parsed.data.email);
  }

  const url = new URL(`${appUrl}/sign-in`);
  url.searchParams.set('email', parsed.data.email);
  url.searchParams.set('confirmed', '1');
  return NextResponse.redirect(url.toString(), { status: 303 });
}

function errorRedirect(
  appUrl: string,
  errorCode: string,
  email: string | null | undefined,
): NextResponse {
  const url = new URL(`${appUrl}/confirm`);
  url.searchParams.set('error', errorCode);
  if (email) url.searchParams.set('email', email);
  return NextResponse.redirect(url.toString(), { status: 303 });
}
