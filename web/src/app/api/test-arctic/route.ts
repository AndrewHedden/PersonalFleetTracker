import { generateCodeVerifier, generateState } from 'arctic';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    return NextResponse.json({ ok: true, stateLen: state.length, verifierLen: codeVerifier.length });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
