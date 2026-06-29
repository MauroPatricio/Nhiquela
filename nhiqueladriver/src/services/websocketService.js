// 📁 src/services/websocketService.js
import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    const isDev = process.env.NODE_ENV !== 'production';
    // Pega o mesmo URL do apiConfig, mas tira o /api no final se existir
    let API_URL = process.env.EXPO_PUBLIC_API_URL || (isDev ? 'http://192.168.0.2:5000/api' : 'https://api.nhiquelaservicos.com/api');
    API_URL = API_URL.replace('/api', '');
    this.baseURL = API_URL;
  }

  connect(token) {
    if (this.socket) {
      this.disconnect();
    }
    
    this.socket = io(this.baseURL, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('🔌 WebSocket conectado');
      this.isConnected = true;
      this.emit('connect');
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 WebSocket desconectado');
      this.isConnected = false;
      this.emit('disconnect');
    });

    this.socket.on('order_updated', (data) => {
      console.log('📦 Atualização em tempo real recebida:', data);
      this.emit('order_updated', data);
    });

    this.socket.on('order_assigned', (data) => {
      console.log('🎯 Pedido atribuído em tempo real:', data);
      this.emit('order_assigned', data);
    });

    // 🔔 Notificação em tempo real quando o admin aprova/rejeita a conta
    this.socket.on('driver_status_updated', (data) => {
      console.log('🔔 Estado do motorista atualizado pelo admin:', data);
      this.emit('driver_status_updated', data);
    });

    this.socket.on('error', (error) => {
      console.error('❌ Erro WebSocket:', error);
      this.emit('error', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Erro no listener do evento ${event}:`, error);
        }
      });
    }
  }
}

export default new WebSocketService();