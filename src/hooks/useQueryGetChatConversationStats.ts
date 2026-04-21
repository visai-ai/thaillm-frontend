import { GetChatConversationStatsResponse } from "@/@types/backend-api";
import chatApi from "@/lib/api/chat";
import { useQuery } from "@tanstack/react-query";

export const useQueryGetChatConversationStats = (
  startTime?: string,
  endTime?: string,
) => {
  return useQuery<GetChatConversationStatsResponse, Error>({
    queryKey: ["chat-conversation-stats", startTime, endTime],
    queryFn: async () => {
      const response = await chatApi.getChatConversationStats(
        startTime,
        endTime,
      );
      if (!response.ok) {
        throw new Error(
          response.data.error || "Failed to fetch chat conversation stats",
        );
      }
      return response.data;
    },
  });
};
