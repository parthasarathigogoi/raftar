import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (Next.js 16's renamed middleware).
 *
 * App Router layouts cannot read the current pathname, so we forward it as a
 * request header. The admin layout uses it to render `/admin/login` without the
 * signed-in shell. The header is always overwritten from the real URL, so a
 * client-supplied value can never be used to bypass the admin guard.
 */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-raftar-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
