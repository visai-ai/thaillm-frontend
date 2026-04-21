import {
  GetAuthMeResponse,
  PostAuthLoginData,
  PostAuthLoginResponse,
  PostAuthLogoutResponse,
  PostAuthRefreshResponse,
  PostAuthRegisterData,
  PostAuthSendVerificationEmailData,
  PostAuthSendVerificationEmailResponse,
} from "@/@types/backend-api";
import axiosInstance from "./axios/instance";
import axiosInstanceWithAuth from "./axios/instanceWithAuth";
import { ApiResponse, handleError, handleResponse } from "./util";

export const PREFIX_TOKEN = "bdi-token-";

const auth = {
  async login(
    reqData: PostAuthLoginData,
  ): Promise<ApiResponse<PostAuthLoginResponse>> {
    const body = reqData.requestBody;
    try {
      const res = await axiosInstance.post<PostAuthLoginResponse>(
        "/auth/login",
        body,
      );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  async register(
    reqData: PostAuthRegisterData,
  ): Promise<ApiResponse<PostAuthRefreshResponse>> {
    const body = reqData.requestBody;
    try {
      const res = await axiosInstance.post<PostAuthLoginResponse>(
        "/auth/register",
        body,
      );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  async getMe(): Promise<ApiResponse<GetAuthMeResponse>> {
    try {
      const res =
        await axiosInstanceWithAuth.get<GetAuthMeResponse>("/auth/me");
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },

  async refreshToken(
    token: string,
  ): Promise<ApiResponse<PostAuthRefreshResponse>> {
    try {
      const res = await axiosInstance.post<PostAuthRefreshResponse>(
        "/auth/refresh",
        { refreshToken: token },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },

  async logout(): Promise<ApiResponse<PostAuthLogoutResponse>> {
    try {
      const res =
        await axiosInstanceWithAuth.post<PostAuthLogoutResponse>(
          "/auth/logout",
        );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  async resendEmailVerification(
    req: PostAuthSendVerificationEmailData,
  ): Promise<ApiResponse<PostAuthSendVerificationEmailResponse>> {
    const body = req.requestBody;
    try {
      const res =
        await axiosInstance.post<PostAuthSendVerificationEmailResponse>(
          "/auth/send-verification-email",
          body,
        );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  async forgetPassword(
    email: string,
  ): Promise<ApiResponse<{ message: string }>> {
    try {
      const res = await axiosInstance.post<{ message: string }>(
        "/auth/forget-password",
        { email },
      );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  async resetPassword(
    token: string,
    password: string,
  ): Promise<ApiResponse<{ message: string }>> {
    try {
      const res = await axiosInstance.post<{ message: string }>(
        "/auth/reset-password",
        { token, password },
      );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
};

export default auth;
