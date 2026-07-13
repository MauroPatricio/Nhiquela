// 📁 src/services/websocketService.js
import { io } from 'socket.io-client';

import { API_BASE_URL } from '../api/apiConfig';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    // Pega o mesmo URL do apiConfig e tira o /api no final
    let API_URL = API_BASE_URL;
    API_URL = API_URL.replace('/api', '');
    this.baseURL = API_URL;
  }

  connect(token, user = null) {
    this.currentUser = user;

    // 🔥 Se já ligado: apenas actualiza o utilizador e emite onLogin de novo
    // para garantir que o motorista entra na sala correcta
    if (this.socket && this.isConnected) {
      if (user) {
        this.socket.emit('onLogin', user);
      }
      return;
    }

    if (this.socket) {
      this.disconnect();
    }
    
    this.socket = io(this.baseURL, {
      auth: { token: token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('🔌 WebSocket conectado');
      this.isConnected = true;
      // 🔥 Entrar na sala do motorista imediatamente
      if (this.currentUser) {
        this.socket.emit('onLogin', this.currentUser);
        console.log('📡 onLogin emitido para:', this.currentUser._id);
      }
      this.emit('connect');
    });

    this.socket.on('reconnect', () => {
      console.log('🔌 WebSocket reconectado');
      this.isConnected = true;
      // 🔥 Re-entrar na sala após reconexão
      if (this.currentUser) {
        this.socket.emit('onLogin', this.currentUser);
      }
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

    // 🔥 Notificação quando outro motorista aceita um pedido que estava disponível para mim
    this.socket.on('order_taken', (data) => {
      console.log('🚫 Pedido aceite por outro motorista:', data);
      this.emit('order_taken', data);
    });

    this.socket.on('new_order', (data) => {
      console.log('🆕 Novo pedido disponível (Despacho Inteligente):', data);
      this.emit('new_order', data);
    });

    this.socket.on('no_driver_found', (data) => {
      console.log('❌ Nenhum motorista encontrado para o pedido:', data);
      this.emit('no_driver_found', data);
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

  sendLocation(data) {
    if (this.socket && this.isConnected) {
      this.socket.emit('update_location', data);
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