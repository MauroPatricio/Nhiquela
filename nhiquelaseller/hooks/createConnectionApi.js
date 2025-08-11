import axios from 'axios';

let baseURL = '';

if (process.env.NODE_ENV === 'development') {
  baseURL = 'http://192.168.133.176:5000/api'; // ou localhost se estiver no navegador
} else {
  baseURL = 'https://deliveryshop.herokuapp.com/api';
}

const api = axios.create({ baseURL });

export default api;