import { type NextRequest, NextResponse } from "next/server";

/**
 * Optimistic gate for /admin: no session cookie → straight to the admin sign-in page.
 * This is only a UX shortcut. Real authorisation happens in the admin layout (server-side role check)
 * and, authoritatively, on every /api/v1/admin/* endpoint in the API.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin/login")) return NextResponse.next();
  if (!request.cookies.get("nifty_session")?.value) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
