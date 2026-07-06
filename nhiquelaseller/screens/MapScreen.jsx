import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useDispatch, useSelector } from 'react-redux';
import { selectOrigin, setOrigin } from '../features/navSlice';
import Map from '../components/Map';
import { COLORS, SIZES, RADIUS, SHADOWS } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';

const MapScreen = () => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  
  const dispatch = useDispatch();
  const navigation = useNavigation();

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permissão de acesso à localização negada.');
        return;
      }

      try {
        let currentLocation = await Location.getCurrentPositionAsync({
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 1000
        });

        dispatch(setOrigin({
          location: {
            lat: currentLocation.coords.latitude,
            lng: currentLocation.coords.longitude
          },
          description: currentLocation.description || 'Sua localização atual'
        }));
        
        setLocation(currentLocation);
      } catch (error) {
        setErrorMsg(error.message);
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <Map />
      </View>

      <SafeAreaView style={styles.overlayUI}>
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.goBack()}>
            <Ionicons name='arrow-back' size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.searchBar}>
            <Ionicons name='location-outline' size={20} color={COLORS.primaryLight} style={{ marginRight: 8 }} />
            <TextInput 
              style={styles.searchInput}
              placeholder='Posição actual'
              placeholderTextColor={COLORS.textMuted}
              editable={false}
              value={location ? 'Localização atual' : 'A procurar...'}
            />
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.bottomCard}>
        <View style={styles.dragHandle} />
        <Text style={styles.cardTitle}>Onde quer entregar?</Text>
        
        <TouchableOpacity style={styles.destBar} activeOpacity={0.8}>
          <Ionicons name='search' size={20} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
          <TextInput 
            style={styles.searchInput}
            placeholder='Pesquisar local de destino...'
            placeholderTextColor={COLORS.textMuted}
            editable={false}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default MapScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mapContainer: {
    flex: 1,
  },
  overlayUI: {
    position: 'absolute',
    top: 0,
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  searchInput: {
    flex: 1,
    fontSize: SIZES.sm,
    color: COLORS.text,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: COLORS.surfaceCard,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOWS.lg,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  destBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    height: 50,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  }
});