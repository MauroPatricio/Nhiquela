import axios from 'axios';

// ---------------------------------------------------------------------
// 1️⃣ Configuração Automática de Ambiente (Auto QA / Gatekeeper)
// ---------------------------------------------------------------------
const isDev = process.env.NODE_ENV !== 'production';
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || (isDev ? 'http://10.237.193.176:5000/api' : 'https://deliveryshop.herokuapp.com/api');
export const API_TIMEOUT = 10000;

// ---------------------------------------------------------------------
// 2️⃣ Instância do Axios
// ---------------------------------------------------------------------
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
});

export default api;
