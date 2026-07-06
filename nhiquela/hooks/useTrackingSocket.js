// src/hooks/useTrackingSocket.js
import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

/**
 * Hook to manage a Socket.IO connection for real‑time driver tracking.
 * @param {string} orderId - Unique identifier for the order/room.
 * @returns {{ driverLocation: { lat: number, lng: number } | null, eta: string | null }}
 */
export default function useTrackingSocket(orderId) {
  const socketRef = useRef(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [eta, setEta] = useState(null);

  useEffect(() => {
    // Initialise socket connection using the env var.
    const isDev = process.env.NODE_ENV !== 'production';
    let socketUrl = process.env.EXPO_PUBLIC_SOCKET_URL || process.env.REACT_APP_SOCKET_URL;
    if (!socketUrl) {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || (isDev ? 'http://192.168.0.2:5002' : 'https://api.nhiquelaservicos.com');
      socketUrl = apiUrl.replace('/api', '');
    }
    const socket = io(socketUrl, { transports: ['websocket'] });
    socketRef.current = socket;

    // Join a room specific to this order.
    socket.emit('joinRoom', { orderId });

    // Listen for location updates from the driver.
    socket.on('driverLocation', data => {
      // Expected payload: { lat, lng }
      setDriverLocation({ lat: data.lat, lng: data.lng });
    });

    // Listen for ETA updates.
    socket.on('etaUpdate', data => {
      // Expected payload: { eta: string }
      setEta(data.eta);
    });

    // Cleanup on unmount.
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leaveRoom', { orderId });
        socketRef.current.disconnect();
      }
    };
  }, [orderId]);

  return { driverLocation, eta };
}
