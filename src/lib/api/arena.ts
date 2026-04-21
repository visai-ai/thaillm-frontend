import appConfig from "@/config/appConfig";
import axiosInstanceWithAuth from "./axios/instanceWithAuth";
import axiosInstance from "./axios/instance";
import {
  ApiResponse,
  getAccessToken,
  handleError,
  handleResponse,
} from "./util";

export type ArenaModel = {
  name: string;
};

export type ArenaVoteResponse = {
  success: boolean;
  voteId: string;
};

export type ArenaExportRow = {
  id: string;
  question: string;
  modelAName: string;
  modelBName: string;
  answerA: string;
  answerB: string;
  voteKey: string | null;
  chosenModel: string | null;
  createdAt: string | null;
};

export type ArenaStatsResponse = {
  models: {
    model_name: string;
    total_battles: number;
    wins: number;
    draws: number;
    losses: number;
  }[];
  totalVotes: number;
  headToHead: {
    model_a: string;
    model_b: string;
    total: number;
    a_wins: number;
    b_wins: number;
    equal: number;
    both_bad: number;
  }[];
  voteTypes: {
    vote_key: string;
    count: number;
  }[];
  recentVotes: {
    id: string;
    question: string | null;
    modelAName: string;
    modelBName: string;
    voteKey: string | null;
    chosenModel: string | null;
    createdAt: string | null;
  }[];
};

