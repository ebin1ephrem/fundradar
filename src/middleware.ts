import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, VISITOR_COOKIE } from "@/lib/auth/cookie-names";

const VISITOR_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Two jobs, both cheap enough for the edge:
 *
 * 1. Keep unauthenticated traffic out of an admin render. This is a cookie
 *    presence check only — session validity is re-checked against the database
 *    inside every admin page and server action.
 * 2. Mint an anonymous id for public visitors so their browsing can be stitched
 *    to a lead later. No database row is created until there is something to
 *    record, and the id carries no personal data.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const userAgent = request.headers.get("user-agent")?.toLowerCase() ?? "";

  // GPTBot followed faceted opportunity links every few seconds and exhausted
  // the database operation allowance in less than a day. Reject it at the
  // edge, before a page render can open a database connection. This does not
  // affect normal visitors or search-engine crawlers.
  if (userAgent.includes("gptbot")) {
    return new NextResponse(null, {
      status: 403,
      headers: { "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  if (pathname.startsWith("/admin")) {
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

  const response = NextResponse.next();
  if (!request.cookies.get(VISITOR_COOKIE)?.value) {
    response.cookies.set(VISITOR_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: VISITOR_MAX_AGE,
    });
  }
  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, image optimisation and metadata files.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?)$).*)",
  ],
};
