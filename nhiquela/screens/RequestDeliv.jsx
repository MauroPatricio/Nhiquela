import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Modal,
  Dimensions,
  PanResponder,
  Keyboard,
  LogBox
} from 'react-native';

LogBox.ignoreLogs(['VirtualizedLists should never be nested']);

const originalConsoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('VirtualizedLists should never be nested')) {
    return;
  }
  originalConsoleError(...args);
};
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../hooks/createConnectionApi';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { EXPO_GOOGLE_MAPS_APIKEY } from '@env';

export default function RequestDelivSimple() {
  const navigation = useNavigation();
  const route = useRoute();

  const service = route.params?.selectedService;

  const [step, setStep] = useState(1);
  const [location, setLocation] = useState(null);

  const [reason, setReason] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  
  const [originCoord, setOriginCoord] = useState(null);
  const [destCoord, setDestCoord] = useState(null);
  
  // Radar Search State
  const [radius, setRadius] = useState(5);
  const [isSearching, setIsSearching] = useState(false);
  const [showBusyModal, setShowBusyModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState({ visible: false, message: '' });
  const [duration, setDuration] = useState(null);
  const pulseAnim = React.useRef(new Animated.Value(0)).current;
  const originRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const scrollViewRef = React.useRef(null);
  const focusedInputRef = React.useRef(null);
  const [showMotives, setShowMotives] = useState(true);

  // Native Bottom Sheet State
  const { height: screenHeight } = Dimensions.get('window');
  // Since sheet is 90% of screen height, these translates push it down
  const SNAP_TOP = screenHeight * 0.15; // 85% visible
  const SNAP_MIDDLE = screenHeight * 0.30; // 70% visible
  const SNAP_BOTTOM = screenHeight * 0.70; // 30% visible

  const translateY = React.useRef(new Animated.Value(SNAP_MIDDLE)).current;
  const currentSnap = React.useRef(SNAP_MIDDLE);

  const snapTo = (toValue) => {
    currentSnap.current = toValue;
    Animated.spring(translateY, {
      toValue,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  };

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (e, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (e, gestureState) => {
        let newY = currentSnap.current + gestureState.dy;
        if (newY < SNAP_TOP) newY = SNAP_TOP; // Prevents dragging above 90%
        translateY.setValue(newY);
      },
      onPanResponderRelease: (e, gestureState) => {
        const finalY = currentSnap.current + gestureState.dy;
        const velocityY = gestureState.vy;

        let closestSnap = SNAP_MIDDLE;
        if (velocityY > 1.5) {
          closestSnap = SNAP_BOTTOM;
        } else if (velocityY < -1.5) {
          closestSnap = SNAP_TOP;
        } else {
          const distTop = Math.abs(finalY - SNAP_TOP);
          const distMid = Math.abs(finalY - SNAP_MIDDLE);
          const distBot = Math.abs(finalY - SNAP_BOTTOM);
          const minDist = Math.min(distTop, distMid, distBot);

          if (minDist === distTop) closestSnap = SNAP_TOP;
          else if (minDist === distMid) closestSnap = SNAP_MIDDLE;
          else closestSnap = SNAP_BOTTOM;
        }
        snapTo(closestSnap);
      }
    })
  ).current;

  const isDistance = service?.pricingModel === 'distance';

  const [price, setPrice] = useState(0);
  const [routeCoords, setRouteCoords] = useState([]);

  const handleGetCurrentLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (!loc) return;

      setLocation({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude
      });
      setOriginCoord({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      // Reverse Geocoding para obter o nome da rua
      try {
        const addressArray = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude
        });
        
        let placeName = 'Minha localização atual';
        if (addressArray && addressArray.length > 0) {
          const addr = addressArray[0];
          const street = addr.street || addr.name || '';
          const city = addr.city || addr.subregion || addr.region || '';
          
          if (street && city) {
            placeName = `${street}, ${city}`;
          } else if (street) {
            placeName = street;
          } else if (city) {
            placeName = city;
          }
        }
        
        setOrigin(placeName);
        if (originRef.current) {
          originRef.current.setAddressText(placeName);
        }
      } catch (error) {
        console.log('Erro no reverse geocoding:', error);
        setOrigin('Minha localização atual');
        if (originRef.current) {
          originRef.current.setAddressText('Minha localização atual');
        }
      }

      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015
        }, 1000);
      }
    } catch (e) {
      console.log('Error getting location: ', e);
    }
  };

  /* ---------------- LOCATION & KEYBOARD ---------------- */
  useEffect(() => {
    handleGetCurrentLocation();

    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      snapTo(SNAP_TOP);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      // Deixar o utilizador visualizar os resultados sem forçar o scroll para 0 nem encolher o ecrã
    });

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  /* ---------------- PRICE API ---------------- */
  useEffect(() => {
    const fetchPrice = async () => {
      if (originCoord && destCoord) {
        try {
          const { data } = await api.post('/pricing/calculate', {
            serviceId: service._id,
            originLoc: originCoord,
            destLoc: destCoord,
            weightKg: 5
          });
          
          if (!isDistance) {
            setPrice(service?.basePrice || 0);
          } else {
            setPrice(data.price || 0);
          }

          snapTo(SNAP_TOP); // Auto-expand to 90% when calculated
          if (data.routeCoordinates && data.routeCoordinates.length > 0) {
            setRouteCoords(data.routeCoordinates);
          }
          if (data.breakdown && data.breakdown.durationMin) {
            setDuration(Math.round(data.breakdown.durationMin));
          }
        } catch (error) {
          console.log('Erro ao consultar motor de preços:', error);
          setPrice(120); // Fallback
          snapTo(SNAP_TOP);
          setRouteCoords([]);
        }
      }
    };
    
    fetchPrice();
  }, [originCoord, destCoord]);

  // Zoom and Fit map when origin, destination, or route changes
  useEffect(() => {
    if (mapRef.current && originCoord) {
      if (destCoord && routeCoords.length > 0) {
        mapRef.current.fitToCoordinates([originCoord, destCoord, ...routeCoords], {
          edgePadding: { top: 100, right: 50, bottom: Dimensions.get('window').height * 0.5, left: 50 },
          animated: true,
        });
      } else {
        mapRef.current.animateToRegion({
          latitude: originCoord.lat,
          longitude: originCoord.lng,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015
        }, 1000);
      }
    }
  }, [originCoord, destCoord, routeCoords]);

  // Search Logic (Timer & Radius)
  useEffect(() => {
    let timer;
    if (step === 2 && isSearching) {
      // Simulate search delay (10 seconds)
      timer = setTimeout(() => {
        if (radius >= 7) {
          // Simulate finding a driver on the second try
          setIsSearching(false);
          Alert.alert("Sucesso!", "Encontrámos um motorista próximo de si!");
          navigation.navigate('Pedidos'); // Replace with actual order detail navigation
        } else {
          setIsSearching(false);
          setShowBusyModal(true);
        }
      }, 10000); // 10 seconds per try for UX purposes
    }
    return () => clearTimeout(timer);
  }, [step, isSearching, radius]);

  const startPulse = () => {
    pulseAnim.setValue(0);
    Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    ).start();
  };

  if (!service) return null;

  /* ================= VARIABLES ================= */
  const motivesList = service.motives && service.motives.length > 0
    ? service.motives
    : [
        'Transporte de documentos',
        'Mudança de casa',
        'Mercadorias gerais',
        'Equipamento frágil'
      ];
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        showsUserLocation
        initialRegion={{
          latitude: location?.lat || -25.9692,
          longitude: location?.lng || 32.5732,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05
        }}
      >
        {originCoord && <Marker coordinate={{ latitude: originCoord.lat, longitude: originCoord.lng }} pinColor="green" />}
        {destCoord && <Marker coordinate={{ latitude: destCoord.lat, longitude: destCoord.lng }} pinColor="red" />}
        
        {routeCoords.length > 0 && (
          <Polyline 
            coordinates={routeCoords} 
            strokeWidth={4} 
            strokeColor="#A855F7" 
          />
        )}
      </MapView>

      <TouchableOpacity 
        style={styles.floatingBackBtn} 
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={26} color="#1A1A1A" />
      </TouchableOpacity>

      <View style={[styles.overlay, { zIndex: 10 }]} pointerEvents="box-none">
        <Animated.View style={[styles.sheet, { height: screenHeight - SNAP_TOP, transform: [{ translateY }] }]}>
          
          {/* DRAGGABLE HEADER ZONE */}
          <View {...panResponder.panHandlers} style={{ backgroundColor: '#FFF', paddingBottom: 10 }}>
            <View style={styles.dragHandleContainer}>
              <View style={styles.dragHandle} />
            </View>
            
            <View style={[styles.headerRow, { marginTop: 0 }]}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
                <Ionicons name="close" size={24} color="#1A1A1A" />
              </TouchableOpacity>
              <Text style={styles.mainTitle}>O que pretende fazer?</Text>
            </View>
          </View>

            <ScrollView 
              ref={scrollViewRef}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 200, paddingHorizontal: 20 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <View>
              <Text style={styles.label}>Serviço</Text>
              <Text style={styles.serviceName}>{service.name}</Text>
            </View>
            <TouchableOpacity 
              onPress={() => {
                if (!reason && showMotives) {
                  setShowWarningModal({ visible: true, message: 'Selecione primeiro o motivo da solicitação.' });
                  return;
                }
                setShowMotives(!showMotives);
              }}
              style={{ padding: 5 }}
            >
              <Ionicons name={showMotives ? "chevron-up" : "chevron-down"} size={26} color="#A855F7" />
            </TouchableOpacity>
          </View>

          {showMotives && (
            <>
              <Text style={[styles.label, { marginTop: 5 }]}>
                Motivo da solicitação <Text style={{ color: 'red' }}>*</Text>
              </Text>
              <View style={styles.grid}>
                {motivesList.map((motive, i) => {
                  const isActive = reason === motive;
                  return (
                    <TouchableOpacity 
                      key={i} 
                      style={[styles.card, isActive && styles.cardActive]} 
                      onPress={() => {
                        setReason(motive);
                        setShowMotives(false);
                      }}
                      activeOpacity={0.8}
                    >
                      {isActive ? (
                        <LinearGradient colors={['#9800FF', '#B400FF']} style={styles.cardGradient}>
                          <Text style={[styles.cardTitle, { color: '#FFF' }]}>{motive}</Text>
                        </LinearGradient>
                      ) : (
                        <View style={styles.cardContent}>
                          <Text style={styles.cardTitle}>{motive}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {reason && !showMotives && (
            <Text style={{ fontSize: 14, color: '#A855F7', fontWeight: '600', marginBottom: 10 }}>
              Motivo escolhido: {reason}
            </Text>
          )}

          <View style={{ zIndex: 10, position: 'relative', marginTop: 10 }}>
            <Text style={styles.label}>Origem</Text>
            <GooglePlacesAutocomplete
              ref={originRef}
              placeholder="De onde partimos?"
              nearbyPlacesAPI="GooglePlacesSearch"
              debounce={400}
              fetchDetails={true}
              minLength={2}
              enablePoweredByContainer={false}
              query={{
                key: EXPO_GOOGLE_MAPS_APIKEY,
                language: 'pt',
                components: 'country:mz',
              }}
              textInputProps={{
                style: styles.input,
                onFocus: () => {
                  snapTo(SNAP_TOP);
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: showMotives ? 220 : 120, animated: true });
                  }, 250);
                }
              }}
              listProps={{
                scrollEnabled: false,
                keyboardShouldPersistTaps: 'always'
              }}
              renderRightButton={() => (
                <TouchableOpacity 
                  style={{ justifyContent: 'center', paddingRight: 10, marginTop: 5 }}
                  onPress={handleGetCurrentLocation}
                >
                  <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#A855F7" />
                </TouchableOpacity>
              )}
              onPress={(data, details = null) => {
                setOrigin(data.description);
                if (details) {
                  setOriginCoord({
                    lat: details.geometry.location.lat,
                    lng: details.geometry.location.lng,
                  });
                }
              }}
              styles={autocompleteStyles}
            />
          </View>

          <View style={{ zIndex: 9, position: 'relative', marginTop: 0 }}>
            <Text style={styles.label}>Destino</Text>
              <GooglePlacesAutocomplete
                placeholder="Para onde vamos?"
                nearbyPlacesAPI="GooglePlacesSearch"
                debounce={400}
                fetchDetails={true}
                minLength={2}
                enablePoweredByContainer={false}
                query={{
                  key: EXPO_GOOGLE_MAPS_APIKEY,
                  language: 'pt',
                  components: 'country:mz',
                }}
                textInputProps={{
                  style: styles.input,
                  onFocus: () => {
                    snapTo(SNAP_TOP);
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({ y: showMotives ? 300 : 200, animated: true });
                    }, 250);
                  }
                }}
                listProps={{
                  scrollEnabled: false,
                  keyboardShouldPersistTaps: 'always'
                }}
                onPress={(data, details = null) => {
                  setDestination(data.description);
                  if (details) {
                    setDestCoord({
                      lat: details.geometry.location.lat,
                      lng: details.geometry.location.lng,
                    });
                  }
                }}
                styles={autocompleteStyles}
              />
            </View>
          
          {duration !== null && !isSearching && (
            <View style={{ backgroundColor: '#F3E8FF', padding: 12, borderRadius: 10, marginTop: 15, alignItems: 'center' }}>
              <Text style={{ color: '#A855F7', fontWeight: 'bold', fontSize: 16 }}>
                <MaterialCommunityIcons name="clock-outline" size={16} /> Estimativa de tempo: {duration} min
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, { marginBottom: 40, marginTop: duration !== null ? 15 : 40 }]}
            onPress={() => {
              if (!reason) {
                setShowWarningModal({ visible: true, message: 'Por favor selecione um motivo da solicitação.' });
                return;
              }
              if (!originCoord || !destCoord) {
                setShowWarningModal({ visible: true, message: 'Por favor indique a origem e o destino.' });
                return;
              }
              Keyboard.dismiss();
              snapTo(screenHeight); // Ocultar o form principal
              setIsSearching(true);
              startPulse();
            }}
          >
            <LinearGradient colors={['#7F00FF', '#A855F7']} style={styles.gradient}>
              <Text style={styles.btnText}>Confirmar Pedido</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </View>

    {/* Nova Aba de Procura (Modal Centralizado) */}
    <Modal visible={isSearching} transparent animationType="fade">
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ backgroundColor: '#FFF', borderRadius: 20, padding: 30, width: '85%', alignItems: 'center', elevation: 10 }}>
          <View style={{ width: 100, height: 100, justifyContent: 'center', alignItems: 'center' }}>
            <Animated.View style={[styles.radarCenter, { 
                position: 'absolute',
                backgroundColor: 'rgba(168, 85, 247, 0.3)',
                transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] }) }],
                opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
            }]} />
            <View style={[styles.radarCenter, { backgroundColor: '#F3E8FF' }]}>
              <MaterialCommunityIcons name="circle" size={24} color="#A855F7" />
            </View>
          </View>
          <Text style={{ marginTop: 20, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>À procura de motoristas...</Text>
          <Text style={{ color: '#666', marginTop: 10 }}>Raio de busca: {radius} KM</Text>
          
          <TouchableOpacity 
            style={{ marginTop: 30, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: '#FEF2F2', borderRadius: 10 }} 
            onPress={() => {
              setIsSearching(false);
              snapTo(SNAP_MIDDLE); // Voltar a mostrar o form
            }}
          >
            <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 16 }}>Cancelar Busca</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

      <Modal visible={showBusyModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modernModal}>
            <View style={styles.modalIconBox}>
              <MaterialCommunityIcons name="clock-alert-outline" size={32} color="#D97706" />
            </View>
            <Text style={styles.modalTitle}>Motoristas Ocupados</Text>
            <Text style={styles.modalDesc}>
              Não encontrámos nenhum motorista disponível num raio de {radius} KM. Deseja aumentar o raio em +2 KM?
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnCancel]} 
                onPress={() => {
                  setShowBusyModal(false);
                  setStep(1);
                }}
              >
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnConfirm]} 
                onPress={() => {
                  setShowBusyModal(false);
                  setRadius(r => r + 2);
                  setIsSearching(true);
                  startPulse();
                }}
              >
                <LinearGradient colors={['#A855F7', '#7F00FF']} style={styles.modalBtnGradient}>
                  <Text style={styles.modalBtnConfirmText}>Aumentar Raio</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showWarningModal.visible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modernModal}>
            <View style={[styles.modalIconBox, { backgroundColor: '#FEE2E2' }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={32} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>Atenção</Text>
            <Text style={styles.modalDesc}>
              {showWarningModal.message}
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnConfirm, { width: '100%', marginLeft: 0 }]} 
                onPress={() => setShowWarningModal({ visible: false, message: '' })}
              >
                <LinearGradient colors={['#A855F7', '#7F00FF']} style={styles.modalBtnGradient}>
                  <Text style={styles.modalBtnConfirmText}>Entendido</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end'
  },

  sheet: {
    backgroundColor: '#FFF',
    padding: 20,
    paddingTop: 5,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10
  },

  dragHandleContainer: {
    width: '100%',
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  dragHandle: {
    width: 50,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB'
  },

  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10
  },

  label: {
    fontSize: 12,
    color: '#666',
    marginTop: 10
  },

  serviceName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10
  },

  input: {
    backgroundColor: '#F5F5F5',
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 5,
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500'
  },

  btn: {
    marginTop: 20
  },

  gradient: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },

  btnText: {
    color: '#FFF',
    fontWeight: '700'
  },

  priceBox: {
    marginTop: 15,
    backgroundColor: '#FFF7E6',
    padding: 12,
    borderRadius: 10
  },

  price: {
    fontWeight: '800'
  },

  back: {
    textAlign: 'center',
    marginTop: 10,
    color: '#666'
  },

  pulseCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#A855F7'
  },

  floatingBackBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8
  },

  radarCenter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#7F00FF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6
  },
  
  // New Styles for Step 1 Layout
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  subtitleRight: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  card: {
    width: '47%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardContent: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  cardGradient: {
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  cardActive: {
    borderColor: '#A855F7',
    elevation: 5,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1A1A1A'
  },
  
  // Custom Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modernModal: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10
  },
  modalIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8
  },
  modalDesc: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%'
  },
  modalBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden'
  },
  modalBtnCancel: {
    backgroundColor: '#F3F4F6',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14
  },
  modalBtnCancelText: {
    color: '#4B5563',
    fontWeight: '700',
    fontSize: 15
  },
  modalBtnConfirm: {
    marginLeft: 10,
  },
  modalBtnGradient: {
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalBtnConfirmText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15
  }
});

const autocompleteStyles = StyleSheet.create({
  container: {
    flex: 0,
  },
  textInputContainer: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderBottomWidth: 0,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  textInput: {
    height: 56,
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '500',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 16,
    marginTop: 5,
  },
  listView: {
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'absolute',
    top: 65,
    left: 0,
    right: 0,
    zIndex: 1000,
    maxHeight: 220,
  },
  row: {
    padding: 13,
    height: 44,
    flexDirection: 'row',
  },
  separator: {
    height: 0.5,
    backgroundColor: '#c8c7cc',
  },
  description: {
    fontSize: 14,
  },
});