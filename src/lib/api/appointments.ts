import {
  DeleteAppointmentsByIdResponse,
  GetAppointmentsByIdData,
  GetAppointmentsByIdResponse,
  GetAppointmentsHospitalsResponse,
  GetAppointmentsResponse,
  PostAppointmentsData,
  PostAppointmentsResponse,
  PutAppointmentsByIdData,
  PutAppointmentsByIdResponse,
} from "@/@types/backend-api";

import axiosInstanceWithAuth from "./axios/instanceWithAuth";
import { ApiResponse, handleError, handleResponse } from "./util";

export interface PrescreenHistoryItem {
  question: string;
  answer: any;
  source: string;
  qid: string | null;
  question_type: string | null;
}

export interface PrescreenResultItem {
  id: string;
  chatroomId: string;
  chatRoomTitle: string;
  diagnoses: Array<{
    disease_id: string;
    disease_name?: string;
    name_th?: string;
  }>;
  departments?: Array<{
    id: string;
    name: string;
    name_th?: string;
  }>;
  severity?: {
    id?: string;
    name?: string;
    name_th?: string;
    description?: string;
  } | null;
  advice?: string | null;
  primarySymptom?: string | null;
  secondarySymptoms?: string[] | null;
  history?: PrescreenHistoryItem[];
  historySummary?: string | null;
  createdAt: string;
}

export interface PrescreenResultsResponse {
  data: PrescreenResultItem[];
}

const appointments = {
  getAppointments: async ({
    params,
  }: {
    params: {
      page: number;
      limit: number;
      futureOnly: boolean;
      historyOnly: boolean;
    };
  }): Promise<ApiResponse<GetAppointmentsResponse>> => {
    try {
      const res = await axiosInstanceWithAuth.get<GetAppointmentsResponse>(
        "/appointments",
        {
          params,
        },
      );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  getAppointmentsById: async (
    data: GetAppointmentsByIdData,
  ): Promise<ApiResponse<GetAppointmentsByIdResponse>> => {
    try {
      const res = await axiosInstanceWithAuth.get<GetAppointmentsByIdResponse>(
        `/appointments/${data.id}`,
      );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  postAppointments: async (
    reqData: PostAppointmentsData,
  ): Promise<ApiResponse<PostAppointmentsResponse>> => {
    try {
      const body = reqData.requestBody;
      const res = await axiosInstanceWithAuth.post<PostAppointmentsResponse>(
        "/appointments",
        body,
      );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  putAppointmentsById: async (
    data: PutAppointmentsByIdData,
  ): Promise<ApiResponse<PutAppointmentsByIdResponse>> => {
    try {
      const res = await axiosInstanceWithAuth.put<PutAppointmentsByIdResponse>(
        `/appointments/${data.id}`,
        data.requestBody,
      );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  deleteAppointmentsById: async (
    id: string,
  ): Promise<ApiResponse<DeleteAppointmentsByIdResponse>> => {
    try {
      const res =
        await axiosInstanceWithAuth.delete<DeleteAppointmentsByIdResponse>(
          `/appointments/${id}`,
        );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  getPrescreenResults: async (): Promise<
    ApiResponse<PrescreenResultsResponse>
  > => {
    try {
      const res = await axiosInstanceWithAuth.get<PrescreenResultsResponse>(
        "/appointments/prescreen-results",
      );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
  getAppointmentsHospitals: async (): Promise<
    ApiResponse<GetAppointmentsHospitalsResponse>
  > => {
    try {
      const res =
        await axiosInstanceWithAuth.get<GetAppointmentsHospitalsResponse>(
          "/appointments/hospitals",
        );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
};

export default appointments;
