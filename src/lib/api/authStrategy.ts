import { getBasePath } from "@/lib/config";
import auth, { PREFIX_TOKEN } from "./auth";
import { AuthStrategy } from "./axios/instanceWithAuth";
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from "./util";
import CookieStorage from "../persistance/cookie";

const persistanceStorage = new CookieStorage();

export const clearTokens = async () => {
  await persistanceStorage.removeItem(PREFIX_TOKEN + "access");
  await persistanceStorage.removeItem(PREFIX_TOKEN + "refresh");
  await persistanceStorage.removeItem(PREFIX_TOKEN + "user");
};

const authStrategy: AuthStrategy = {
  getAccessToken: async () => await getAccessToken(),
  refreshAccessToken: async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) throw new Error("No refresh token available");

    const response = await auth.refreshToken(refreshToken);
    if (response.ok) {
      setAccessToken(response.data.token);
      setRefreshToken(response.data.refreshToken);
      return response.data.token;
    } else {
      throw new Error("Failed to refresh access token");
    }
  },
  signOut: async () => {
    await clearTokens();
    await auth.logout().catch(() => {});
    window.location.href = getBasePath() + "/auth/login";
  },
  maxRetries: 2,
};

export default authStrategy;