export type ArenaModelAdmin = {
  id: string;
  name: string;
  baseUrl: string;
  maskedApiKey: string;
  model: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ArenaModelCreateInput = {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled?: boolean;
};

export type ArenaModelUpdateInput = {
  name?: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  enabled?: boolean;
};

export type ArenaTestConnectionInput = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type ArenaTestConnectionResponse = {
  success: boolean;
  message: string;
};

export type ArenaStreamCallbacks = {
  onInit?: (sessionId: string, modelA: string, modelB: string) => void;
  onRetryInit?: (side: "a" | "b", modelName: string) => void;
  onStreamA?: (chunk: string) => void;
  onStreamB?: (chunk: string) => void;
  onErrorA?: (msg: string) => void;
  onErrorB?: (msg: string) => void;
  onError?: (msg: string) => void;
  onDone?: () => void;
};

function parseChunk(raw: string): string {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/** Shared SSE reader for arena streams (askStream + retryStream) */
async function readArenaSSE(
  response: Response,
  callbacks: ArenaStreamCallbacks,
): Promise<void> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fatalError = false;
  let doneFired = false;
  const fireDone = () => {
    if (!doneFired) {
      doneFired = true;
      callbacks.onDone?.();
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      let event = "";
      const dataLines: string[] = [];
      for (const line of part.split("\n")) {
        if (line.startsWith("event: ")) event = line.slice(7).trim();
        if (line.startsWith("data: ")) dataLines.push(line.slice(6));
      }
      const eventData = dataLines.join("\n");
      if (!event) continue;

      switch (event) {
        case "arena_init": {
          try {
            const init = JSON.parse(eventData);
            callbacks.onInit?.(init.sessionId, init.modelA, init.modelB);
          } catch {
            callbacks.onError?.("Invalid arena session data");
          }
          break;
        }
        case "arena_retry_init": {
          try {
            const init = JSON.parse(eventData);
            callbacks.onRetryInit?.(init.side, init.modelName);
          } catch {
            /* ignore */
          }
          break;
        }
        case "stream_a":
          callbacks.onStreamA?.(parseChunk(eventData));
          break;
        case "stream_b":
          callbacks.onStreamB?.(parseChunk(eventData));
          break;
        case "error_a":
          callbacks.onErrorA?.(parseChunk(eventData));
          break;
        case "error_b":
          callbacks.onErrorB?.(parseChunk(eventData));
          break;
        case "error": {
          fatalError = true;
          try {
            const err = JSON.parse(eventData);
            callbacks.onError?.(err.message);
          } catch {
            callbacks.onError?.(eventData);
          }
          break;
        }
        case "status":
          if (eventData === "[DONE]") fireDone();
          break;
      }
    }
  }

  if (!fatalError) fireDone();
}

const arena = {
  async getModels(): Promise<ApiResponse<ArenaModel[]>> {
    try {
      const res = await axiosInstance.get<ArenaModel[]>("/arena/models");
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },

  async askStream(
    data: {
      question: string;
      modelAName?: string;
      modelBName?: string;
    },
    callbacks: ArenaStreamCallbacks,
  ): Promise<void> {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      callbacks.onError?.("No access token available. Please log in.");
      return;
    }

    let response: Response;
    try {
      response = await fetch(`${appConfig.apiBaseUrl}/arena/ask`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } catch {
      callbacks.onError?.("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
      return;
    }

    if (!response.ok || !response.body) {
      try {
        const errBody = await response.json();
        callbacks.onError?.(errBody?.error ?? "เกิดข้อผิดพลาดในการเชื่อมต่อ");
      } catch {
        callbacks.onError?.("เกิดข้อผิดพลาดในการเชื่อมต่อ");
      }
      return;
    }

    await readArenaSSE(response, callbacks);
  },

  async retryStream(
    data: { sessionId: string; side: "a" | "b" },
    callbacks: ArenaStreamCallbacks,
  ): Promise<void> {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      callbacks.onError?.("No access token available. Please log in.");
      return;
    }

    let response: Response;
    try {
      response = await fetch(`${appConfig.apiBaseUrl}/arena/retry`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } catch {
      callbacks.onError?.("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
      return;
    }

    if (!response.ok || !response.body) {
      try {
        const errBody = await response.json();
        callbacks.onError?.(errBody?.error ?? "เกิดข้อผิดพลาดในการเชื่อมต่อ");
      } catch {
        callbacks.onError?.("เกิดข้อผิดพลาดในการเชื่อมต่อ");
      }
      return;
    }

    await readArenaSSE(response, callbacks);
  },

  async vote(data: {
    sessionId: string;
    voteKey: "A" | "B" | "EQUAL" | "NO";
  }): Promise<ApiResponse<ArenaVoteResponse>> {
    try {
      const res = await axiosInstanceWithAuth.post<ArenaVoteResponse>(
        "/arena/vote",
        data,
      );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },

  async getExportData(): Promise<ApiResponse<ArenaExportRow[]>> {
    try {
      const res =
        await axiosInstanceWithAuth.get<ArenaExportRow[]>("/arena/export");
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },

  async getStats(): Promise<ApiResponse<ArenaStatsResponse>> {
    try {
      const res =
        await axiosInstanceWithAuth.get<ArenaStatsResponse>("/arena/stats");
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },

  async adminGetModels(): Promise<ApiResponse<ArenaModelAdmin[]>> {
    try {
      const res = await axiosInstanceWithAuth.get<{
        models: ArenaModelAdmin[];
      }>("/arena/admin/models");
      return { ok: true, status: res.status, data: res.data.models };
    } catch (error) {
      return handleError(error);
    }
  },

  async adminCreateModel(
    input: ArenaModelCreateInput,
  ): Promise<ApiResponse<ArenaModelAdmin>> {
    try {
      const res = await axiosInstanceWithAuth.post<ArenaModelAdmin>(
        "/arena/admin/models",
        input,
      );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },

  async adminUpdateModel(
    id: string,
    input: ArenaModelUpdateInput,
  ): Promise<ApiResponse<ArenaModelAdmin>> {
    try {
      const res = await axiosInstanceWithAuth.put<ArenaModelAdmin>(
        `/arena/admin/models/${id}`,
        input,
      );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },

  async adminDeleteModel(id: string): Promise<ApiResponse<void>> {
    try {
      const res = await axiosInstanceWithAuth.delete<void>(
        `/arena/admin/models/${id}`,
      );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },

  async adminTestConnection(
    input: ArenaTestConnectionInput,
  ): Promise<ApiResponse<ArenaTestConnectionResponse>> {
    try {
      const res = await axiosInstanceWithAuth.post<ArenaTestConnectionResponse>(
        "/arena/admin/models/test",
        input,
      );
      return handleResponse(res);
    } catch (error) {
      return handleError(error);
    }
  },
};

export default arena;
