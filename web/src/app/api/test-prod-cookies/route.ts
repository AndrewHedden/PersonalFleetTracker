import { NextResponse } from 'next/server';

/**
 * Mirrors sign-in's response shape exactly — redirect to a Cognito-shaped URL,
 * two cookies with Secure: true + maxAge, just like sign-in produces. No
 * arctic, no env reads. If this works while sign-in doesn't, the failure is
 * upstream of the response construction.
 */
export async function GET() {
  const fakeUrl =
    'https://stablebook-andrew.auth.us-east-1.amazoncognito.com/oauth2/authorize?response_type=code&client_id=4ikt4vl47ugh8u17s02oaakrgi&redirect_uri=https%3A%2F%2Fmain.d3gmb1eaiag2ib.amplifyapp.com%2Fapi%2Fauth%2Fcallback&scope=openid+email+profile&state=aaaaaaaabbbbbbbbccccccccdddddddd&code_challenge=AAAAAAAABBBBBBBBCCCCCCCCDDDDDDDDEEEEEEEEFFF&code_challenge_method=S256';

  const response = NextResponse.redirect(fakeUrl, { status: 302 });
  const opts = { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/', maxAge: 600 };
  response.cookies.set('test_state', 'aaaaaaaabbbbbbbbccccccccdddddddd', opts);
  response.cookies.set('test_verifier', 'aaaaaaaabbbbbbbbccccccccddddddddeeeeeeeeffff', opts);
  return response;
}
