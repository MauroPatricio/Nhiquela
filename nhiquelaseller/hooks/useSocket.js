import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from 'react-native-toast-notifications';
import api from './createConnectionApi';

export default function useSocket() {
  const [socketInstance, setSocketInstance] = useState(null);
  const toast = useToast();

  useEffect(() => {
    let socket;

    const setupSocket = async () => {
      try {
        const userId = await AsyncStorage.getItem('id');
        
        if (!userId) return;

        let socketUrl = process.env.EXPO_PUBLIC_SOCKET_URL || api.defaults.baseURL.replace('/api', '');
        
        socket = io(socketUrl, { 
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
        });

        setSocketInstance(socket);

        socket.on('connect', () => {
          console.log('🔗 Sockets Conectados (Seller). ID:', socket.id);
          // O backend irá juntá-lo à sala `seller_${userId}` via o evento de login
          socket.emit('onLogin', { _id: userId, isSeller: true });
        });

        // Eventos
        socket.on('new_order', (data) => {
          if (toast && typeof toast.show === 'function') {
            toast.show('🎉 Você tem um novo pedido!', {
              type: 'success',
              duration: 5000,
              placement: 'top',
            });
          }
        });

        socket.on('order_paid', (data) => {
          if (toast && typeof toast.show === 'function') {
            toast.show('💰 Um pedido foi pago e aguarda a sua ação!', {
              type: 'info',
              duration: 5000,
              placement: 'top',
            });
          }
        });

      } catch (err) {
        console.error('Erro ao configurar socket:', err);
      }
    };

    setupSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  return socketInstance;
}
