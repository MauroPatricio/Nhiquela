import React, { useEffect, useRef, useState } from "react";
import MapView, { Marker, Camera, UrlTile, Polyline } from "react-native-maps";
import { 
  StyleSheet, 
  Dimensions, 
  View, 
  Text, 
  Animated, 
  TouchableOpacity,
  Modal,
  Alert 
} from "react-native";
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
  tripData, // Recebe os dados da viagem
  onStartTrip // Recebe a função startTrip
}: Props) {
  const mapRef = useRef<any>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [origin, setOrigin] = useState<any>(null);
  const [heading, setHeading] = useState<number>(0);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [speed, setSpeed] = useState<number>(0);

  const lastPositionRef = useRef<any>(null);
  const animationRef = useRef<any>(null);
  const hasInitialZoomed = useRef(false);

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
          setSpeed(Math.round(currentSpeed));

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
  };

  useEffect(() => {
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

            // Removemos fitToCoordinates para garantir que a câmera fica sempre aproximada no motorista
            // mapRef.current?.fitToCoordinates([origin, destination], {
            //  edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
            //  animated: true,
            // });

            if (onRouteReady) onRouteReady();

            if (coords.length > 1 && origin) {
              const routeHeading = calculateHeading(coords);
              updateCamera(origin, routeHeading);
            }
          }
        } catch (error) {
          console.warn("Erro ao buscar rota via OSRM:", error);
        }
      };
      fetchRoute();
    } else {
      setRouteCoordinates([]);
      setDuration(null);
      setDistance(null);
    }
  }, [origin?.latitude, origin?.longitude, destination?.latitude, destination?.longitude, shouldDrawRoute]);

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
          icon: "business"
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
        <UrlTile
          urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />
        {/* 🔥 MARCADOR DA LOCALIZAÇÃO ATUAL */}
        {origin && (
          <Marker 
            coordinate={origin} 
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
          <Marker coordinate={destination} title={destination.title || "Destino"} flat={true}>
            <View style={styles.destinationMarker}>
              <Ionicons 
                name={stepStatus === 4 ? "business" : "home"} 
                size={32} 
                color={stepStatus === 4 ? "#FF9500" : "#FF3B30"} 
              />
            </View>
          </Marker>
        )}

        {/* 🔥 ROTA OSRM CENTRALIZADA (APENAS SE DEVE DESENHAR E TEM ORIGEM+DESTINO) */}
        {origin && destination && shouldDrawRoute && routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={4}
            strokeColor={statusInfo.color}
            lineDashPattern={[0]}
          />        
        )}
      </MapView>

      {/* 🔥 INFO BOX SUPERIOR */}
      <View style={[styles.statusBox, { backgroundColor: statusInfo.color }]}>
        <Ionicons name={statusInfo.icon as any} size={20} color="#FFF" />
        <Text style={styles.statusText}>{statusInfo.title}</Text>
      </View>

      {/* 🔥 BOTÃO PARA INICIAR VIAGEM (APENAS NO ESTÁGIO 4) - AGORA MAIS VISÍVEL */}
      {stepStatus === 4 && (
        <View style={styles.startTripButtonContainer}>
          <TouchableOpacity 
            style={[styles.startTripButton, { backgroundColor: COLORS.warning }]}
            onPress={handleStartTripPress}
          >
            <Ionicons name="play-circle" size={28} color="#FFF" />
            <Text style={styles.startTripButtonText}>Iniciar Viagem</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 🔥 DURAÇÃO (APENAS SE TEM ROTA) */}
      {duration && shouldDrawRoute && (
        <Animated.View style={[styles.timeBox, { opacity: fadeAnim }]}>
          <Ionicons name="time" size={18} color="#000" style={styles.timeIcon} />
          <Text style={styles.timeText}>{Math.round(duration)} min</Text>
        </Animated.View>
      )}

      {/* 🔥 DISTÂNCIA (APENAS SE TEM ROTA) */}
      {distance && shouldDrawRoute && (
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


      {/* 🔥 MODAL DE CONFIRMAÇÃO */}
      <Modal
        visible={showConfirmationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelTrip}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Ionicons name="checkmark-circle" size={48} color={COLORS.warning} />
              <Text style={styles.modalTitle}>Confirmar Início da Viagem</Text>
            </View>
            
            <Text style={styles.modalMessage}>
              Você está prestes a iniciar a viagem para entrega. Confirme que recebeu a mercadoria e está pronto para partir.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancelTrip}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirmTrip}
              >
                <Ionicons name="checkmark" size={20} color="#FFF" />
                <Text style={styles.confirmButtonText}>Confirmar</Text>
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
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
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
    marginLeft: 6,
  },
  // 🔥 Container do Botão Iniciar Viagem - AGORA MAIS VISÍVEL
  startTripButtonContainer: {
    position: "absolute",
    top: '40%', // Posicionado no meio verticalmente
    alignSelf: "center",
    width: '80%', // Largura maior
  },
  startTripButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  startTripButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
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
  destinationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBox: {
    position: "absolute",
    top: 100,
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
  },
  timeIcon: {
    marginRight: 6,
  },
  timeText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "bold",
  },
  distanceBox: {
    position: "absolute",
    bottom: 30,
    left: 20,
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
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
    fontSize: 12,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  confirmButton: {
    backgroundColor: COLORS.warning,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});