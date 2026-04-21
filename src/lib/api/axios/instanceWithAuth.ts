import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosInstance,
  AxiosRequestConfig,
} from "axios";
import appConfig from "@/config/appConfig";

import authStrategy from "../authStrategy";

export interface AuthStrategy {
  /** Return the current access token or null if none is present */
  getAccessToken(): Promise<string | null>;

  /** Refresh the access token and return the new one (reject if refresh fails) */
  refreshAccessToken(): Promise<string>;

  /** Final clean-up when authentication can no longer be recovered */
  signOut(): void;

  /** How many times to retry a request after 401 (default = 1) */
  maxRetries?: number;
}

interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  _retryCount?: number;
}

export function createAxiosWithAuth(
  auth: AuthStrategy,
  baseURL: string = appConfig.apiBaseUrl,
): AxiosInstance {
  const instance = axios.create({ baseURL });

  instance.interceptors.request.use(async (cfg) => {
    const token = await auth.getAccessToken();
    if (token) {
      if (!cfg.headers) cfg.headers = new AxiosHeaders();
      cfg.headers["Authorization"] = `Bearer ${token}`;
    }
    return cfg;
  });

  let isRefreshing = false;
  let queue: { resolve: (t: string) => void; reject: (e: any) => void }[] = [];

  const processQueue = (error: any, token: string | null = null) => {
    queue.forEach((p) =>
      error ? p.reject(error) : p.resolve(token as string),
    );
    queue = [];
  };

  instance.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const { response, config } = error;
      const original = config as ExtendedAxiosRequestConfig;

      if (response?.status !== 401) return Promise.reject(error);

      /* Initialize / increment retry counter */
      original._retryCount = (original._retryCount ?? 0) + 1;

      if (original._retryCount > (auth.maxRetries ?? 1)) {
        auth.signOut();
        return Promise.reject(error);
      }

      /* -------------------------------------------------------------- */
      /*  Parallel-refresh guard                                        */
      /* -------------------------------------------------------------- */
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers = {
              ...original.headers,
              Authorization: `Bearer ${token}`,
            };
            return instance(original);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      /* -------------------------------------------------------------- */
      /*  Run the refresh flow                                          */
      /* -------------------------------------------------------------- */
      try {
        isRefreshing = true;
        const newToken = await auth.refreshAccessToken();
        processQueue(null, newToken);

        /* Retry original request with new token */
        original.headers = {
          ...original.headers,
          Authorization: `Bearer ${newToken}`,
        };
        return instance(original).catch((err) => Promise.reject(err));
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        auth.signOut();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    },
  );

  return instance;
}

const axiosWithAuth = createAxiosWithAuth(authStrategy, appConfig.apiBaseUrl);

export default axiosWithAuth;
