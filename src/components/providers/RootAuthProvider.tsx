"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "./AuthProvider";

const PROTECTED_ROUTES = ["/app", "/developer", "/settings", "/admin"];

export const RootAuthProvider = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const pathname = usePathname() || "";

  // Check if current route is protected
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route),
  );

  // Check if current route requires admin access
  const requireAdmin = pathname.startsWith("/admin");

  // Only apply auth provider to protected routes
  if (!isProtectedRoute) {
    return <>{children}</>;
  }

  return <AuthProvider requireAdmin={requireAdmin}>{children}</AuthProvider>;
};
