import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/apiConfig';

export const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('❌ Background Location Task Error:', error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    const loc = locations[0];
    
    if (loc) {
      try {
        const userInfoStr = await AsyncStorage.getItem('userInfo');
        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr);
          if (userInfo && userInfo.token) {
            // Fetch acceptedTrip from local storage if possible, or omit orderId if your tracking logic doesn't require it
            const orderIdStr = await AsyncStorage.getItem('currentOrderId');
            const orderId = orderIdStr ? JSON.parse(orderIdStr) : null;
            
            await api.post('/tracking/update', {
              orderId: orderId,
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            }, {
              headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            console.log('✅ Background location sent to server:', loc.coords.latitude, loc.coords.longitude);
          }
        }
      } catch (err) {
        console.error('❌ Failed to update location in background:', err);
      }
    }
  }
});

export const startBackgroundLocationUpdates = async () => {
  try {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.warn('Foreground location permission denied.');
      return;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.warn('Background location permission denied.');
      return;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (!isRegistered) {
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000,
        distanceInterval: 10, // meters
        deferredUpdatesInterval: 10000,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: "Nhiquela Driver",
          notificationBody: "Compartilhando localização em segundo plano",
          notificationColor: "#9333EA",
        }
      });
      console.log('✅ Background location task registered.');
    }
  } catch (error) {
    console.error('❌ Error starting background location:', error);
  }
};

export const stopBackgroundLocationUpdates = async () => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log('🛑 Background location task stopped.');
    }
  } catch (error) {
    console.error('❌ Error stopping background location:', error);
  }
};
