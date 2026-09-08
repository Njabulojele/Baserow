import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Public routes — no auth required.
 * Everything else is protected by Clerk.
 */
const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/register(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhook(.*)",
  "/api/health(.*)",
  "/api/trpc(.*)", // tRPC is proxied to Go; Go handles its own auth
  "/api/sessions(.*)",
  "/api/v1(.*)",
  "/api/tracklog(.*)",
  "/_next(.*)",
  "/favicon(.*)",
  "/manifest(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
  return NextResponse.next();
});

export const config = {
  runtime: "nodejs",
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
