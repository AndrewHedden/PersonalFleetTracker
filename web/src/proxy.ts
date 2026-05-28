import { NextResponse, type NextRequest } from 'next/server';

/**
 * Edge-runtime proxy that gates protected routes on the presence of an
 * access-token cookie. The actual JWT signature verification happens later in
 * the protected page's server component via `getSession()` — this proxy is a
 * fast first-pass to redirect obvious unauthenticated requests without pulling
 * the AWS JWKS into the edge bundle.
 *
 * A cookie can be present-but-invalid; the page-level check is what enforces
 * trust. Browsers send the cookie automatically because it was set HttpOnly +
 * SameSite=Lax with path=/.
 *
 * (Named `proxy` per Next.js 16's rename from `middleware`.)
 */
const PROTECTED_PREFIXES = ['/dashboard'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!isProtected) return NextResponse.next();

  const accessToken = request.cookies.get('sb_access')?.value;
  if (!accessToken) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = '/';
    signIn.searchParams.set('signin', 'required');
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/dashboard'],
};
