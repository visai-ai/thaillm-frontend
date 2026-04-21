import {
  DeleteMedicalRemindersSchedulesByIdResponse,
  GetMedicalRemindersSchedulesByIdResponse,
  GetMedicalRemindersSchedulesHistoryResponse,
  GetMedicalRemindersSchedulesResponse,
  GetMedicalRemindersSchedulesUpcomingResponse,
  PostMedicalRemindersResponseData,
  PostMedicalRemindersResponseResponse,
  PostMedicalRemindersSchedulesData,
  PostMedicalRemindersSchedulesResponse,
  PutMedicalRemindersSchedulesByIdData,
  PutMedicalRemindersSchedulesByIdResponse,
} from "@/@types/backend-api";

import axiosInstanceWithAuth from "./axios/instanceWithAuth";
import { ApiResponse, handleError, handleResponse } from "./util";

const medicalReminder = {
  async getMedicalRemindersSchedules(): Promise<
    ApiResponse<GetMedicalRemindersSchedulesResponse>
  > {
    try {
      const res =
        await axiosInstanceWithAuth.get<GetMedicalRemindersSchedulesResponse>(
          "/medical-reminders/schedules",
        );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  async addMedicalReminderSchedule(
    reqData: PostMedicalRemindersSchedulesData,
  ): Promise<ApiResponse<PostMedicalRemindersSchedulesResponse>> {
    const body = reqData.requestBody;
    try {
      const res =
        await axiosInstanceWithAuth.post<PostMedicalRemindersSchedulesResponse>(
          "/medical-reminders/schedules",
          body,
        );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  async getMedicalRemindersSchedulesById(
    id: string,
  ): Promise<ApiResponse<GetMedicalRemindersSchedulesByIdResponse>> {
    try {
      const res =
        await axiosInstanceWithAuth.get<GetMedicalRemindersSchedulesByIdResponse>(
          `/medical-reminders/schedules/${id}`,
        );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  async updateMedicalReminderScheduleById(
    reqData: PutMedicalRemindersSchedulesByIdData,
  ): Promise<ApiResponse<PutMedicalRemindersSchedulesByIdResponse>> {
    const body = reqData.requestBody;
    try {
      const res =
        await axiosInstanceWithAuth.put<PutMedicalRemindersSchedulesByIdResponse>(
          `/medical-reminders/schedules/${reqData.id}`,
          body,
        );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  async deleteMedicalReminderScheduleById(
    id: string,
  ): Promise<ApiResponse<DeleteMedicalRemindersSchedulesByIdResponse>> {
    try {
      const res =
        await axiosInstanceWithAuth.delete<DeleteMedicalRemindersSchedulesByIdResponse>(
          `/medical-reminders/schedules/${id}`,
        );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  async getUpcomingMedicalReminders(): Promise<
    ApiResponse<GetMedicalRemindersSchedulesUpcomingResponse>
  > {
    try {
      const res =
        await axiosInstanceWithAuth.get<GetMedicalRemindersSchedulesUpcomingResponse>(
          "/medical-reminders/schedules/upcoming",
        );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  async getHistoryMedicalReminders({
    page = 1,
    limit = 10,
    sortBy = "updatedAt",
    sortOrder = "desc",
  }: {
    page?: number;
    limit?: number;
    sortBy?: "updatedAt";
    sortOrder?: "asc" | "desc";
  }): Promise<ApiResponse<GetMedicalRemindersSchedulesHistoryResponse>> {
    try {
      const res =
        await axiosInstanceWithAuth.get<GetMedicalRemindersSchedulesHistoryResponse>(
          "/medical-reminders/schedules/history",
          {
            params: {
              page,
              limit,
              sortBy,
              sortOrder,
            },
          },
        );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  async makeResponseMedicalReminderResponse(
    reqData: PostMedicalRemindersResponseData,
  ): Promise<ApiResponse<PostMedicalRemindersResponseResponse>> {
    const body = reqData.requestBody;
    try {
      const res =
        await axiosInstanceWithAuth.post<PostMedicalRemindersResponseResponse>(
          "/medical-reminders/response",
          body,
        );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
};

export default medicalReminder;
