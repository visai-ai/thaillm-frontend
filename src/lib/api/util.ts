import { User } from "@/@types/backend-api";
import axios, { AxiosResponse } from "axios";
import { PREFIX_TOKEN } from "./auth";

import CookieStorage from "../persistance/cookie";

export type ApiErrorResponse = {
  error: string;
  timestamp: string;
  code: string;
  details?: {
    field?: string;
    message?: string;
  };
};

export type ApiResponse<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; data: ApiErrorResponse };

export const handleResponse = <T>(res: AxiosResponse<T>): ApiResponse<T> => {
  return { ok: true, status: res.status, data: res.data };
};

export const handleError = (error: unknown): ApiResponse<never> => {
  if (axios.isAxiosError(error)) {
    return {
      ok: false,
      status: error.response?.status || 500,
      data: error.response?.data || { error: "Unknown error" },
    };
  } else {
    return {
      ok: false,
      status: 500,
      data: {
        error: "Unexpected error",
        timestamp: new Date().toISOString(),
        code: "UNEXPECTED_ERROR",
      } as ApiErrorResponse,
    };
  }
};

const isServer = () => typeof window === "undefined";
export const getUser = async (): Promise<User | null> => {
  const safeParseJson = (data: string): User | null => {
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  };

  if (isServer()) {
    const { cookies } = await import("next/headers");
    const user = (await cookies()).get(PREFIX_TOKEN + "user")?.value;
    return user ? safeParseJson(user) : null;
  } else {
    const CookieStorage = await import("../persistance/cookie").then(
      (m) => m.default,
    );
    const persistanceStorage = new CookieStorage();
    const user =
      (await persistanceStorage.getItem(PREFIX_TOKEN + "user")) ?? "";
    return user ? safeParseJson(user) : null;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (isServer()) {
    const { cookies } = await import("next/headers");
    const accessToken = (await cookies()).get(PREFIX_TOKEN + "access")?.value;
    return accessToken || null;
  } else {
    const persistanceStorage = new CookieStorage();
    return persistanceStorage.getItem(PREFIX_TOKEN + "access");
  }
};

export const getRefreshToken = async (): Promise<string | null> => {
  if (isServer()) {
    const { cookies } = await import("next/headers");
    const refreshToken = (await cookies()).get(PREFIX_TOKEN + "refresh")?.value;
    return refreshToken || null;
  } else {
    const persistanceStorage = new CookieStorage();
    return persistanceStorage.getItem(PREFIX_TOKEN + "refresh");
  }
};

export const setAccessToken = async (token: string): Promise<void> => {
  if (isServer()) {
    const { cookies } = await import("next/headers");
    (await cookies()).set(PREFIX_TOKEN + "access", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
  } else {
    const persistanceStorage = new CookieStorage();
    return persistanceStorage.setItem(PREFIX_TOKEN + "access", token);
  }
};

export const setRefreshToken = async (token: string): Promise<void> => {
  if (isServer()) {
    const { cookies } = await import("next/headers");
    (await cookies()).set(PREFIX_TOKEN + "refresh", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
  } else {
    const persistanceStorage = new CookieStorage();
    return persistanceStorage.setItem(PREFIX_TOKEN + "refresh", token);
  }
};
