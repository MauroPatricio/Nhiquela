import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------
// 1️⃣ Configuração Automática de Ambiente
// ---------------------------------------------------------------------
const isDev = process.env.NODE_ENV !== 'production';
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || (isDev ? 'http://192.168.0.2:5000/api' : 'https://api.nhiquelaservicos.com/api');
export const API_TIMEOUT = 10000;

// ---------------------------------------------------------------------
// ⚡ Cache de token em memória — evita leituras de AsyncStorage em cada request
// (AsyncStorage é I/O assíncrono e pode demorar 10-50ms por chamada)
// ---------------------------------------------------------------------
let _cachedToken: string | null = null;
let _tokenLastRead = 0;
const TOKEN_CACHE_TTL = 60000; // Reler do AsyncStorage apenas 1x por minuto

export const getCachedToken = async (): Promise<string | null> => {
  const now = Date.now();
  if (_cachedToken && now - _tokenLastRead < TOKEN_CACHE_TTL) {
    return _cachedToken; // Retorno instantâneo do cache
  }
  try {
    // Tentar @app:user primeiro (AuthContext)
    const userInfoString = await AsyncStorage.getItem('@app:user');
    if (userInfoString) {
      const userInfo = JSON.parse(userInfoString);
      if (userInfo.token) {
        _cachedToken = userInfo.token;
        _tokenLastRead = now;
        return _cachedToken;
      }
    }
    // Fallback: chave legada 'authToken'
    const legacyToken = await AsyncStorage.getItem('authToken');
    if (legacyToken) {
      _cachedToken = legacyToken;
      _tokenLastRead = now;
      return _cachedToken;
    }
  } catch (error) {
    console.error('Error loading token:', error);
  }
  return null;
};

// Chamar após login/logout para forçar releitura
export const invalidateTokenCache = () => {
  _cachedToken = null;
  _tokenLastRead = 0;
};

// ---------------------------------------------------------------------
// 2️⃣ Instância do Axios
// ---------------------------------------------------------------------
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
});

// ---------------------------------------------------------------------
// 3️⃣ Request Interceptor (Token com Cache — sem I/O bloqueante)
// ---------------------------------------------------------------------
api.interceptors.request.use(
  async (config) => {
    const token = await getCachedToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---------------------------------------------------------------------
// 4️⃣ Response Interceptor
// ---------------------------------------------------------------------
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.error('⚠️ [API] Token expirado (401) — cache invalidado.');
      invalidateTokenCache();
    }
    return Promise.reject(error);
  }
);

export default api;
