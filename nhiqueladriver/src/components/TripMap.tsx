import React, { useEffect, useRef, useState } from "react";
import MapView, { Marker, Camera, UrlTile, Polyline } from "react-native-maps";
import { LinearGradient } from "expo-linear-gradient";
import { 
  StyleSheet, 
  Dimensions, 
  View, 
  Text, 
  Animated, 
  TouchableOpacity,
  Modal,
  Alert,
  Linking
} from "react-native";
import { showMessage } from "react-native-flash-message";
import { COLORS } from "../styles/colors";
import * as Location from 'expo-location';
import { getRoute } from "../services/routingService";
//@ts-ignore
import { Ionicons } from "@expo/vector-icons";

type Props = {
  currentLocation: any;
  destination: any;
  stepStatus?: number;
  onRouteReady: () => void;
  shouldDrawRoute: boolean;
  onStepComplete?: () => void;
  tripData?: any; // Nova prop para receber os dados da viagem
  onStartTrip?: (trip: any) => void;
  onCancelTrip?: () => void;
  onFinishTrip?: () => void;
  onCompleteService?: () => void;
  onNoShow?: () => void;
  canFinishTrip?: boolean;
  routeDrawn?: boolean;
};

const GOOGLE_API_KEY = "AIzaSyCcEJkIShYipbwcKBfDFKKkLR6QudOQG3Q";

