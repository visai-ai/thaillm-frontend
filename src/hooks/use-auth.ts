import api from "@/lib/api";
import { PREFIX_TOKEN } from "@/lib/api/auth";
import { clearTokens } from "@/lib/api/authStrategy";
import CookieStorage from "@/lib/persistance/cookie";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter } from "next/navigation";

export const LOGIN_PAGE_URL = "/auth/login";
export const VERIFY_EMAIL_URL = "/auth/verify-email";

const persistanceStorage = new CookieStorage();
const useAuth = () => {
  const router = useRouter();
  const { setUser } = useAuthStore();

  const login = async (email: string, password: string) => {
    const response = await api.auth.login({
      requestBody: {
        email,
        password,
      },
    });
    if (response.ok) {
      await persistanceStorage.setItem(
        PREFIX_TOKEN + "access",
        response.data.token,
      );
      await persistanceStorage.setItem(
        PREFIX_TOKEN + "refresh",
        response.data.refreshToken,
      );
      await persistanceStorage.setItem(
        PREFIX_TOKEN + "user",
        response.data.user,
      );
    }

    return response;
  };

  const getMe = async () => {
    const response = await api.auth.getMe();
    if (response.ok) {
      setUser(response.data);
    }
    return response;
  };

  const resendEmailVerification = async (email: string) => {
    const response = await api.auth.resendEmailVerification({
      requestBody: {
        email,
      },
    });
    return response;
  };

  const registerEmail = async (email: string, password: string) => {
    const response = await api.auth.register({
      requestBody: {
        email,
        password,
      },
    });
    return response;
  };
  const logout = async () => {
    const response = await api.auth.logout();
    await clearTokens();
    return response;
  };
  return { registerEmail, login, getMe, resendEmailVerification, logout };
};

export default useAuth;
