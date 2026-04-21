import axiosInstanceWithAuth from "./axios/instanceWithAuth";
import { ApiResponse, handleError, handleResponse } from "./util";

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}

export interface PushSubscriptionResponse {
  success: boolean;
  message: string;
  count: number;
}

export interface PushNotificationSendData {
  title: string;
  body: string;
  data?: any;
}

export interface PushNotificationSendResponse {
  success: boolean;
  message: string;
  results: any[];
}

export interface PushSubscriptionStatusResponse {
  subscriptions: number;
  endpoints: string[];
}

const pushNotification = {
  async subscribe(
    subscription: PushSubscriptionData,
  ): Promise<ApiResponse<PushSubscriptionResponse>> {
    try {
      const res = await axiosInstanceWithAuth.post<PushSubscriptionResponse>(
        "/api/push/subscribe",
        subscription,
      );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },

  async getSubscriptions(): Promise<
    ApiResponse<PushSubscriptionStatusResponse>
  > {
    try {
      const res =
        await axiosInstanceWithAuth.get<PushSubscriptionStatusResponse>(
          "/api/push/subscribe",
        );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },

  async unsubscribe(
    endpoint: string,
  ): Promise<ApiResponse<{ success: boolean; message: string }>> {
    try {
      const res = await axiosInstanceWithAuth.delete<{
        success: boolean;
        message: string;
      }>(`/api/push/subscribe/${encodeURIComponent(endpoint)}`);
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
};

export default pushNotification;
