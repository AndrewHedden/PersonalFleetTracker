import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.redirect('https://example.com', { status: 302 });
}
