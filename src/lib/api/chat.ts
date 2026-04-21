import {
  ChatConversation,
  ChatRoom,
  GetChatConversationStatsResponse,
  GetChatRoomsByIdConversationsData,
  PostChatRoomsData,
  PutChatConversationsData,
  SuccessResponse,
} from "@/@types/backend-api";
import aiChat from "@/lib/api/aiChat";
import axiosInstanceWithAuth from "./axios/instanceWithAuth";
import { ApiResponse, handleError, handleResponse } from "./util";

const chat = {
  createChatRoom: async (
    data: PostChatRoomsData,
  ): Promise<ApiResponse<ChatRoom>> => {
    try {
      const res = await axiosInstanceWithAuth.post<ChatRoom>(
        "/chat/rooms",
        data.requestBody,
      );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  getChatRooms: async (): Promise<ApiResponse<ChatRoom[]>> => {
    try {
      const res = await axiosInstanceWithAuth.get<ChatRoom[]>("/chat/rooms");
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  getConversations: async (
    data: GetChatRoomsByIdConversationsData,
  ): Promise<ApiResponse<ChatConversation[]>> => {
    try {
      const { id, ...queryParams } = data;
      const searchParams = new URLSearchParams();

      // Add query parameters if they exist
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });

      const url = `/chat/rooms/${id}/conversations${
        searchParams.toString() ? `?${searchParams.toString()}` : ""
      }`;

      const res = await axiosInstanceWithAuth.get<ChatConversation[]>(url);
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  upsertConversation: async (
    data: PutChatConversationsData,
  ): Promise<ApiResponse<SuccessResponse>> => {
    try {
      const res = await axiosInstanceWithAuth.put<SuccessResponse>(
        "/chat/conversations",
        data.requestBody,
      );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  deleteChatRoom: async (
    roomId: string,
  ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    try {
      const res = await axiosInstanceWithAuth.delete<{
        success: boolean;
        message: string;
      }>(`/chat/rooms/${roomId}`);
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  getChatConversationStats: async (
    startTime?: string,
    endTime?: string,
  ): Promise<ApiResponse<GetChatConversationStatsResponse>> => {
    try {
      const res =
        await axiosInstanceWithAuth.get<GetChatConversationStatsResponse>(
          `/chat/conversation-stats`,
          {
            params: {
              startTime,
              endTime,
            },
          },
        );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  sendToolResponse: async (data: {
    id: string;
    cancelled?: boolean;
    data?: any;
    onMessage?: (event: any) => void;
    onError?: (error: Event) => void;
    onOpen?: () => void;
    onClose?: () => void;
  }) => {
    return aiChat.createToolResponseSSEConnection({
      id: data.id,
      cancelled: data.cancelled,
      data: data.data,
      onMessage: data.onMessage,
      onError: data.onError,
      onOpen: data.onOpen,
      onClose: data.onClose,
    });
  },
};

export default chat;
