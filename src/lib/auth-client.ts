import appConfig from "@/config/appConfig";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: (appConfig.apiBaseUrl || "http://localhost:3001") + "/api/auth",
});
