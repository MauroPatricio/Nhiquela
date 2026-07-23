import axios from "axios";
import { API_BASE_URL, API_TIMEOUT } from "./apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("authToken");
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
    if (error.message !== 'Network Error') {
      // Usar console.warn em vez de console.error para evitar o Red Screen no React Native para erros tratados
      console.warn("API Error:", error.response?.data?.message || error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
