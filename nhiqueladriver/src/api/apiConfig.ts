import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// ---------------------------------------------------------------------
// 1️⃣ Configuração Automática de Ambiente (Auto QA / Gatekeeper)
// ---------------------------------------------------------------------
const isDev = process.env.NODE_ENV !== 'production';
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || (isDev ? 'http://10.148.236.176:5000/api' : 'https://api.nhiquelaservicos.com/api');
export const API_TIMEOUT = 10000;

// ---------------------------------------------------------------------
// 2️⃣ Instância do Axios
// ---------------------------------------------------------------------
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
});

// ---------------------------------------------------------------------
// 3️⃣ Request Interceptor (Injetar Token Automático)
// ---------------------------------------------------------------------
api.interceptors.request.use(
  async (config) => {
    try {
      const userInfoString = await AsyncStorage.getItem('userInfo');
      if (userInfoString) {
        const userInfo = JSON.parse(userInfoString);
        if (userInfo.token) {
          config.headers.Authorization = `Bearer ${userInfo.token}`;
        }
      }
    } catch (error) {
      console.error('Error loading token in interceptor:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------
// 4️⃣ Response Interceptor (Gestão Global de Erros)
// ---------------------------------------------------------------------
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.error('⚠️ [API] Token expirado ou inválido (401). Log out necessário.');
      // Opcional: Implementar a lógica de force logout aqui ou disparar um evento global
    }
    return Promise.reject(error);
  }
);

export default api;
