import { NextResponse, type NextRequest } from "next/server";

// Lightweight middleware: attach a request ID + baseline security headers.
// Intentionally avoids auth work here — auth lands in apps/web/src/lib/auth.ts
// and is applied per route so the middleware stays fast and observable.
export function middleware(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();

  const res = NextResponse.next({
    request: {
      headers: new Headers([...req.headers, ["x-request-id", requestId]]),
    },
  });

  res.headers.set("x-request-id", requestId);
  res.headers.set("x-content-type-options", "nosniff");
  res.headers.set("x-frame-options", "DENY");
  res.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  res.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");

  return res;
}

export const config = {
  // Skip Next internals + static assets.
  matcher: ["/((?!_next/|favicon.ico|robots.txt).*)"],
};
