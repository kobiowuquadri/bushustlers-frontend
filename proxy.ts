import { NextResponse, type NextRequest } from "next/server";

// UX guard only: sends visitors without a session cookie to sign-in before rendering the app shell.
// The backend still authenticates every API request; this cookie check is never treated as authorisation.
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("bh_session") || request.cookies.has("__Host-bh_session");
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding"],
};
