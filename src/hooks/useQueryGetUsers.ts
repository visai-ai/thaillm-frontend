import { GetUsersResponse } from "@/@types/backend-api";
import userApi from "@/lib/api/user";
import { useQuery } from "@tanstack/react-query";

export const useQueryGetUsers = (
  page: number = 1,
  limit: number = 10,
  search?: string,
) => {
  return useQuery<GetUsersResponse, Error>({
    queryKey: ["users", page, limit, search],
    queryFn: async () => {
      const response = await userApi.listUsers(page, limit, search);
      if (!response.ok) {
        throw new Error(response.data.error);
      }
      return response.data;
    },
  });
};
