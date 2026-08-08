import axios from "axios";
import { API_BASE_URL, API_TIMEOUT, getCachedToken, invalidateTokenCache } from "./apiConfig";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

// ⚡ Usar cache de token — sem I/O bloqueante por request
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getCachedToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      invalidateTokenCache();
    }
    if (error.message !== 'Network Error') {
      console.warn("API Error:", error.response?.data?.message || error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
