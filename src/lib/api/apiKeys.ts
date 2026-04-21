import {
  DeleteApiKeysByIdResponse,
  GetApiKeysByIdResponse,
  GetApiKeysResponse,
  PostApiKeysByIdRegenerateResponse,
  PostApiKeysData,
  PostApiKeysResponse,
  PutApiKeysByIdData,
  PutApiKeysByIdResponse,
} from "@/@types/backend-api";
import axiosInstanceWithAuth from "./axios/instanceWithAuth";
import { ApiResponse, handleError, handleResponse } from "./util";

const apiKeys = {
  async list(
    page = 1,
    limit = 20,
    sortBy?: string | null,
    sortOrder?: "asc" | "desc" | null,
  ): Promise<ApiResponse<GetApiKeysResponse>> {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      // Only add sorting parameters if they have values
      if (sortBy) {
        params.append("sortBy", sortBy);
      }
      if (sortOrder) {
        params.append("sortOrder", sortOrder);
      }

      const res = await axiosInstanceWithAuth.get<GetApiKeysResponse>(
        `/api-keys?${params.toString()}`,
      );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },

  async getById(id: string): Promise<ApiResponse<GetApiKeysByIdResponse>> {
    try {
      const res = await axiosInstanceWithAuth.get<GetApiKeysByIdResponse>(
        `/api-keys/${id}`,
      );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },

  async create(
    reqData: PostApiKeysData,
  ): Promise<ApiResponse<PostApiKeysResponse>> {
    try {
      const res = await axiosInstanceWithAuth.post<PostApiKeysResponse>(
        "/api-keys",
        reqData.requestBody,
      );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },

  async update(
    reqData: PutApiKeysByIdData,
  ): Promise<ApiResponse<PutApiKeysByIdResponse>> {
    try {
      const res = await axiosInstanceWithAuth.put<PutApiKeysByIdResponse>(
        `/api-keys/${reqData.id}`,
        reqData.requestBody,
      );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },

  async regenerate(
    id: string,
  ): Promise<ApiResponse<PostApiKeysByIdRegenerateResponse>> {
    try {
      const res =
        await axiosInstanceWithAuth.post<PostApiKeysByIdRegenerateResponse>(
          `/api-keys/${id}/regenerate`,
        );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },

  async remove(id: string): Promise<ApiResponse<DeleteApiKeysByIdResponse>> {
    try {
      const res = await axiosInstanceWithAuth.delete<DeleteApiKeysByIdResponse>(
        `/api-keys/${id}`,
      );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
};

export default apiKeys;
