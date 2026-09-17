// src/hooks/useDriverTracking.js
import * as Location from 'expo-location';
import api from '../hooks/createConnectionApi'; // Axios instance
import websocketService from '../websocketService/websocketService';

/**
 * Hook to watch driver location and broadcast it.
 * @param {string} orderId - Current order identifier.
 * @param {number} [interval=5000] - Update interval in ms.
 */
export const useDriverTracking = (orderId, interval = 5000) => {
  // Start tracking when hook is invoked
  const start = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.error('Location permission not granted');
      return;
    }

    // Join socket room for this order (if needed)
    if (websocketService && websocketService.socket) {
      websocketService.socket.emit('join', `order_${orderId}`);
    }

    // Initial position fetch
    const initial = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = initial.coords;
    await _sendUpdate(latitude, longitude);

    // Watch position
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: interval,
        distanceInterval: 5,
      },
      async location => {
        const { latitude, longitude } = location.coords;
        await _sendUpdate(latitude, longitude);
      }
    );
    return subscription; // caller can remove later
  };

  const _sendUpdate = async (lat, lng) => {
    try {
      await api.post('/tracking/update', {
        orderId,
        latitude: lat,
        longitude: lng,
      });
      // Emit via socket for realtime UI
      if (websocketService && websocketService.socket) {
        websocketService.socket.emit('trackingUpdate', {
          orderId,
          latitude: lat,
          longitude: lng,
        });
      }
    } catch (e) {
      console.error('Failed to send driver location', e);
    }
  };

  return { start };
};