export default function TripMap({ 
  currentLocation, 
  destination, 
  stepStatus,
  onRouteReady, 
  shouldDrawRoute,
  onStepComplete,
  tripData,
  onStartTrip,
  onCancelTrip,
  onFinishTrip,
  onCompleteService,
  onNoShow,
  canFinishTrip = false,
  routeDrawn = false
}: Props) {
  const mapRef = useRef<any>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [origin, setOrigin] = useState<any>(null);
  const [heading, setHeading] = useState<number>(0);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseScaleAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacityAnim = useRef(new Animated.Value(0.5)).current;
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [speed, setSpeed] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const lastPositionRef = useRef<any>(null);
  const animationRef = useRef<any>(null);
  const hasInitialZoomed = useRef(false);
  const lastSpeedWarningTime = useRef<number>(0);

  // 🔥 OBTER LOCALIZAÇÃO EM TEMPO REAL
  useEffect(() => {
    let locationSubscription: any = null;

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permissão de localização negada');
        return;
      }

      // Usar a currentLocation passada como prop inicialmente
      if (currentLocation) {
        setOrigin(currentLocation);
        lastPositionRef.current = currentLocation;
      }

      // Configurar watch para atualizações em tempo real
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 5,
          timeInterval: 2000,
        },
        (newLocation) => {
          const updatedLocation = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude
          };
          
          // Calcular heading baseado na mudança de posição
          if (lastPositionRef.current) {
            const newHeading = calculateBearing(
              lastPositionRef.current,
              updatedLocation
            );
            setHeading(newHeading);
          }
          
          // Capturar e converter velocidade (m/s para km/h)
          const currentSpeed = newLocation.coords.speed !== null && newLocation.coords.speed > 0 
            ? newLocation.coords.speed * 3.6 
            : 0;
          
          const speedKmH = Math.round(currentSpeed);
          setSpeed(speedKmH);

          // 🔥 AVISO DE VELOCIDADE (100 KM/H)
          if (speedKmH >= 100) {
            const now = Date.now();
            // Apenas emite o aviso a cada 1 minuto (60000ms) para não fazer spam
            if (now - lastSpeedWarningTime.current > 60000) {
              lastSpeedWarningTime.current = now;
              showMessage({
                message: "⚠️ Excesso de Velocidade",
                description: "Atingiu 100 km/h! Por favor, reduza a velocidade para a sua segurança e do cliente.",
                type: "danger",
                icon: "warning",
                duration: 5000,
              });
            }
          }

          // Atualizar posição
          setOrigin(updatedLocation);
          lastPositionRef.current = updatedLocation;
        }
      );
    })();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [currentLocation]);

  // 🔥 ATUALIZAR CAMERA QUANDO ORIGEM MUDAR
  useEffect(() => {
    if (origin && mapRef.current) {
      updateCamera(origin);
    }
    startBlinkAnimation();
  }, [origin]);

  // 🔥 CALCULAR BEARING (DIREÇÃO)
  const calculateBearing = (start: any, end: any) => {
    const startLat = start.latitude * Math.PI / 180;
    const startLng = start.longitude * Math.PI / 180;
    const endLat = end.latitude * Math.PI / 180;
    const endLng = end.longitude * Math.PI / 180;

    const y = Math.sin(endLng - startLng) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) -
             Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = (bearing + 360) % 360;
    
    return bearing;
  };

  const updateCamera = (center: any, customHeading?: number) => {
    const camera: Camera = {
      center,
      pitch: 45,
      heading: customHeading !== undefined ? customHeading : heading,
      altitude: 50,
      zoom: 19,
    };
    
    const animDuration = hasInitialZoomed.current ? 1000 : 5000;
    mapRef.current?.animateCamera(camera, { duration: animDuration });
    hasInitialZoomed.current = true;
  };

  const startBlinkAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.parallel([
        Animated.timing(pulseScaleAnim, {
          toValue: 2,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacityAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        })
      ])
    ).start();
  };

  const [snappedLocation, setSnappedLocation] = useState<any>(null);

  useEffect(() => {
    let timeoutId: any;
    if (origin && destination && shouldDrawRoute) {
      const fetchRoute = async () => {
        try {
          const result = await getRoute(origin.latitude, origin.longitude, destination.latitude, destination.longitude);
          if (result && result.coordinates) {
            setDuration(result.durationMinutes);
            setDistance(result.distanceKm);

            // OSRM devolve [lng, lat], o MapView precisa de {latitude, longitude}
            const coords = result.coordinates.map((coord: [number, number]) => ({
              latitude: coord[1],
              longitude: coord[0]
            }));

            setRouteCoordinates(coords);
            if (coords.length > 0) {
              setSnappedLocation(coords[0]);
            }

            if (onRouteReady) onRouteReady();

            if (coords.length > 1) {
              const routeHeading = calculateHeading(coords);
              updateCamera(coords[0], routeHeading); // Center on snapped location
            }
          }
        } catch (error) {
          console.warn("Erro ao buscar rota via OSRM:", error);
        }
      };

      // Debounce para não inundar o servidor OSRM a cada micro-mudança de GPS
      timeoutId = setTimeout(() => {
        fetchRoute();
      }, 1500);

    } else {
      setRouteCoordinates([]);
      setDuration(null);
      setDistance(null);
      setSnappedLocation(null);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [origin?.latitude, origin?.longitude, destination?.latitude, destination?.longitude, shouldDrawRoute]);

  // 🔥 Cronómetro da Viagem
  useEffect(() => {
    let interval: any;
    if (stepStatus === 4 || stepStatus === 5 || stepStatus === 6) {
      let startTime = 0;
      if (stepStatus === 4) {
        startTime = tripData?.acceptedAt ? new Date(tripData.acceptedAt).getTime() : (tripData?.updatedAt ? new Date(tripData.updatedAt).getTime() : Date.now());
      } else if (stepStatus === 5) {
        startTime = tripData?.pickupStartedAt ? new Date(tripData.pickupStartedAt).getTime() : (tripData?.updatedAt ? new Date(tripData.updatedAt).getTime() : Date.now());
      } else if (stepStatus === 6) {
        startTime = tripData?.arrivedAtDestination ? new Date(tripData.arrivedAtDestination).getTime() : (tripData?.updatedAt ? new Date(tripData.updatedAt).getTime() : Date.now());
      }

      interval = setInterval(() => {
        if (startTime) {
          const now = Date.now();
          const elapsed = Math.floor((now - startTime) / 1000);
          setElapsedSeconds(elapsed > 0 ? elapsed : 0);
        }
      }, 1000);
    } else if (stepStatus !== 7) {
      // Se não for 7 (Concluído), reinicia. Se for 7, congela o valor atual para o ecrã final.
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [stepStatus, tripData?.acceptedAt, tripData?.pickupStartedAt, tripData?.updatedAt, tripData?.arrivedAtDestination]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    if (h > 0) return `${h}:${m}:${s}`;
    return `${m}:${s}`;
  };

  const handleRouteReady = (result: any) => {
    // Mantido para não quebrar referências, mas o desenho principal agora usa useEffect
  };

  const calculateHeading = (coordinates: any[]) => {
    if (coordinates.length < 2) return heading;
    
    const start = coordinates[0];
    const next = coordinates[1];
    const dx = next.longitude - start.longitude;
    const dy = next.latitude - start.latitude;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    return angle;
  };

  // 🔥 FUNÇÕES PARA O BOTÃO DE INICIAR VIAGEM
  const handleStartTripPress = () => {
    setShowConfirmationModal(true);
  };

  const handleConfirmTrip = () => {
    setShowConfirmationModal(false);
    
    // 🔥 AGORA CHAMA A FUNÇÃO startTrip PASSADA COMO PROP
    if (onStartTrip && tripData) {
      onStartTrip(tripData);
    } else {
      // Fallback: se não tiver a função, usa o método antigo
      console.warn('Função onStartTrip ou tripData não fornecida');
      if (onStepComplete) {
        onStepComplete();
      }
    }
  };

  const handleCancelTrip = () => {
    setShowConfirmationModal(false);
  };

  // 🔥 RENDERIZAÇÃO CONDICIONAL BASEADA NO STEP STATUS
  const getArrowRotationStyle = () => {
    return {
      transform: [
        { rotate: `${heading}deg` }
      ]
    };
  };

  const getStatusInfo = () => {
    switch (stepStatus) {
      case 4:
        return { 
          title: "📍 A caminho da coleta", 
          color: COLORS.warning,
          icon: "cube"
        };
      case 5:
        return { 
          title: "🚗 Em trânsito para entrega", 
          color: COLORS.primary,
          icon: "car"
        };
      default:
        return { 
          title: "📍 Sua localização", 
          color: COLORS.gray,
          icon: "location"
        };
    }
  };

  const statusInfo = getStatusInfo();

  // 🔥 Road Snapping: Use the snapped location if available and if we are routing
  const displayLocation = (shouldDrawRoute && snappedLocation) ? snappedLocation : origin;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: -18.665695,
          longitude: 35.529562,
          latitudeDelta: 25,
          longitudeDelta: 25,
        }}
        showsUserLocation={false}
        loadingEnabled
        rotateEnabled={true}
        pitchEnabled={false}
        scrollEnabled={true}
        zoomEnabled={true}
      >
        {/* 🔥 MARCADOR DA LOCALIZAÇÃO ATUAL (Motorista) - Road Snapped */}
        {displayLocation && (
          <Marker 
            coordinate={displayLocation} 
            title={statusInfo.title}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
          >
            <Animated.View style={[styles.arrowMarkerContainer, getArrowRotationStyle()]}>
              <View style={[styles.arrowSimple, { borderColor: statusInfo.color }]}>
                <Ionicons name="navigate" size={28} color={statusInfo.color} />
              </View>
            </Animated.View>
          </Marker>
        )}
        
        {/* 🔥 MARCADOR DO DESTINO (APENAS SE DEVE DESENHAR ROTA) */}
        {destination && shouldDrawRoute && (
          <Marker coordinate={destination} title={destination.title || (stepStatus === 4 ? "Local de Recolha" : "Destino do Cliente")} flat={true}>
            <View style={styles.destinationMarkerContainer}>
              <Animated.View 
                style={[
                  styles.destinationMarkerPulse, 
                  { 
                    backgroundColor: stepStatus === 4 ? '#FF9500' : '#FF3B30',
                    opacity: pulseOpacityAnim,
                    transform: [{ scale: pulseScaleAnim }]
                  }
                ]} 
              />
              <View style={[styles.destinationMarkerInner, { backgroundColor: stepStatus === 4 ? '#FF9500' : '#FF3B30' }]}>
                <Ionicons 
                  name={stepStatus === 4 ? "cube" : "location"} 
                  size={20} 
                  color="#FFF" 
                />
              </View>
            </View>
          </Marker>
        )}

        {/* 🔥 ROTA OSRM CENTRALIZADA (APENAS SE DEVE DESENHAR E TEM ORIGEM+DESTINO) */}
        {origin && destination && shouldDrawRoute && routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={4}
            strokeColor={statusInfo.color}
          />        
        )}
      </MapView>

      {/* 🔥 INFO BOX SUPERIOR */}
      <View style={[styles.statusBox, { backgroundColor: statusInfo.color }]}>
        <Ionicons name={statusInfo.icon as any} size={20} color="#FFF" />
        <Text style={styles.statusText}>{statusInfo.title}</Text>
      </View>

      {/* 🔥 INFO DO CLIENTE / PASSAGEIRO */}
      {!!(tripData && (tripData.user || tripData.clientName)) && (
        <View style={styles.clientInfoBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Ionicons name="person-circle-outline" size={32} color="#333" style={{ marginRight: 8 }} />
            <View>
              <Text style={styles.clientName}>{tripData.user?.name || tripData.clientName || 'Cliente'}</Text>
              <Text style={styles.clientPhone}>
                {tripData.serviceName ? `${tripData.serviceName}` : 'Serviço'}
                {(tripData.reason || tripData.description || tripData.goodType) ? ` • ${tripData.reason || tripData.description || tripData.goodType}` : ''}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.callButton}
            onPress={() => {
              const phone = tripData.user?.phoneNumber || tripData.clientPhone;
              if (phone) Linking.openURL(`tel:${phone}`);
            }}
          >
            <Ionicons name="call" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

        {/* BOTAO PARA INICIAR VIAGEM (APENAS NO ESTAGIO 4) */}
        {stepStatus === 4 && (
          <View style={styles.startTripButtonContainer}>
            <TouchableOpacity 
              style={styles.startTripButtonOuter}
              activeOpacity={0.85}
              onPress={handleStartTripPress}
            >
              <LinearGradient
                colors={['#a855f7', '#9333ea', '#7e22ce']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.startTripButtonGradient}
              >
                <View style={styles.startTripButtonGlow} />
                <Ionicons name="play-circle" size={32} color="#FFF" style={styles.startTripButtonIcon} />
                <Text style={styles.startTripButtonText}>Iniciar Viagem</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* BOTAO PARA FINALIZAR VIAGEM (APENAS NO ESTAGIO 5) */}
        {stepStatus === 5 && (
          <View style={styles.startTripButtonContainer}>
            <TouchableOpacity 
              style={styles.startTripButtonOuter}
              activeOpacity={0.85}
              onPress={() => onFinishTrip && onFinishTrip()}
            >
              <LinearGradient
                colors={['#10B981', '#059669', '#047857']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.startTripButtonGradient}
              >
                <View style={styles.startTripButtonGlow} />
                <Ionicons name="checkmark-circle" size={32} color="#FFF" style={styles.startTripButtonIcon} />
                <Text style={styles.startTripButtonText}>Cheguei ao Destino</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* BOTAO PARA CONCLUIR VIAGEM (ESTAGIO 6 - A AGUARDAR CONFIRMACAO) */}
        {stepStatus === 6 && (
          <View style={[styles.startTripButtonContainer, { bottom: elapsedSeconds >= 300 ? 50 : 30 }]}>
            <TouchableOpacity 
              style={styles.startTripButtonOuter}
              activeOpacity={0.85}
              onPress={() => onCompleteService && onCompleteService()}
            >
              <LinearGradient
                colors={['#3B82F6', '#2563EB', '#1D4ED8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.startTripButtonGradient}
              >
                <View style={styles.startTripButtonGlow} />
                <Ionicons name="shield-checkmark" size={32} color="#FFF" style={styles.startTripButtonIcon} />
                <Text style={styles.startTripButtonText}>Concluir Serviço</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            {elapsedSeconds >= 300 && (
              <TouchableOpacity
                style={{ marginTop: 16, backgroundColor: '#EF4444', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
                onPress={() => onNoShow && onNoShow()}
              >
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Cliente não compareceu</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

      {/* 🔥 DURAÇÃO (APENAS SE TEM ROTA) */}
      {(duration !== null && duration > 0) && shouldDrawRoute && (
        <Animated.View style={[styles.timeBox, { opacity: fadeAnim }]}>
          <Ionicons name="time" size={18} color="#000" style={styles.timeIcon} />
          <Text style={styles.timeText}>ETA: {Math.round(duration)} min</Text>
        </Animated.View>
      )}

      {/* 🔥 CRONÓMETRO (TEMPO DECORRIDO) */}
      {(stepStatus === 4 || stepStatus === 5 || stepStatus === 6 || stepStatus === 7) && (
        <View style={styles.stopwatchBox}>
          <Ionicons name="stopwatch" size={18} color="#FFF" style={styles.stopwatchIcon} />
          <Text style={styles.stopwatchText}>{formatTime(elapsedSeconds)}</Text>
          <Text style={styles.stopwatchLabel}>
            {stepStatus === 4 ? "Até Recolha" : stepStatus === 5 ? "Em Viagem" : stepStatus === 6 ? "A Aguardar Cliente" : "Viagem Concluída"}
          </Text>
        </View>
      )}

      {/* 🔥 DISTÂNCIA (APENAS SE TEM ROTA E NÃO ESTÁ CONCLUÍDA) */}
      {(distance !== null && distance > 0) && shouldDrawRoute && stepStatus !== 7 && (
        <View style={styles.distanceBox}>
          <Ionicons name="speedometer" size={16} color="#FFF" style={styles.distanceIcon} />
          <Text style={styles.distanceText}>{distance.toFixed(1)} km</Text>
        </View>
      )}

      {/* 🔥 COMPASS (APENAS SE TEM LOCALIZAÇÃO) */}
      {origin && (
        <View style={styles.compassBox}>
          <Text style={styles.compassText}>Direção</Text>
          <View style={styles.compassArrow}>
            <Ionicons 
              name="arrow-up" 
              size={20} 
              color={statusInfo.color} 
              style={[styles.compassIcon, { transform: [{ rotate: `${heading}deg` }] }]} 
            />
          </View>
          <Text style={styles.compassDegree}>{Math.round(heading)}°</Text>
        </View>
      )}

      {/* 🔥 SPEED BOX (APENAS SE TEM LOCALIZAÇÃO) */}
      {origin && (
        <View style={styles.speedBox}>
          <Text style={styles.speedValue}>{speed}</Text>
          <Text style={styles.speedLabel}>km/h</Text>
        </View>
      )}


      {/* 🔥 MODAL DE CONFIRMAÇÃO PREMIUM */}
      <Modal
        visible={showConfirmationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelTrip}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.premiumModalContainer}>
            <View style={styles.premiumIconContainer}>
              <Ionicons name="cube-outline" size={40} color="#9333ea" />
            </View>
            
            <Text style={styles.premiumModalTitle}>Já está com a mercadoria?</Text>
            
            <Text style={styles.premiumModalMessage}>
              Confirme que recolheu a mercadoria com sucesso e que a mesma se encontra acomodada na sua viatura para darmos início à viagem.
            </Text>

            <View style={styles.premiumModalButtons}>
              <TouchableOpacity 
                style={styles.premiumCancelButton}
                activeOpacity={0.8}
                onPress={handleCancelTrip}
              >
                <Text style={styles.premiumCancelButtonText}>Não, Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.premiumConfirmButton}
                activeOpacity={0.85}
                onPress={handleConfirmTrip}
              >
                <LinearGradient
                  colors={['#a855f7', '#9333ea']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.premiumConfirmGradient}
                >
                  <Text style={styles.premiumConfirmButtonText}>Sim, Iniciar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Os styles permanecem os mesmos...
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  // 🔥 Status Box
  statusBox: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  statusText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
  },
  clientInfoBox: {
    position: "absolute",
    top: 90,
    alignSelf: "center",
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  clientName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  clientPhone: {
    fontSize: 12,
    color: '#666',
  },
  callButton: {
    backgroundColor: '#27AE60',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
    // Container do Botao Iniciar Viagem - PREMIUM
    startTripButtonContainer: {
      position: "absolute",
      bottom: 130, // Move down so it doesn't block the map but stays above TabMenu
      alignSelf: "center",
      width: '88%',
      zIndex: 999,
    },
    startTripButtonOuter: {
      borderRadius: 24,
      elevation: 12,
      shadowColor: '#a855f7',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.6,
      shadowRadius: 16,
    },
    startTripButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 18,
      paddingHorizontal: 28,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: 'rgba(255, 255, 255, 0.3)',
      overflow: 'hidden',
    },
    startTripButtonGlow: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '50%',
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    startTripButtonIcon: {
      marginRight: 12,
      textShadowColor: 'rgba(0, 0, 0, 0.2)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    startTripButtonText: {
      color: "#FFF",
      fontSize: 20,
      fontWeight: "900",
      letterSpacing: 1,
      textTransform: "uppercase",
      textShadowColor: 'rgba(0, 0, 0, 0.2)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
  arrowMarkerContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowSimple: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 2,
  },
  destinationMarkerContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinationMarkerPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.3,
  },
  destinationMarkerInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  timeBox: {
    position: "absolute",
    top: 120, // Movido para o topo
    alignSelf: "center",
    backgroundColor: "#FFD700",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  timeIcon: {
    marginRight: 6,
  },
  timeText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "bold",
  },
  stopwatchBox: {
    position: "absolute",
    top: 120, // Movido para o topo
    left: 20,
    backgroundColor: 'rgba(147, 51, 234, 0.9)', // Purple
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'column',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 10,
    minWidth: 100,
  },
  stopwatchIcon: {
    marginBottom: 2,
  },
  stopwatchText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    fontVariant: ['tabular-nums'],
  },
  stopwatchLabel: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 2,
    textTransform: 'uppercase',
  },
  distanceBox: {
    position: "absolute",
    top: 120, // Movido para o topo
    right: 20, 
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceIcon: {
    marginRight: 4,
  },
  distanceText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  compassBox: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 8,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  compassText: {
    fontSize: 8,
    color: '#666',
    marginBottom: 2,
    fontWeight: '600',
  },
  compassArrow: {
    height: 24,
    justifyContent: 'center',
  },
  compassIcon: {
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  compassDegree: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  speedBox: {
    position: "absolute",
    top: 50,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 8,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  speedValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2E86DE',
  },
  speedLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
  },
  // 🔥 Estilos do Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 28,
    width: '95%',
    maxWidth: 340,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    marginTop: 14,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  modalMessage: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  cancelButtonText: {
    color: '#495057',
    fontSize: 15,
    fontWeight: '700',
  },
  confirmButtonText: {
    color: '#FFF',
    fontWeight: '600',
    marginLeft: 6,
  },
  premiumModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 28,
    width: '90%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 15,
  },
  premiumIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  premiumModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e1b4b',
    marginBottom: 12,
    textAlign: 'center',
  },
  premiumModalMessage: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  premiumModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  premiumCancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumCancelButtonText: {
    color: '#4B5563',
    fontWeight: '700',
    fontSize: 15,
  },
  premiumConfirmButton: {
    flex: 1.3,
    borderRadius: 16,
    overflow: 'hidden',
  },
  premiumConfirmGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumConfirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  }
});