import axios from 'axios';

// Define a URL base dinamicamente de acordo com o ambiente
export const API_BASE_URL = __DEV__ 
  ? 'http://192.168.0.6:5000/api'  // IP local para desenvolvimento
  : 'http://192.168.0.6:5000/api'; // Forçar ambiente local por agora

export const API_TIMEOUT = 5000;

// Cria instância Axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
});

export default api;
