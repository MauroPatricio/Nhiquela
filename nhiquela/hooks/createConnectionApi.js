import axios from 'axios';

// Obtém a URL da variável de ambiente ou usa fallback
const isDev = process.env.NODE_ENV !== 'production';

// Para emuladores Android use 'http://10.0.2.2:5000/api'
// Para dispositivos físicos use o IP da máquina local (ex: 'http://192.168.0.2:5000/api')
const baseURL = process.env.EXPO_PUBLIC_API_URL || (isDev ? 'https://api.nhiquelaservicos.com/api' : 'https://api.nhiquelaservicos.com/api');

const api = axios.create({
  baseURL,
});

export default api;