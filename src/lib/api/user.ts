import {
  DeleteUsersByIdResponse,
  GetUsersResponse,
  PostUsersByIdSetActiveResponse,
  PutUsersByIdData,
  PutUsersByIdResponse,
  UserSetting,
} from "@/@types/backend-api";
import axiosInstanceWithAuth from "./axios/instanceWithAuth";
import { ApiResponse, handleError, handleResponse } from "./util";

const user = {
  async deleteUser(id: string): Promise<ApiResponse<DeleteUsersByIdResponse>> {
    try {
      const res = await axiosInstanceWithAuth.delete<DeleteUsersByIdResponse>(
        `/users/${id}`,
      );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  async updateUser(
    reqData: PutUsersByIdData,
  ): Promise<ApiResponse<PutUsersByIdResponse>> {
    try {
      const body = reqData.requestBody;
      const res = await axiosInstanceWithAuth.put<PutUsersByIdResponse>(
        `/users/${reqData.id}`,
        body,
      );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  async listUsers(
    page: number,
    limit: number,
    search?: string,
  ): Promise<ApiResponse<GetUsersResponse>> {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search && search.trim()) {
        params.append("search", search.trim());
      }
      const res = await axiosInstanceWithAuth.get<GetUsersResponse>(
        `/users?${params.toString()}`,
      );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  async setUserActive(
    id: string,
    isActive: boolean,
  ): Promise<ApiResponse<PostUsersByIdSetActiveResponse>> {
    try {
      const res =
        await axiosInstanceWithAuth.post<PostUsersByIdSetActiveResponse>(
          `/users/${id}/set-active`,
          { isActive },
        );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  async setUserRoles(
    id: string,
    roles: string[],
  ): Promise<ApiResponse<PostUsersByIdSetActiveResponse>> {
    try {
      const res =
        await axiosInstanceWithAuth.post<PostUsersByIdSetActiveResponse>(
          `/users/${id}/set-roles`,
          { roles },
        );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  async getSetting(): Promise<ApiResponse<UserSetting>> {
    try {
      const res =
        await axiosInstanceWithAuth.get<UserSetting>("/users/setting");
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  async updateSetting(settings: {
    enableEmailNotification: boolean;
  }): Promise<ApiResponse<UserSetting>> {
    try {
      const res = await axiosInstanceWithAuth.put<UserSetting>(
        "/users/setting",
        settings,
      );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
};

export default user;
