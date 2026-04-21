import {
  GetMedicalRemindersSchedulesByIdResponse,
  GetMedicalRemindersSchedulesResponse,
} from "@/@types/backend-api";
import medicalReminder from "@/lib/api/medicalReminder";
import { useQuery } from "@tanstack/react-query";

export const useQueryListMedicalSchedule = () => {
  return useQuery<GetMedicalRemindersSchedulesResponse, Error>({
    queryKey: ["medicalRemindersSchedules"],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const response = await medicalReminder.getMedicalRemindersSchedules();
      if (!response.ok) {
        throw new Error(response.data.error);
      }
      return response.data;
    },
  });
};

export const useQueryListMedicalScheduleById = (id: string | undefined) => {
  return useQuery<GetMedicalRemindersSchedulesByIdResponse, Error>({
    queryKey: ["medicalRemindersSchedules", id],
    enabled: !!id, // skip if id is undefined
    queryFn: async () => {
      const response = await medicalReminder.getMedicalRemindersSchedulesById(
        id!,
      );
      if (!response.ok) {
        throw new Error(response.data.error);
      }
      return response.data;
    },
  });
};
