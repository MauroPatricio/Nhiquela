import axios from 'axios';

import Constants from 'expo-constants';

// ---------------------------------------------------------------------
// 1️⃣ Definir a URL base da API (hardcoded)
// ---------------------------------------------------------------------
const baseURL = process.env.NODE_ENV === 'production'
  ? 'https://deliveryshop.herokuapp.com/api'
  : 'http://localhost:5000/api';

// ---------------------------------------------------------------------
// 2️⃣ Cria a instância do Axios
// ---------------------------------------------------------------------
const api = axios.create({ baseURL });

export default api;