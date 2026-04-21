import { GetMedicalRemindersSchedulesHistoryResponse } from "@/@types/backend-api";
import medicalReminder from "@/lib/api/medicalReminder";
import { useQuery } from "@tanstack/react-query";

type HistoryMedicalRemindersList = GetMedicalRemindersSchedulesHistoryResponse;
type HistoryMedicalRemindersSortBy = "updatedAt";
type HistoryMedicalRemindersSortOrder = "asc" | "desc";

export const useQueryGetHistoryMedicalReminders = (
  page: number = 1,
  limit: number = 10,
  sortBy: HistoryMedicalRemindersSortBy = "updatedAt",
  sortOrder: HistoryMedicalRemindersSortOrder = "desc",
) => {
  return useQuery<HistoryMedicalRemindersList, Error>({
    queryKey: ["historyMedicalReminders", page, limit, sortBy, sortOrder],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const response = await medicalReminder.getHistoryMedicalReminders({
        page,
        limit,
        sortBy,
        sortOrder,
      });
      if (!response.ok) {
        throw new Error(response.data.error);
      }
      return response.data;
    },
  });
};
