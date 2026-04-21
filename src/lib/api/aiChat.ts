import appConfig from "@/config/appConfig";
import { ApiResponse, getAccessToken, handleError } from "./util";

type WorkerMessage =
  | {
      type: "start";
      url: string;
      headers: Record<string, string>;
      body?: string;
      method?: string;
    }
  | {
      type: "stop";
    };

type WorkerResponse =
  | {
      type: "open";
    }
  | {
      type: "message";
      event: string;
      data: string;
    }
  | {
      type: "error";
      error: string;
    }
  | {
      type: "close";
    };

export type AiChatEventType =
  | "status"
  | "message"
  | "stream_resume"
  | "renderFlow"
  | "choice"
  | "error"
  | "conversation"
  | "tool_call"
  | "tool_call_debug"
  | "tool_result"
  | "tool_wait"
  | "chatroom_update"
  | "debug";

// Array of valid event types for runtime checks
const VALID_EVENT_TYPES: AiChatEventType[] = [
  "status",
  "message",
  "stream_resume",
  "renderFlow",
  "choice",
  "error",
  "conversation",
  "tool_call",
  "tool_call_debug",
  "tool_result",
  "tool_wait",
  "chatroom_update",
  "debug",
];

export type AiChatEvent = {
  event: AiChatEventType;
  data: string;
};

export type AiChatRenderFlowType =
  | "prescreening"
  | "medicine_scheduling"
  | "medical_appointment"
  | "information_query";

export type EmergencyContact = {
  name: string;
  tel: string;
  description: string;
  source: string;
};

export type EmergencyContactsData = {
  type: "emergencyContacts";
  choices: EmergencyContact[];
};

export type PendingToolCall = {
  id: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  chatroomId: string | null;
  status: string;
  createdAt: string;
};

