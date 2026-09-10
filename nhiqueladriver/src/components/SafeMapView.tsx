// src/components/SafeMapView.tsx
// Pure fallback components — does NOT import react-native-maps at all.
// This prevents the Metro bundler from including the native module,
// which crashes in Expo Go where the native binary isn't available.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const isMapAvailable = false;

// Fallback MapView
export function SafeMapView({ children, style, ...props }: any) {
  return (
    <View style={[styles.fallback, style]}>
      <Ionicons name="map-outline" size={48} color="#9333EA" />
      <Text style={styles.fallbackTitle}>Mapa</Text>
      <Text style={styles.fallbackText}>
        Funcionalidade de mapa disponível na versão final (APK/IPA).
      </Text>
      {children}
    </View>
  );
}

// No-op Marker
export function SafeMarker(props: any) {
  return null;
}

// No-op MapViewDirections
export function SafeMapViewDirections(props: any) {
  return null;
}

// No-op Camera (used in Driver App)
export function SafeCamera(props: any) {
  return null;
}

// No-op UrlTile (used in Driver App)
export function SafeUrlTile(props: any) {
  return null;
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F0FF',
    borderRadius: 16,
    padding: 24,
  },
  fallbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
  },
  fallbackText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});

export default SafeMapView;
