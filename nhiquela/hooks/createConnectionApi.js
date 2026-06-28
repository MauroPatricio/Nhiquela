import axios from 'axios';

// Obtém a URL da variável de ambiente ou usa fallback
const isDev = process.env.NODE_ENV !== 'production';

// Para emuladores Android use 'http://10.0.2.2:5000/api'
// Para dispositivos físicos use o IP da máquina local (ex: 'http://192.168.0.2:5000/api')
const baseURL = process.env.EXPO_PUBLIC_API_URL || (isDev ? 'http://10.237.193.176:5000/api' : 'https://deliveryshop.herokuapp.com/api');

const api = axios.create({
  baseURL,
});

export default api;