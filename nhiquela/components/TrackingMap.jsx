// src/components/TrackingMap.jsx
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import io from 'socket.io-client';
import api from '../hooks/createConnectionApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * TrackingMap – displays the driver location in real time for a given order.
 * Now uses react-native-maps and OSRM routing.
 */
export default function TrackingMap({ orderId, destination, vehicleType, vehicleColor, onUpdateTracking, darkMode = false }) {
  const [driverLocation, setDriverLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [connected, setConnected] = useState(false);
  const [activeVehicleType, setActiveVehicleType] = useState(vehicleType || '');
  const [activeVehicleColor, setActiveVehicleColor] = useState(vehicleColor || '');
  const mapRef = useRef(null);

  // Fetch initial location of the driver on mount
  useEffect(() => {
    if (!orderId) return;

    const fetchInitialLocation = async () => {
      try {
        const storedUserData = await AsyncStorage.getItem('userData');
        const token = storedUserData ? JSON.parse(storedUserData).token : '';
        if (!token) return;

        const { data } = await api.get(`/tracking/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (data && data.latitude && data.longitude) {
          setDriverLocation({ latitude: data.latitude, longitude: data.longitude });
          if (data.vehicleType) setActiveVehicleType(data.vehicleType);
          if (data.vehicleColor) setActiveVehicleColor(data.vehicleColor);
          
          if (onUpdateTracking) {
            onUpdateTracking({
              speed: data.speed || 0,
              latitude: data.latitude,
              longitude: data.longitude
            });
          }
        }
      } catch (error) {
        console.log("Erro ao buscar localização inicial do motorista:", error.message);
      }
    };

    fetchInitialLocation();
  }, [orderId, onUpdateTracking]);

  useEffect(() => {
    if (!orderId) return;

    const isDev = process.env.NODE_ENV !== 'production';
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || (isDev ? 'http://192.168.0.2:5000' : 'https://api.nhiquelaservicos.com');
    const socketUrl = apiUrl.replace('/api', '');

    const socket = io(socketUrl, { transports: ['websocket'] });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.emit('joinRoom', { orderId });

    socket.on('driver_location_update', (data) => {
      setDriverLocation({ latitude: data.latitude, longitude: data.longitude });
      if (onUpdateTracking) {
        const speedKmH = data.speed ? data.speed * 3.6 : 0;
        onUpdateTracking({
          speed: speedKmH,
          latitude: data.latitude,
          longitude: data.longitude
        });
      }
    });

    return () => {
      socket.emit('leaveRoom', { orderId });
      socket.disconnect();
    };
  }, [orderId, onUpdateTracking]);

  // Fetch OSRM route when driver location and destination are available
  useEffect(() => {
    const fetchRoute = async () => {
      if (!driverLocation || !destination || !destination.latitude || !destination.longitude) return;

      try {
        const storedUserData = await AsyncStorage.getItem('userData');
        const token = storedUserData ? JSON.parse(storedUserData).token : '';
        
        const { data: result } = await api.get('/routing/route', {
          headers: { Authorization: `Bearer ${token}` },
          params: { 
            originLat: driverLocation.latitude, 
            originLng: driverLocation.longitude, 
            destLat: destination.latitude, 
            destLng: destination.longitude 
          }
        });

        if (result && result.coordinates) {
          const route = result.coordinates.map((coord) => ({
            latitude: coord[1],
            longitude: coord[0],
          }));
          setRouteCoordinates(route);

          if (onUpdateTracking) {
            onUpdateTracking({
              distance: result.distanceKm * 1000,
              duration: result.durationMinutes * 60,
            });
          }

          // Fit map to show both driver and destination
          if (mapRef.current) {
            mapRef.current.fitToCoordinates(
              [{ latitude: driverLocation.latitude, longitude: driverLocation.longitude }, { latitude: destination.latitude, longitude: destination.longitude }],
              {
                edgePadding: { top: 100, right: 50, bottom: 350, left: 50 },
                animated: true,
              }
            );
          }
        }
      } catch (error) {
        console.warn("Erro ao buscar rota OSRM no cliente:", error);
      }
    };

    // debounce um pouco para não chatear a api do OSRM se o condutor se mover mt rapido
    const timeoutId = setTimeout(() => {
      fetchRoute();
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [driverLocation, destination, onUpdateTracking]);

  const getVehicleIcon = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('moto') || t.includes('motocicleta') || t.includes('motorcycle') || t.includes('motorbike')) {
      return 'motorbike';
    }
    if (t.includes('reboque') || t.includes('tow')) {
      return 'tow-truck';
    }
    if (t.includes('camia') || t.includes('camião') || t.includes('truck') || t.includes('muda')) {
      return 'truck';
    }
    if (t.includes('bicicleta') || t.includes('bicycle') || t.includes('bike')) {
      return 'bicycle';
    }
    return 'car';
  };

  const getVehicleColor = (color) => {
    const c = (color || '').toLowerCase();
    const map = {
      'vermelho': '#EF4444',
      'azul': '#3B82F6',
      'verde': '#10B981',
      'preto': '#1E293B',
      'branco': '#94A3B8',
      'cinzento': '#64748B',
      'cinza': '#64748B',
      'amarelo': '#EAB308',
      'laranja': '#F97316',
      'castanho': '#78350F',
      'prata': '#94A3B8',
      'roxo': '#8B5CF6',
      'rosa': '#EC4899',
      'ouro': '#D97706',
    };
    return map[c] || '#9333EA';
  };

  // Fallback initial region to Maputo or destination
  const initialRegion = {
    latitude: destination?.latitude || -25.9655,
    longitude: destination?.longitude || 32.5832,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const activeColor = getVehicleColor(vehicleColor || activeVehicleColor);
  const activeIcon = getVehicleIcon(vehicleType || activeVehicleType);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation={false}
      >
        {destination && destination.latitude && destination.longitude && (
          <Marker
            coordinate={{ latitude: destination.latitude, longitude: destination.longitude }}
            anchor={{ x: 0.5, y: 1 }}
          >
             <View style={styles.destinationMarker}>
               <View style={styles.destinationInner} />
             </View>
          </Marker>
        )}

        {driverLocation && (
          <Marker
            coordinate={driverLocation}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[styles.vehicleMarkerContainer, { borderColor: activeColor }]}>
               <MaterialCommunityIcons 
                 name={activeIcon} 
                 size={22} 
                 color={activeColor} 
               />
            </View>
          </Marker>
        )}

        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#9333EA" // Cor lilas/roxo da Nhiquela
            strokeWidth={5}
          />
        )}
      </MapView>

      {!driverLocation && (
        <View style={[styles.loadingOverlay, darkMode && styles.darkOverlay]}>
          <ActivityIndicator size="large" color="#9333EA" />
          <Text style={[styles.loadingText, darkMode && styles.darkText]}>Aguardando localização do motorista...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkOverlay: {
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
  },
  loadingText: {
    marginTop: 10,
    color: '#333',
    fontWeight: '600',
  },
  darkText: {
    color: '#CCC',
  },
  destinationMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  destinationInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  vehicleMarkerContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  }
});
