import {
  GetAppointmentsHospitalsResponse,
  GetAppointmentsResponse,
} from "@/@types/backend-api";
import appointments, { PrescreenResultsResponse } from "@/lib/api/appointments";
import { useQuery } from "@tanstack/react-query";

export type AppointmentsList = GetAppointmentsResponse;

export const useQueryGetFutureAppointments = () => {
  return useQuery<AppointmentsList, Error>({
    queryKey: ["appointments", "future"],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const response = await appointments.getAppointments({
        params: {
          page: 1,
          limit: 10000,
          futureOnly: true,
          historyOnly: false,
        },
      });
      if (!response.ok) {
        throw new Error(response.data.error);
      }
      return response.data;
    },
  });
};

export const useQueryGetHistoryAppointments = (
  page: number,
  limit: number = 10,
) => {
  return useQuery<AppointmentsList, Error>({
    queryKey: ["appointments", "history", page, limit],
    queryFn: async () => {
      const response = await appointments.getAppointments({
        params: {
          page,
          limit,
          futureOnly: false,
          historyOnly: true,
        },
      });
      if (!response.ok) {
        throw new Error(response.data.error);
      }
      return response.data;
    },
  });
};

export const useQueryGetAppointments = (
  page: number,
  limit: number,
  futureOnly: boolean,
  historyOnly: boolean,
) => {
  return useQuery<AppointmentsList, Error>({
    queryKey: ["appointments", "legacy", page, limit, futureOnly, historyOnly],
    queryFn: async () => {
      const response = await appointments.getAppointments({
        params: {
          page,
          limit,
          futureOnly,
          historyOnly,
        },
      });
      if (!response.ok) {
        throw new Error(response.data.error);
      }
      return response.data;
    },
  });
};

export const useQueryGetPrescreenResults = () => {
  return useQuery<PrescreenResultsResponse, Error>({
    queryKey: ["prescreenResults"],
    queryFn: async () => {
      const response = await appointments.getPrescreenResults();
      if (!response.ok) {
        throw new Error(response.data.error);
      }
      return response.data;
    },
    staleTime: 30_000,
  });
};

export const useQueryGetAppointmentsHospital = () => {
  return useQuery<GetAppointmentsHospitalsResponse, Error>({
    queryKey: ["appointmentsHospitals"],
    queryFn: async () => {
      const response = await appointments.getAppointmentsHospitals();
      if (!response.ok) {
        throw new Error(response.data.error);
      }
      return response.data;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
};
