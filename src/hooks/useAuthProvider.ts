import { getAccessToken } from "@/lib/api/util";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCallback, useState } from "react";
import useAuth from "./use-auth";

export function useAuthProvider() {
  const { user } = useAuthStore();
  const { getMe } = useAuth();
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      setIsLoadingUser(true);
      const accessToken = await getAccessToken();
      if (!accessToken) {
        return;
      }

      if (useAuthStore.getState().user) {
        return;
      }

      await getMe();
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setIsLoadingUser(false);
      setHasCheckedAuth(true);
    }
  }, []);

  const isAdmin = user?.roles?.includes("admin") ?? false;

  return {
    checkAuth,
    user,
    isLoadingUser: isLoadingUser || !hasCheckedAuth,
    isAdmin,
  };
}
