import { useQuery } from "@tanstack/react-query";
import medicalReminder from "@/lib/api/medicalReminder";
import { GetMedicalRemindersSchedulesUpcomingResponse } from "@/@types/backend-api";

type UpcomingMedicalRemindersList =
  GetMedicalRemindersSchedulesUpcomingResponse["list"];

export const useQueryGetUpcomingMedicalReminders = () => {
  return useQuery<UpcomingMedicalRemindersList, Error>({
    queryKey: ["upcomingMedicalReminders"],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const response = await medicalReminder.getUpcomingMedicalReminders();
      if (!response.ok) {
        throw new Error(response.data.error);
      }
      return response.data.list;
    },
  });
};
