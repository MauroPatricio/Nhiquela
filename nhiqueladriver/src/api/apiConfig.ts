import axios from 'axios';

// Define a URL base dinamicamente de acordo com o ambiente
const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://192.168.0.9:5000/api'  // IP local para desenvolvimento
  : 'https://deliveryshop.herokuapp.com/api'; // URL da produção

export const API_TIMEOUT = 5000;

// Cria instância Axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
});

export default api;
