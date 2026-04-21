import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  type ArenaModelAdmin,
  type ArenaModelCreateInput,
  type ArenaModelUpdateInput,
  type ArenaTestConnectionInput,
  type ArenaTestConnectionResponse,
} from "@/lib/api/arena";
import { ARENA_ADMIN_MODELS_KEY } from "./useQueryArenaAdminModels";

export const useMutationArenaModelCreate = () => {
  const queryClient = useQueryClient();
  return useMutation<ArenaModelAdmin, Error, ArenaModelCreateInput>({
    mutationFn: async (data) => {
      const response = await api.arena.adminCreateModel(data);
      if (!response.ok) {
        throw new Error(response.data.error || "Failed to create model");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ARENA_ADMIN_MODELS_KEY });
      queryClient.invalidateQueries({ queryKey: ["arena-models"] });
    },
  });
};

export const useMutationArenaModelUpdate = () => {
  const queryClient = useQueryClient();
  return useMutation<
    ArenaModelAdmin,
    Error,
    { id: string; data: ArenaModelUpdateInput }
  >({
    mutationFn: async ({ id, data }) => {
      const response = await api.arena.adminUpdateModel(id, data);
      if (!response.ok) {
        throw new Error(response.data.error || "Failed to update model");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ARENA_ADMIN_MODELS_KEY });
      queryClient.invalidateQueries({ queryKey: ["arena-models"] });
    },
  });
};

export const useMutationArenaModelDelete = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const response = await api.arena.adminDeleteModel(id);
      if (!response.ok) {
        throw new Error(response.data.error || "Failed to delete model");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ARENA_ADMIN_MODELS_KEY });
      queryClient.invalidateQueries({ queryKey: ["arena-models"] });
    },
  });
};

export const useMutationArenaModelTest = () => {
  return useMutation<
    ArenaTestConnectionResponse,
    Error,
    ArenaTestConnectionInput
  >({
    mutationFn: async (data) => {
      const response = await api.arena.adminTestConnection(data);
      if (!response.ok) {
        throw new Error(response.data.error || "Failed to test connection");
      }
      return response.data;
    },
  });
};
