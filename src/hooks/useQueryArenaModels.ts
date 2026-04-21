import { ArenaModel } from "@/lib/api/arena";
import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export const useQueryArenaModels = () => {
  return useQuery<ArenaModel[], Error>({
    queryKey: ["arena-models"],
    queryFn: async () => {
      const response = await api.arena.getModels();
      if (!response.ok) {
        throw new Error(response.data.error || "Failed to fetch arena models");
      }
      return response.data;
    },
  });
};
