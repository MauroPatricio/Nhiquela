import axios from 'axios';

// ---------------------------------------------------------------------
// 1️⃣ Configuração Automática de Ambiente (Auto QA / Gatekeeper)
// ---------------------------------------------------------------------
const isDev = process.env.NODE_ENV !== 'production';
const baseURL = process.env.EXPO_PUBLIC_API_URL || (isDev ? 'http://192.168.0.3:5000/api' : 'https://api.nhiquelaservicos.com/api');

// ---------------------------------------------------------------------
// 2️⃣ Instância do Axios
// ---------------------------------------------------------------------
const api = axios.create({ baseURL });

export default api;