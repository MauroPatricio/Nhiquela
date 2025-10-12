import io from 'socket.io-client';

class WebsocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  connect(token) {
    try {
      // Substitua pela URL do seu servidor WebSocket
      const SOCKET_URL = 'http://localhost:3000'; // ou sua URL de produção
      
      this.socket = io(SOCKET_URL, {
        auth: {
          token: token
        },
        transports: ['websocket']
      });

      this.setupEventListeners();
    } catch (error) {
      console.error('❌ Erro ao conectar WebSocket:', error);
    }
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Conectado ao servidor WebSocket');
      this.isConnected = true;
      this.emit('connect');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('⚠️ Desconectado do servidor WebSocket:', reason);
      this.isConnected = false;
      this.emit('disconnect');
    });

    this.socket.on('error', (error) => {
      console.error('❌ Erro WebSocket:', error);
      this.emit('error', error);
    });

    this.socket.on('order_updated', (data) => {
      console.log('🔄 Pedido atualizado via WebSocket:', data);
      this.emit('order_updated', data);
    });

    this.socket.on('order_assigned', (data) => {
      console.log('🎯 Pedido atribuído via WebSocket:', data);
      this.emit('order_assigned', data);
    });

    this.socket.on('order_cancelled', (data) => {
      console.log('❌ Pedido cancelado via WebSocket:', data);
      this.emit('order_cancelled', data);
    });
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Erro no listener do evento ${event}:`, error);
        }
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
    this.listeners.clear();
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

export default new WebsocketService();