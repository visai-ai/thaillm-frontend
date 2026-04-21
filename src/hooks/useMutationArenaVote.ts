import { ArenaVoteResponse } from "@/lib/api/arena";
import api from "@/lib/api";
import { useMutation } from "@tanstack/react-query";

export const useMutationArenaVote = () => {
  return useMutation<
    ArenaVoteResponse,
    Error,
    {
      sessionId: string;
      voteKey: "A" | "B" | "EQUAL" | "NO";
    }
  >({
    mutationFn: async (data) => {
      const response = await api.arena.vote(data);
      if (!response.ok) {
        throw new Error(response.data.error || "Failed to submit vote");
      }
      return response.data;
    },
  });
};
