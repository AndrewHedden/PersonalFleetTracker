import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Returns the names of all cookies the browser sent on this request.
 * Used to verify whether the browser actually has session cookies when
 * DevTools shows the cookie jar empty (bypassing any UI-side filtering).
 */
export async function GET() {
  const store = await cookies();
  const names = store.getAll().map((c) => ({ name: c.name, len: c.value.length }));
  return NextResponse.json({ cookies: names, count: names.length });
}
