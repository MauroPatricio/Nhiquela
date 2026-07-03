// src/components/TrackingMap.jsx
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import io from 'socket.io-client';

/**
 * TrackingMap – displays the driver location in real time for a given order.
 * Now uses react-native-maps and OSRM routing.
 */
export default function TrackingMap({ orderId, destination, darkMode = false }) {
  const [driverLocation, setDriverLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [connected, setConnected] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!orderId) return;

    const isDev = process.env.NODE_ENV !== 'production';
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || (isDev ? 'http://192.168.0.2:5000' : 'https://api.nhiquelaservicos.com');
    const socketUrl = apiUrl.replace('/api', '');

    const socket = io(socketUrl, { transports: ['websocket'] });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.emit('joinRoom', { orderId });

    socket.on('driverLocation', (data) => {
      setDriverLocation({ latitude: data.lat, longitude: data.lng });
    });

    return () => {
      socket.emit('leaveRoom', { orderId });
      socket.disconnect();
    };
  }, [orderId]);

  // Fetch OSRM route when driver location and destination are available
  useEffect(() => {
    const fetchRoute = async () => {
      if (!driverLocation || !destination || !destination.latitude || !destination.longitude) return;

      try {
        const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${driverLocation.longitude},${driverLocation.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
        const response = await fetch(osrmUrl);
        const json = await response.json();

        if (json.routes && json.routes.length > 0) {
          const route = json.routes[0].geometry.coordinates.map((coord) => ({
            latitude: coord[1],
            longitude: coord[0],
          }));
          setRouteCoordinates(route);

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

    // debounce um pouco para nao chatear a api do OSRM se o condutor se mover mt rapido
    const timeoutId = setTimeout(() => {
      fetchRoute();
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [driverLocation, destination]);

  // Fallback initial region to Maputo or destination
  const initialRegion = {
    latitude: destination?.latitude || -25.9655,
    longitude: destination?.longitude || 32.5832,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

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
            <View style={styles.carMarker}>
               {/* Simples representacao de carro se nao houver imagem, ou podemos por icon */}
               <View style={styles.carInner} />
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
  carMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(147, 51, 234, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#9333EA',
  },
  carInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#9333EA',
  }
});
