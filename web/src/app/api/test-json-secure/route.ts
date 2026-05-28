import { NextResponse } from 'next/server';

export async function GET() {
  const response = NextResponse.json({ status: 'ok' });
  const opts = { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/', maxAge: 600 };
  response.cookies.set('test_secure_a', 'value_a', opts);
  response.cookies.set('test_secure_b', 'value_b', opts);
  return response;
}
