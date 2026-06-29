// src/components/TrackingMap.jsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import io from 'socket.io-client';

/**
 * TrackingMap – displays the driver location in real time for a given order.
 * Uses a lightweight View-based display instead of MapView to avoid
 * native module issues in Expo Go.
 */
export default function TrackingMap({ orderId, initialCenter, darkMode = false }) {
  const [driverLocation, setDriverLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const [connected, setConnected] = useState(false);

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
      setDriverLocation({ lat: data.lat, lng: data.lng });
    });

    socket.on('etaUpdate', (data) => {
      setEta(data.eta);
    });

    return () => {
      socket.emit('leaveRoom', { orderId });
      socket.disconnect();
    };
  }, [orderId]);

  return (
    <View style={[styles.container, darkMode && styles.darkContainer]}>
      <View style={styles.statusBar}>
        <View style={[styles.dot, connected ? styles.dotConnected : styles.dotDisconnected]} />
        <Text style={[styles.statusText, darkMode && styles.darkText]}>
          {connected ? 'Rastreamento ativo' : 'A conectar...'}
        </Text>
      </View>

      <View style={styles.infoContainer}>
        <Ionicons name="navigate-circle" size={48} color="#9333EA" />
        {driverLocation ? (
          <View style={styles.locationInfo}>
            <Text style={[styles.label, darkMode && styles.darkText]}>Motorista em movimento</Text>
            <Text style={styles.coords}>
              {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}
            </Text>
            {eta && (
              <View style={styles.etaBadge}>
                <Ionicons name="time" size={14} color="#FFF" />
                <Text style={styles.etaText}>ETA: {eta}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.locationInfo}>
            <Text style={[styles.label, darkMode && styles.darkText]}>A aguardar localização do motorista...</Text>
            <ActivityIndicator size="small" color="#9333EA" style={{ marginTop: 8 }} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
  },
  darkContainer: {
    backgroundColor: '#1A1A2E',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  dotConnected: {
    backgroundColor: '#10B981',
  },
  dotDisconnected: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  darkText: {
    color: '#CCC',
  },
  infoContainer: {
    alignItems: 'center',
  },
  locationInfo: {
    alignItems: 'center',
    marginTop: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  coords: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9333EA',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  etaText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 6,
  },
});
