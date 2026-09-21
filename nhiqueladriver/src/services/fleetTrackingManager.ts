import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../api/apiConfig';
import websocketService from './websocketService';

const PENDING_LOCATIONS_KEY = '@driver_pending_locations';
let locationTimer: any = null;
let currentTrackingState = 'OFFLINE';

export type TrackingState =
  | 'TRACKING_ACTIVE'
  | 'TRACKING_PAUSED'
  | 'GPS_UNAVAILABLE'
  | 'NETWORK_UNAVAILABLE'
  | 'TRACKING_ERROR'
  | 'OFFLINE';

export const getTrackingState = (): TrackingState => {
  return currentTrackingState as TrackingState;
};

// Iniciar Rastreamento Operacional de Frota
export const startFleetTracking = async (vehicleId?: string): Promise<boolean> => {
  try {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      currentTrackingState = 'GPS_UNAVAILABLE';
      return false;
    }

    currentTrackingState = 'TRACKING_ACTIVE';

    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      fetch(`${API_BASE_URL}/fleet/tracking/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vehicleId }),
      }).catch((err) => console.log('[FleetTracking] Erro ao iniciar sessão no backend:', err.message));
    }

    // Iniciar loop de captura periódica (a cada 10 segundos)
    if (locationTimer) clearInterval(locationTimer);

    locationTimer = setInterval(async () => {
      await captureAndProcessLocation();
    }, 10000);

    // Capturar imediatamente no arranque
    captureAndProcessLocation();
    return true;
  } catch (error) {
    console.error('[FleetTracking] Erro ao iniciar tracking:', error);
    currentTrackingState = 'TRACKING_ERROR';
    return false;
  }
};

// Parar Rastreamento Operacional de Frota
export const stopFleetTracking = async (): Promise<void> => {
  try {
    if (locationTimer) {
      clearInterval(locationTimer);
      locationTimer = null;
    }

    currentTrackingState = 'OFFLINE';

    // Tentar enviar todos os pontos pendentes antes de fechar a sessão
    await syncPendingLocations();

    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      const loc = await Location.getLastKnownPositionAsync().catch(() => null);
      fetch(`${API_BASE_URL}/fleet/tracking/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude: loc?.coords?.latitude,
          longitude: loc?.coords?.longitude,
        }),
      }).catch((err) => console.log('[FleetTracking] Erro ao encerrar sessão no backend:', err.message));
    }
  } catch (error) {
    console.error('[FleetTracking] Erro ao parar tracking:', error);
  }
};

// Capturar Localização Atual e Enviar / Enfileirar
const captureAndProcessLocation = async () => {
  try {
    let loc = await Location.getLastKnownPositionAsync().catch(() => null);
    if (!loc) {
      loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
    }

    if (!loc || !loc.coords) {
      currentTrackingState = 'GPS_UNAVAILABLE';
      return;
    }

    const { latitude, longitude, accuracy, speed, heading, altitude } = loc.coords;

    // Ignorar posições com precisão muito baixa (> 100m)
    if (accuracy && accuracy > 100) {
      return;
    }

    const speedKmh = Math.max(0, Math.round((speed || 0) * 3.6));
    const pointPayload = {
      locationId: `loc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      latitude,
      longitude,
      accuracy: accuracy || 10,
      speedKmh,
      heading: heading || 0,
      altitude: altitude || 0,
      provider: 'mobile_gps',
      capturedAt: new Date().toISOString(),
    };

    // Enviar por Socket em tempo real se disponível
    websocketService.sendLocation({
      latitude,
      longitude,
      speed: speedKmh,
      heading: heading || 0,
      timestamp: pointPayload.capturedAt,
    });

    // Enviar ponto para o backend via REST
    const token = await AsyncStorage.getItem('authToken');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/fleet/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(pointPayload),
      });

      if (res.ok) {
        currentTrackingState = 'TRACKING_ACTIVE';
        // Se a internet voltou, tenta descarregar a fila offline acumulada
        await syncPendingLocations();
      } else {
        // Falha no servidor -> guarda localmente
        await enqueuePendingLocation(pointPayload);
      }
    } catch (netErr) {
      // Sem internet -> guarda localmente na fila offline
      currentTrackingState = 'NETWORK_UNAVAILABLE';
      await enqueuePendingLocation(pointPayload);
    }
  } catch (error) {
    console.error('[FleetTracking] Erro na captura de localização:', error);
  }
};

// Adicionar ponto à fila offline local
const enqueuePendingLocation = async (point: any) => {
  try {
    const raw = await AsyncStorage.getItem(PENDING_LOCATIONS_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    queue.push(point);

    // Manter no máximo 1000 pontos offline para evitar sobrecarregar armazenamento
    if (queue.length > 1000) queue.shift();

    await AsyncStorage.setItem(PENDING_LOCATIONS_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('[FleetTracking] Erro ao enfileirar ponto offline:', e);
  }
};

// Sincronizar Fila de Localizações Offline Pendentes
export const syncPendingLocations = async (): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(PENDING_LOCATIONS_KEY);
    if (!raw) return;

    const queue = JSON.parse(raw);
    if (!Array.isArray(queue) || queue.length === 0) return;

    const token = await AsyncStorage.getItem('authToken');
    if (!token) return;

    const res = await fetch(`${API_BASE_URL}/fleet/location/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ points: queue }),
    });

    if (res.ok) {
      // Sincronização concluída -> limpa fila local
      await AsyncStorage.removeItem(PENDING_LOCATIONS_KEY);
      currentTrackingState = 'TRACKING_ACTIVE';
    }
  } catch (e) {
    console.log('[FleetTracking] Tentativa de sync offline pendente agendada para o próximo ciclo.');
  }
};
