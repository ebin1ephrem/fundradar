import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/lib/auth/cookie-names";

/**
 * Keep unauthenticated traffic out of an admin render. This is a cookie
 *    presence check only — session validity is re-checked against the database
 *    inside every admin page and server action.
 *
 * Public traffic deliberately bypasses middleware. Anonymous identity is
 * created lazily by `/api/track`, only when a browser records an event.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/admin/login" || pathname.startsWith("/admin/logout")) {
    return NextResponse.next();
  }
  if (!request.cookies.get(ADMIN_COOKIE)?.value) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
