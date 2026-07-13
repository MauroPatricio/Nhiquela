// src/components/TrackingMap.jsx
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import io from 'socket.io-client';
import api from '../hooks/createConnectionApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

/**
 * TrackingMap – displays the driver location in real time for a given order.
 * Now uses react-native-maps and OSRM routing.
 */
export default function TrackingMap({ orderId, destination, origin, stepStatus, vehicleType, vehicleColor, onUpdateTracking, darkMode = false }) {
  const [driverLocation, setDriverLocation] = useState(null);
  const [snappedDriverLocation, setSnappedDriverLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]); // Driver -> Target
  const [tripRouteCoordinates, setTripRouteCoordinates] = useState([]); // Origin -> Destination
  const [connected, setConnected] = useState(false);
  const [activeVehicleType, setActiveVehicleType] = useState(vehicleType || '');
  const [activeVehicleColor, setActiveVehicleColor] = useState(vehicleColor || '');
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const hasFittedInitial = useRef(false);

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
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || (isDev ? 'http://192.168.0.3:5000' : 'https://api.nhiquelaservicos.com');
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

  // Fetch OSRM route when driver location and target are available
  useEffect(() => {
    const fetchRoute = async () => {
      // Determine the target for the driver's route
      const target = stepStatus === 4 ? origin : destination;
      if (!driverLocation || !target || !target.latitude || !target.longitude) return;

      try {
        const storedUserData = await AsyncStorage.getItem('userData');
        const token = storedUserData ? JSON.parse(storedUserData).token : '';
        
        const { data: result } = await api.get('/routing/route', {
          headers: { Authorization: `Bearer ${token}` },
          params: { 
            originLat: driverLocation.latitude, 
            originLng: driverLocation.longitude, 
            destLat: target.latitude, 
            destLng: target.longitude 
          }
        });

        if (result && result.coordinates) {
          const route = result.coordinates.map((coord) => ({
            latitude: coord[1],
            longitude: coord[0],
          }));
          setRouteCoordinates(route);

          if (route.length > 0) {
            setSnappedDriverLocation(route[0]);
          }

          if (onUpdateTracking) {
            onUpdateTracking({
              distance: result.distanceKm * 1000,
              duration: result.durationMinutes * 60,
            });
          }

          // Acompanhar o motorista com zoom mais próximo (real time follow)
          if (mapRef.current) {
            if (!hasFittedInitial.current) {
               // First time: show the whole route
               mapRef.current.fitToCoordinates(
                 [{ latitude: driverLocation.latitude, longitude: driverLocation.longitude }, { latitude: target.latitude, longitude: target.longitude }],
                 {
                   edgePadding: { top: 100, right: 50, bottom: 350, left: 50 },
                   animated: true,
                 }
               );
               hasFittedInitial.current = true;
            } else if (route.length > 0) {
               // Follow the driver closely, using snapped location
               mapRef.current.animateCamera({
                 center: {
                   latitude: route[0].latitude,
                   longitude: route[0].longitude,
                 },
                 pitch: 45,
                 heading: driverLocation.heading || 0,
                 zoom: 17 // Zoom in closely
               }, { duration: 1000 });
            }
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
  }, [driverLocation, destination]); // Removido onUpdateTracking para evitar re-renders infinitos e timeouts cancelados

  // Fetch full trip route (Origin to Destination) - Useful for history and full context
  useEffect(() => {
    if (!origin || !destination || !origin.latitude || !destination.latitude) return;

    const fetchTripRoute = async () => {
      try {
        const storedUserData = await AsyncStorage.getItem('userData');
        const token = storedUserData ? JSON.parse(storedUserData).token : '';
        
        const { data: result } = await api.get('/routing/route', {
          headers: { Authorization: `Bearer ${token}` },
          params: { 
            originLat: origin.latitude, 
            originLng: origin.longitude, 
            destLat: destination.latitude, 
            destLng: destination.longitude 
          }
        });

        if (result && result.coordinates) {
          const route = result.coordinates.map((coord) => ({
            latitude: coord[1],
            longitude: coord[0],
          }));
          setTripRouteCoordinates(route);
          
          // Fit map to show the whole trip if driver location is not yet available
          if (!driverLocation && mapRef.current && !hasFittedInitial.current) {
             mapRef.current.fitToCoordinates(
               [{ latitude: origin.latitude, longitude: origin.longitude }, { latitude: destination.latitude, longitude: destination.longitude }],
               {
                 edgePadding: { top: 100, right: 50, bottom: 350, left: 50 },
                 animated: true,
               }
             );
             hasFittedInitial.current = true;
          }
        }
      } catch (error) {
        console.warn("Erro ao buscar rota completa da viagem:", error);
      }
    };

    fetchTripRoute();
  }, [origin?.latitude, origin?.longitude, destination?.latitude, destination?.longitude]);

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
        {/* Marcador da Origem (Ponto de recolha) */}
        {origin && (
          <Marker coordinate={origin} title="Origem">
            <View style={[styles.destinationMarker, { backgroundColor: '#10B981' }]}>
              <Ionicons name="flag" size={24} color="#FFF" />
            </View>
          </Marker>
        )}

        {/* Marcador do Destino (Pode ser o cliente ou o destino final) */}
        {destination && (
          <Marker coordinate={destination} title="Destino">
            <View style={styles.destinationMarker}>
              <Ionicons name="location" size={24} color="#FFF" />
            </View>
          </Marker>
        )}

        {(snappedDriverLocation || driverLocation) && (
          <Marker
            coordinate={snappedDriverLocation || driverLocation}
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

        {/* 🔥 Full Trip Route (Origin -> Destination) for history and context */}
        {tripRouteCoordinates.length > 0 && (
          <Polyline
            coordinates={tripRouteCoordinates}
            strokeColor="#D8B4FE" // Lighter purple for the background full route
            strokeWidth={4}
            lineDashPattern={[1]}
          />
        )}

        {/* 🔥 Driver Route (Driver -> Target) */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#A855F7" // Strong purple for the active driver route
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
