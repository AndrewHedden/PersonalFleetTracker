import { NextResponse } from 'next/server';

export async function GET() {
  const response = NextResponse.json({ status: 'ok' });
  response.cookies.set('test_a', 'value_a', { httpOnly: true, sameSite: 'lax', path: '/' });
  response.cookies.set('test_b', 'value_b', { httpOnly: true, sameSite: 'lax', path: '/' });
  return response;
}
