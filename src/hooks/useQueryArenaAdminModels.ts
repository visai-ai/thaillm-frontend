import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { type ArenaModelAdmin } from "@/lib/api/arena";

export const ARENA_ADMIN_MODELS_KEY = ["arena-admin-models"];

export const useQueryArenaAdminModels = () => {
  return useQuery<ArenaModelAdmin[], Error>({
    queryKey: ARENA_ADMIN_MODELS_KEY,
    queryFn: async () => {
      const response = await api.arena.adminGetModels();
      if (!response.ok) {
        throw new Error(response.data.error || "Failed to fetch admin models");
      }
      return response.data;
    },
  });
};
