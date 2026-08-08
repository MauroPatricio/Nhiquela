// src/components/TrackingMap.jsx
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Image } from 'react-native';
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
  const [heading, setHeading] = useState(0);
  const headingRef = useRef(0);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const prevLocRef = useRef(null);
  const hasFittedInitial = useRef(false);

  const getBearing = (startLat, startLng, destLat, destLng) => {
    const toRad = deg => (deg * Math.PI) / 180;
    const toDeg = rad => (rad * 180) / Math.PI;

    const startLatRad = toRad(startLat);
    const startLngRad = toRad(startLng);
    const destLatRad = toRad(destLat);
    const destLngRad = toRad(destLng);

    const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
    const x = Math.cos(startLatRad) * Math.sin(destLatRad) -
      Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);

    const bearing = toDeg(Math.atan2(y, x));
    return (bearing + 360) % 360;
  };

  useEffect(() => {
    const loc = snappedDriverLocation || driverLocation;
    if (loc) {
      if (prevLocRef.current && (loc.latitude !== prevLocRef.current.latitude || loc.longitude !== prevLocRef.current.longitude)) {
        const newHeading = getBearing(prevLocRef.current.latitude, prevLocRef.current.longitude, loc.latitude, loc.longitude);
        // Só atualiza se a diferença for maior que 2 graus para evitar tremores
        if (Math.abs(newHeading - heading) > 2) {
          setHeading(newHeading);
          headingRef.current = newHeading;
        }
      }
      prevLocRef.current = loc;
    }
  }, [snappedDriverLocation, driverLocation]);

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
      // The parent component already dynamically passes the correct target as 'destination' based on stepStatus.
      const target = destination;
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
                pitch: 0,
                heading: headingRef.current,
                zoom: 18.5 // Zoom in closely
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
  }, [driverLocation, destination, origin, stepStatus]);

  // Reset zoom behavior when stepStatus changes so the map can show the new full route
  useEffect(() => {
    hasFittedInitial.current = false;
  }, [stepStatus]);

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

  const getVehicleImage = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('moto') || t.includes('motocicleta') || t.includes('motorcycle') || t.includes('motorbike')) {
      return require('../assets/vehicle/premium_moto.png');
    }
    if (t.includes('reboque') || t.includes('tow')) {
      return require('../assets/vehicle/reboque.jpg');
    }
    if (t.includes('camia') || t.includes('camião') || t.includes('truck') || t.includes('muda')) {
      return require('../assets/vehicle/truck.png');
    }
    if (t.includes('bicicleta') || t.includes('bicycle') || t.includes('bike')) {
      return require('../assets/vehicle/bycicle.png');
    }
    return require('../assets/vehicle/premium_car.png');
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

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsBuildings={true}
        shows3DBuildings={true}
        pitchEnabled={true}
        customMapStyle={darkMode ? premiumDarkMapStyle : []}
      >
        {/* Marcador da Origem (Ponto de recolha) */}
        {origin && (
          <Marker coordinate={origin} title="Origem">
            <View style={[styles.teardropPin, { backgroundColor: '#10B981' }]}>
              <View style={styles.teardropIconContainer}>
                <Ionicons name="flag" size={16} color="#FFF" />
              </View>
            </View>
          </Marker>
        )}

        {/* Marcador do Destino (Pode ser o cliente ou o destino final) */}
        {destination && (
          <Marker coordinate={destination} title="Destino">
            <View style={[styles.teardropPin, { backgroundColor: '#9333EA' }]}>
              <View style={styles.teardropIconContainer}>
                <Ionicons name="location" size={16} color="#FFF" />
              </View>
            </View>
          </Marker>
        )}

        {(snappedDriverLocation || driverLocation) && (
          <Marker
            coordinate={snappedDriverLocation || driverLocation}
            title="Motorista"
            pinColor={activeColor || "#3B82F6"}
          />
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
  teardropPin: {
    width: 32,
    height: 32,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 0,
    transform: [{ rotate: '-45deg' }],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  teardropIconContainer: {
    transform: [{ rotate: '45deg' }],
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumVehicleArrowContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
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
