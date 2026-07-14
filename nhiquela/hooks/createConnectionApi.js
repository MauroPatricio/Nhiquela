import axios from 'axios';

// Obtém a URL da variável de ambiente ou usa fallback
const isDev = process.env.NODE_ENV !== 'production';

// Para emuladores Android use 'http://10.0.2.2:5000/api'
// Para dispositivos físicos use o IP da máquina local (ex: 'http://10.94.223.176:5000/api')
const baseURL = process.env.EXPO_PUBLIC_API_URL || (isDev ? 'http://10.148.236.176:5000/api' : 'https://api.nhiquelaservicos.com/api');

const api = axios.create({
  baseURL,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.removeItem('userData');
        await AsyncStorage.removeItem('id');
        
        // Tentativa de navegar para login
        const { navigationRef } = require('../App');
        if (navigationRef && navigationRef.isReady()) {
          navigationRef.navigate('Login');
        }
      } catch (e) {
        // Ignorar erros de logout
      }
    }
    return Promise.reject(error);
  }
);

export default api;