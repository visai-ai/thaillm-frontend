"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthProvider } from "@/hooks/useAuthProvider";
import { LoadingFullScreen } from "../common/Loading";

export const AuthProvider = ({
  children,
  requireAdmin = false,
}: Readonly<{
  children: React.ReactNode;
  requireAdmin?: boolean;
}>) => {
  const { checkAuth, user, isLoadingUser, isAdmin } = useAuthProvider();
  const router = useRouter();

  useEffect(() => {
    const authenticate = async () => {
      await checkAuth();
    };

    authenticate();
  }, [checkAuth]);

  useEffect(() => {
    if (isLoadingUser) return;

    if (!user) {
      router.push("/auth/login");
      return;
    }

    // Check admin role if required
    if (requireAdmin && !isAdmin) {
      router.push("/auth/login");
      return;
    }
  }, [user, isLoadingUser, isAdmin, requireAdmin, router]);

  if (isLoadingUser) {
    return <LoadingFullScreen />;
  }

  if (!user) {
    return null;
  }

  // For admin routes, check admin role before rendering
  if (requireAdmin && !isAdmin) {
    return null;
  }

  return <>{children}</>;
};
