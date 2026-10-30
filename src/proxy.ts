import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: pages need the auth cookie; the backend verifies the token on every call.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("sl_token")) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  // Not /api (proxied to the backend, must not buffer large uploads), not assets or icons, not /login.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon|creacon-|login).*)"],
};
