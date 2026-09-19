import { type NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";

const protectedPrefixes = [
  "/dashboard",
  "/tasks",
  "/analytics",
  "/work",
  "/clients",
  "/cashflow",
  "/reports",
  "/settings",
  "/admin",
];

const authOnlyPaths = ["/auth/login", "/auth/forgot-password", "/auth/reset-password"];

export async function proxy(request: NextRequest) {
  const user = await getSessionFromRequest(request);
  const { pathname } = request.nextUrl;

  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (isProtected && !user) {
    const login = new URL("/auth/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  const isAuthOnly = authOnlyPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  if (user && isAuthOnly) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