export type AiChatSSEOptions = {
  prompt: string;
  chatroomId: string;
  userConversationId?: string;
  onMessage?: (event: AiChatEvent) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export type ToolResponseSSEOptions = {
  id: string;
  cancelled?: boolean;
  data?: any;
  onMessage?: (event: AiChatEvent) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export type AiChatSSEResponse = {
  connectionId: string;
  close: () => void;
};

const createWorker = (): Worker => {
  const workerUrl = new URL("../../workers/aiChatWorker.js", import.meta.url);
  return new Worker(workerUrl);
};

// Track active connections to ensure proper cleanup
const activeConnections = new Map<
  string,
  { worker: Worker; close: () => void }
>();

// ============================================================================
// Shared SSE worker helper
// ============================================================================

type SSEWorkerOptions = {
  url: string;
  headers: Record<string, string>;
  body?: string;
  method?: string;
  onMessage?: (event: AiChatEvent) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

function openWorkerSSE(opts: SSEWorkerOptions): AiChatSSEResponse {
  const worker = createWorker();
  const connectionId = crypto.randomUUID();
  let isIntentionallyClosed = false;

  const close = () => {
    if (!isIntentionallyClosed) {
      isIntentionallyClosed = true;
      worker.postMessage({ type: "stop" } as WorkerMessage);
      worker.terminate();
      activeConnections.delete(connectionId);
      opts.onClose?.();
    }
  };

  activeConnections.set(connectionId, { worker, close });

  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const response = event.data;

    switch (response.type) {
      case "open":
        opts.onOpen?.();
        break;

      case "message":
        try {
          let eventType: AiChatEventType = response.event as AiChatEventType;

          if (!VALID_EVENT_TYPES.includes(eventType)) {
            try {
              const parsedData = JSON.parse(response.data);
              if (parsedData.event) {
                eventType = parsedData.event as AiChatEventType;
              } else {
                eventType = "message";
              }
            } catch {
              eventType = "message";
            }
          }

          opts.onMessage?.({ event: eventType, data: response.data });

          if (eventType === "status" && response.data === "[DONE]") {
            isIntentionallyClosed = true;
            close();
            return;
          }
        } catch (error) {
          console.error("Error parsing SSE event:", error);
        }
        break;

      case "error":
        if (!isIntentionallyClosed) {
          const errorEvent = new ErrorEvent("error", {
            message: response.error,
            error: new Error(response.error),
          });
          opts.onError?.(errorEvent);
        }
        break;

      case "close":
        if (!isIntentionallyClosed) {
          close();
        }
        break;
    }
  };

  worker.onerror = (error) => {
    if (!isIntentionallyClosed) {
      opts.onError?.(error);
    }
  };

  const msg: WorkerMessage = {
    type: "start",
    url: opts.url,
    headers: opts.headers,
    ...(opts.method && { method: opts.method }),
    ...(opts.body && { body: opts.body }),
  };
  worker.postMessage(msg);

  return { connectionId, close };
}

// ============================================================================
// Shared authenticated fetch helper
// ============================================================================

async function authenticatedFetch<T>(
  url: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return {
      ok: false,
      status: 401,
      data: {
        error: "No access token available. Please log in.",
        timestamp: new Date().toISOString(),
        code: "NO_ACCESS_TOKEN",
      } as any,
    };
  }

  const response = await fetch(`${appConfig.apiBaseUrl}${url}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();
  if (!response.ok) return { ok: false, status: response.status, data };
  return { ok: true, status: response.status, data };
}

const aiChat = {
  createSSEConnection: async (
    options: AiChatSSEOptions,
  ): Promise<ApiResponse<AiChatSSEResponse>> => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        return {
          ok: false,
          status: 401,
          data: {
            error: "No access token available. Please log in.",
            timestamp: new Date().toISOString(),
            code: "NO_ACCESS_TOKEN",
          },
        };
      }

      const data = openWorkerSSE({
        url: `${appConfig.apiBaseUrl}/chat/ai`,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: options.prompt,
          chatroomId: options.chatroomId,
          ...(options.userConversationId && {
            userConversationId: options.userConversationId,
          }),
        }),
        onMessage: options.onMessage,
        onError: options.onError,
        onOpen: options.onOpen,
        onClose: options.onClose,
      });

      return { ok: true, status: 200, data };
    } catch (error) {
      return handleError(error);
    }
  },

  createToolResponseSSEConnection: async (
    options: ToolResponseSSEOptions,
  ): Promise<ApiResponse<AiChatSSEResponse>> => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        return {
          ok: false,
          status: 401,
          data: {
            error: "No access token available. Please log in.",
            timestamp: new Date().toISOString(),
            code: "NO_ACCESS_TOKEN",
          },
        };
      }

      const data = openWorkerSSE({
        url: `${appConfig.apiBaseUrl}/chat/ai/tool-response`,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: options.id,
          cancelled: options.cancelled || false,
          ...(options.data && { data: options.data }),
        }),
        onMessage: options.onMessage,
        onError: options.onError,
        onOpen: options.onOpen,
        onClose: options.onClose,
      });

      return { ok: true, status: 200, data };
    } catch (error) {
      return handleError(error);
    }
  },

  // Utility to close all active connections
  closeAllConnections: () => {
    activeConnections.forEach(({ close }) => {
      close();
    });
    activeConnections.clear();
  },

  // Prescreen API
  prescreenAnswer: async (
    pendingId: string,
    answer: any,
  ): Promise<
    ApiResponse<{ step: any; completed: boolean; conversation?: any }>
  > => {
    try {
      return await authenticatedFetch(
        `/chat/ai/prescreen/${pendingId}/answer`,
        {
          method: "POST",
          body: JSON.stringify({ answer }),
        },
      );
    } catch (error) {
      return handleError(error);
    }
  },

  prescreenBack: async (
    pendingId: string,
  ): Promise<ApiResponse<{ step: any }>> => {
    try {
      return await authenticatedFetch(`/chat/ai/prescreen/${pendingId}/back`, {
        method: "POST",
      });
    } catch (error) {
      return handleError(error);
    }
  },

  prescreenStep: async (
    pendingId: string,
  ): Promise<ApiResponse<{ step: any }>> => {
    try {
      return await authenticatedFetch(`/chat/ai/prescreen/${pendingId}/step`, {
        method: "GET",
      });
    } catch (error) {
      return handleError(error);
    }
  },

  prescreenCancel: async (
    pendingId: string,
  ): Promise<ApiResponse<{ success: boolean }>> => {
    try {
      return await authenticatedFetch(
        `/chat/ai/prescreen/${pendingId}/cancel`,
        {
          method: "POST",
        },
      );
    } catch (error) {
      return handleError(error);
    }
  },

  // Get pending tool calls for a chatroom
  getPendingToolCalls: async (
    chatroomId: string,
  ): Promise<ApiResponse<PendingToolCall[]>> => {
    try {
      return await authenticatedFetch(
        `/chat/rooms/${chatroomId}/pending-tool-calls`,
        {
          method: "GET",
        },
      );
    } catch (error) {
      return handleError(error);
    }
  },

  /**
   * Reconnect to an active stream after page refresh.
   * Uses GET /chat/stream/:chatroomId — returns buffered content + live chunks.
   */
  reconnectToStream: async (options: {
    chatroomId: string;
    onMessage?: (event: AiChatEvent) => void;
    onError?: (error: Event) => void;
    onOpen?: () => void;
    onClose?: () => void;
  }): Promise<ApiResponse<AiChatSSEResponse>> => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        return {
          ok: false,
          status: 401,
          data: {
            error: "No access token available. Please log in.",
            timestamp: new Date().toISOString(),
            code: "NO_ACCESS_TOKEN",
          },
        };
      }

      const data = openWorkerSSE({
        url: `${appConfig.apiBaseUrl}/chat/stream/${options.chatroomId}`,
        headers: { Authorization: `Bearer ${accessToken}` },
        method: "GET",
        onMessage: options.onMessage,
        onError: options.onError,
        onOpen: options.onOpen,
        onClose: options.onClose,
      });

      return { ok: true, status: 200, data };
    } catch (error) {
      return handleError(error);
    }
  },
};

export default aiChat;
