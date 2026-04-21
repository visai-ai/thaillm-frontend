import { GetApiKeysResponse } from "@/@types/backend-api";
import apiKeys from "@/lib/api/apiKeys";
import { useQuery } from "@tanstack/react-query";

export type APIKeyList = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  apiKey: string;
  isRateLimitEnabled: boolean;
  rateLimit?: number;
  rateLimitUnit?: string;
  currentUsage: number;
}[];

export const useQueryGetAPIKey = (
  page: number = 1,
  limit: number = 10,
  sortBy?: string | null,
  sortOrder?: "asc" | "desc" | null,
) => {
  return useQuery<GetApiKeysResponse, Error>({
    queryKey: ["api-keys", page, limit, sortBy, sortOrder],
    queryFn: async () => {
      const res = await apiKeys.list(page, limit, sortBy, sortOrder);
      if (!res.ok) {
        throw new Error(res.data.error || "Failed to fetch API keys");
      }
      return res.data;
    },
  });
};
