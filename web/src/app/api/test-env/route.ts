import { NextResponse } from 'next/server';

import { getCognitoConfig } from '@/lib/env';

export async function GET() {
  try {
    const config = getCognitoConfig();
    return NextResponse.json({
      ok: true,
      region: config.region,
      userPoolId: config.userPoolId,
      clientId: config.clientId.slice(0, 4) + '...',
      domainUrl: config.domainUrl,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
