import { getBasePath } from "@/lib/config";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { PREFIX_TOKEN } from "./lib/api/auth";

const PUBLIC_PATH = ["/auth", "/login", "/cookie-policy"];

function stripBasePath(pathname: string, basePath: string): string {
  if (!basePath) return pathname;
  if (pathname === basePath) return "/";
  if (pathname.startsWith(`${basePath}/`)) {
    return pathname.slice(basePath.length) || "/";
  }
  return pathname;
}

export async function middleware(request: NextRequest) {
  const originalPathname = request.nextUrl.pathname;
  const basePath = getBasePath();
  const pathname = stripBasePath(originalPathname, basePath);

  const isPublic = PUBLIC_PATH.some((path) => pathname.startsWith(path));

  if (!isPublic) {
    const accessToken = request.cookies.get(PREFIX_TOKEN + "access")?.value;
    if (!accessToken) {
      const redirectLoginPageResponse = NextResponse.redirect(
        new URL(`${basePath}/auth/login`, request.url),
      );
      redirectLoginPageResponse.cookies.delete(PREFIX_TOKEN + "user");
      redirectLoginPageResponse.cookies.delete(PREFIX_TOKEN + "refresh");
      redirectLoginPageResponse.cookies.delete(PREFIX_TOKEN + "access");
      return redirectLoginPageResponse;
    }

    // Admin authorization is enforced server-side by backend API routes.
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _next/internal (internal files)
     * - _next/src (source files)
     * - favicon.ico (favicon file)
     * - .well-known (security files)
     */
    "/((?!api/|_next/|favicon.ico|fonts/|images/|src/|.well-known/).*)",
  ],
};
