import axios from 'axios';

// Mantemos idêntico à configuração da app Mobile (createConnectionApi.js)
const isDev = import.meta.env.DEV;
export const SOCKET_URL = import.meta.env.VITE_API_URL || (isDev ? 'http://localhost:5000' : 'https://api.nhiquelaservicos.com');
const baseURL = `${SOCKET_URL}/api`;

const api = axios.create({
  baseURL,
});

// Adiciona o token JWT a todas as requisições, se existir
api.interceptors.request.use(
  (config) => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const parsedUser = JSON.parse(userInfo);
      if (parsedUser.token) {
        config.headers.Authorization = `Bearer ${parsedUser.token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
