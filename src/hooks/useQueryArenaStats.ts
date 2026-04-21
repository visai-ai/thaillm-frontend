import { ArenaStatsResponse } from "@/lib/api/arena";
import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export const useQueryArenaStats = () => {
  return useQuery<ArenaStatsResponse, Error>({
    queryKey: ["arena-stats"],
    queryFn: async () => {
      const response = await api.arena.getStats();
      if (!response.ok) {
        throw new Error(response.data.error || "Failed to fetch arena stats");
      }
      return response.data;
    },
    refetchInterval: 30000,
  });
};
