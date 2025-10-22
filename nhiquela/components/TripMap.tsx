import * as React from 'react';
import { useEffect, useRef, useState, useCallback } from "react";
import MapView, { Marker } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { 
  StyleSheet, 
  Dimensions, 
  View, 
  Text, 
  Animated, 
  TouchableOpacity,
  PanResponder,
  SafeAreaView,
  Alert,
  Image
} from "react-native";
import COLORS from "../styles/colors";
import * as Location from 'expo-location';
import { Ionicons } from "@expo/vector-icons";

type DriverInfo = {
  photo: string;
  name: string;
  phoneNumber: number;
  transport_type: string;
  transport_color: string;
  transport_registration: string;
  vihicle_picture: string;
  vihicle_inspection: string;
  vihicle_Insurance: string;
  license_front: string;
  license_back: string;
  document_type: string;
  document_front: string;
  document_back: string;
  Proof_of_Address: string;
  Proof_of_Addres_Reason: string;
  register_conformance: "PENDING_CONFORMANCE" | "CONFORMANCE" | "INCONFORMANCE";
};

type Props = {
  destination: any;
  onRouteReady: () => void;
  onDeliveryConfirmed?: () => void;
  deliveryman?: DriverInfo;
};

const GOOGLE_API_KEY = "AIzaSyCcEJkIShYipbwcKBfDFKKkLR6QudOQG3Q";

// Componente para otimizar a imagem base64
const OptimizedDriverPhoto = React.memo(({ base64String }: { base64String: string }) => {
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (base64String && base64String.trim() !== '') {
      try {
        // Verificar se já tem o prefixo data:image
        const uri = base64String.startsWith('data:image') 
          ? base64String 
          : `data:image/jpeg;base64,${base64String}`;
        setImageUri(uri);
      } catch (error) {
        console.log('Erro ao processar imagem base64:', error);
      }
    }
  }, [base64String]);

  if (!imageUri) {
    return (
      <View style={styles.driverPhotoPlaceholder}>
        <Ionicons name="person" size={20} color="#666" />
      </View>
    );
  }

  return (
    <Image 
      source={{ uri: imageUri }} 
      style={styles.driverPhoto}
      resizeMode="cover"
      defaultSource={require('../assets/icon.png')} // Adicione uma imagem placeholder
      onError={(e) => {
        console.log('Erro ao carregar imagem do motorista:', e.nativeEvent.error);
        setImageUri(null);
      }}
    />
  );
});

export default function TripMap({ destination, onRouteReady, onDeliveryConfirmed, deliveryman }: Props) {
  const mapRef = useRef<MapView>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [origin, setOrigin] = useState<any>(null);
  const [heading, setHeading] = useState<number>(0);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [isNearDestination, setIsNearDestination] = useState(false);
  const [canConfirmDelivery, setCanConfirmDelivery] = useState(false);
  const [showDriverInfo, setShowDriverInfo] = useState(true);
  
  // Animações
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const sheetHeight = useRef(new Animated.Value(100)).current;
  const confirmButtonAnim = useRef(new Animated.Value(0)).current;
  const driverInfoAnim = useRef(new Animated.Value(1)).current;
  
  // Refs para otimização
  const lastPositionRef = useRef<any>(null);
  const routeDrawnRef = useRef(false);

  // Configurar PanResponder para o sheet
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          sheetHeight.setValue(Math.max(80, 200 - gestureState.dy));
        } else {
          sheetHeight.setValue(Math.min(300, 100 - gestureState.dy));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 50) {
          collapseSheet();
        } else if (gestureState.dy < -50) {
          expandSheet();
        } else {
          if (isSheetExpanded) {
            expandSheet();
          } else {
            collapseSheet();
          }
        }
      },
    })
  ).current;

  const expandSheet = () => {
    setIsSheetExpanded(true);
    Animated.parallel([
      Animated.timing(sheetHeight, {
        toValue: 300,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(sheetAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const collapseSheet = () => {
    setIsSheetExpanded(false);
    Animated.parallel([
      Animated.timing(sheetHeight, {
        toValue: 100,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(sheetAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const toggleSheet = () => {
    if (isSheetExpanded) {
      collapseSheet();
    } else {
      expandSheet();
    }
  };

  // Calcular distância entre dois pontos (função otimizada)
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }, []);

  // Verificar proximidade do destino (otimizada)
  const checkProximityToDestination = useCallback((currentLocation: any) => {
    if (!destination || !currentLocation) return;

    const distanceToDestination = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      destination.latitude,
      destination.longitude
    );

    // Converter distância para tempo estimado
    const timeInSeconds = (distanceToDestination / 40) * 3600;

    setRemainingTime(timeInSeconds);

    // Ativar botão de confirmação se estiver a 30 segundos ou menos
    if (timeInSeconds <= 30 && !canConfirmDelivery) {
      setIsNearDestination(true);
      setCanConfirmDelivery(true);
      Animated.timing(confirmButtonAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      
      Alert.alert(
        "Próximo do Destino",
        "Você está a 30 segundos do destino. Prepare-se para confirmar a entrega.",
        [{ text: "OK" }]
      );
    } else if (timeInSeconds > 30 && canConfirmDelivery) {
      setIsNearDestination(false);
      setCanConfirmDelivery(false);
      Animated.timing(confirmButtonAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [destination, canConfirmDelivery, calculateDistance]);

  // Cálculo de direção otimizado
  const calculateBearing = useCallback((start: any, end: any) => {
    const startLat = start.latitude * Math.PI / 180;
    const startLng = start.longitude * Math.PI / 180;
    const endLat = end.latitude * Math.PI / 180;
    const endLng = end.longitude * Math.PI / 180;

    const y = Math.sin(endLng - startLng) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) -
             Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
    
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }, []);

  // Obter localização atual do usuário (OTIMIZADA)
  useEffect(() => {
    let locationSubscription: any = null;
    let isMounted = true;

    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.error('Permissão de localização negada');
          return;
        }

        // Configuração para performance
        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        
        const initialLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        };
        
        if (isMounted) {
          setOrigin(initialLocation);
          lastPositionRef.current = initialLocation;
          checkProximityToDestination(initialLocation);
        }

        // Watch position com configurações otimizadas
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 10,
            timeInterval: 2000,
          },
          (newLocation) => {
            if (!isMounted) return;
            
            const updatedLocation = {
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude
            };
            
            // Atualização otimizada
            if (lastPositionRef.current && 
                (Math.abs(lastPositionRef.current.latitude - updatedLocation.latitude) > 0.0001 ||
                 Math.abs(lastPositionRef.current.longitude - updatedLocation.longitude) > 0.0001)) {
              
              const newHeading = calculateBearing(
                lastPositionRef.current,
                updatedLocation
              );
              setHeading(newHeading);
              
              setOrigin(updatedLocation);
              lastPositionRef.current = updatedLocation;
              checkProximityToDestination(updatedLocation);
            }
          }
        );
      } catch (error) {
        console.error('Erro na localização:', error);
      }
    })();

    return () => {
      isMounted = false;
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [destination, calculateBearing, checkProximityToDestination]);

  useEffect(() => {
    startBlinkAnimation();
  }, []);

  const startBlinkAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Handler de rota pronta otimizado
  const handleRouteReady = useCallback((result: any) => {
    if (routeDrawnRef.current) return;
    
    routeDrawnRef.current = true;
    
    setDuration(result.duration_in_traffic || result.duration);
    setDistance(result.distance);

    if (origin && mapRef.current) {
      // Fit to coordinates sem a propriedade duration
      mapRef.current.fitToCoordinates([origin, ...result.coordinates], {
        edgePadding: { top: 50, right: 50, bottom: 150, left: 50 },
        animated: true,
      });
    }
    
    if (onRouteReady) onRouteReady();
  }, [origin, onRouteReady]);

  const getArrowRotationStyle = () => ({
    transform: [{ rotate: `${heading}deg` }]
  });

  const formatDuration = useCallback((minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }, []);

  const formatRemainingTime = useCallback((seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)} seg`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return secs > 0 ? `${minutes}min ${secs}seg` : `${minutes}min`;
  }, []);

  const handleConfirmDelivery = () => {
    Alert.alert(
      "Confirmar Entrega",
      "Deseja confirmar a entrega deste pedido?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Confirmar", 
          onPress: () => {
            if (onDeliveryConfirmed) onDeliveryConfirmed();
            Alert.alert("Sucesso", "Entrega confirmada com sucesso!");
          }
        },
      ]
    );
  };

  const hideDriverInfo = () => {
    Animated.timing(driverInfoAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowDriverInfo(false));
  };

  // Renderizar informações do motorista
  const renderDriverInfo = () => {
    if (!deliveryman) {
      console.log('Nenhum dado do motorista disponível');
      return null;
    }

    console.log('Dados do motorista recebidos:', {
      name: deliveryman.name,
      hasPhoto: !!deliveryman.photo,
      phone: deliveryman.phoneNumber,
      vehicle: deliveryman.transport_type
    });

    return (
      <Animated.View 
        style={[
          styles.driverInfoContainer,
          {
            opacity: driverInfoAnim,
            transform: [{
              translateY: driverInfoAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0]
              })
            }]
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.closeDriverInfo}
          onPress={hideDriverInfo}
        >
          <Ionicons name="close" size={16} color="#666" />
        </TouchableOpacity>
        
        <View style={styles.driverHeader}>
          <OptimizedDriverPhoto base64String={deliveryman.photo} />
          <View style={styles.driverBasicInfo}>
            <Text style={styles.driverName}>
              {deliveryman.name || "Motorista"}
            </Text>
            <Text style={styles.driverPhone}>
              {deliveryman.phoneNumber ? `+${deliveryman.phoneNumber}` : 'Telefone não disponível'}
            </Text>
            <View style={styles.conformanceBadge}>
              <Text style={[
                styles.conformanceText,
                deliveryman.register_conformance === "CONFORMANCE" && styles.conformanceSuccess,
                deliveryman.register_conformance === "INCONFORMANCE" && styles.conformanceError
              ]}>
                {deliveryman.register_conformance === "CONFORMANCE" ? "✓ Verificado" : 
                 deliveryman.register_conformance === "INCONFORMANCE" ? "✗ Não Conforme" : "⏳ Pendente"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.driverDetails}>
          <View style={styles.driverDetailItem}>
            <Ionicons name="car-sport" size={14} color="#666" />
            <Text style={styles.driverDetailText}>
              {deliveryman.transport_type || "Veículo"}
            </Text>
          </View>
          
          <View style={styles.driverDetailItem}>
            <View 
              style={[
                styles.colorIndicator,
                { backgroundColor: getCarColorHex(deliveryman.transport_color) }
              ]} 
            />
            <Text style={styles.driverDetailText}>
              {deliveryman.transport_color || "Não especificado"}
            </Text>
          </View>

          <View style={styles.driverDetailItem}>
            <Ionicons name="card" size={14} color="#666" />
            <Text style={styles.driverDetailText}>
              {deliveryman.transport_registration || "Sem matrícula"}
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Mapa OTIMIZADO - SEM CONGELAMENTO */}
      <MapView
        ref={mapRef}
        style={styles.map}
        showsUserLocation={false}
        loadingEnabled={true}
        rotateEnabled={true}
        pitchEnabled={true} // HABILITADO para melhor experiência
        scrollEnabled={true}
        zoomEnabled={true} // HABILITADO para zoom
        showsBuildings={true}
        showsTraffic={false}
        showsIndoors={false}
        showsPointsOfInterest={true}
        cacheEnabled={true}
        moveOnMarkerPress={true}
        toolbarEnabled={true}
        loadingIndicatorColor={COLORS.primary}
        loadingBackgroundColor="#f8f8f8"
        initialRegion={{
          latitude: origin?.latitude || -25.9667,
          longitude: origin?.longitude || 32.5833,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {/* Marcador de origem - VISÍVEL */}
        {origin && (
          <Marker 
            coordinate={origin} 
            title="Sua posição"
            description="Localização atual"
            anchor={{ x: 0.5, y: 0.5 }}
            flat={false}
            tracksViewChanges={false}
          >
            <View style={styles.arrowMarkerContainer}>
              <Animated.View style={[styles.arrowSimple, getArrowRotationStyle()]}>
                <Ionicons name="navigate" size={20} color={COLORS.primary} />
              </Animated.View>
            </View>
          </Marker>
        )}
        
        {/* Marcador de destino - VISÍVEL */}
        {destination && (
          <Marker 
            coordinate={destination} 
            title="Destino" 
            description="Local de entrega"
            anchor={{ x: 0.5, y: 0.5 }}
            flat={false}
            tracksViewChanges={false}
          >
            <View style={styles.destinationMarker}>
              <Ionicons name="location" size={24} color="#FF3B30" />
            </View>
          </Marker>
        )}

        {/* Direções - VISÍVEIS */}
        {origin && destination && (
          <MapViewDirections
            origin={origin}
            destination={destination}
            apikey={GOOGLE_API_KEY}
            strokeWidth={4}
            strokeColor={COLORS.primary}
            optimizeWaypoints={true}
            mode="DRIVING"
            onReady={handleRouteReady}
            precision="low"
            splitWaypoints={true}
            timePrecision="none"
          />        
        )}
      </MapView>

      {/* Quadro de Informações do Motorista - VISÍVEL */}
      {showDriverInfo && renderDriverInfo()}

      {/* Botão de Confirmar Entrega */}
      <Animated.View 
        style={[
          styles.confirmDeliveryButtonContainer,
          {
            opacity: confirmButtonAnim,
            transform: [{
              scale: confirmButtonAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1]
              })
            }]
          }
        ]}
      >
        <TouchableOpacity 
          style={[
            styles.confirmDeliveryButton,
            !canConfirmDelivery && styles.confirmDeliveryButtonDisabled
          ]}
          onPress={handleConfirmDelivery}
          disabled={!canConfirmDelivery}
        >
          <Ionicons name="checkmark-circle" size={18} color="#FFF" />
          <Text style={styles.confirmDeliveryButtonText}>Confirmar Entrega</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Estimativa de Tempo */}
      <View style={styles.timeEstimateContainer}>
        <Animated.View style={[styles.timeEstimateButton, { opacity: fadeAnim }]}>
          <Ionicons name="time" size={18} color="#FFF" />
          <Text style={styles.timeEstimateText}>
            {remainingTime !== null 
              ? `Chegada em ${formatRemainingTime(remainingTime)}` 
              : "Calculando rota..."}
          </Text>
          {isNearDestination && (
            <View style={styles.nearDestinationIndicator}>
              <Ionicons name="flash" size={12} color="#FFF" />
            </View>
          )}
        </Animated.View>
      </View>

      {/* Bottom Sheet Funcional */}
      <Animated.View 
        style={[
          styles.sheetContainer,
          { 
            height: sheetHeight,
          }
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.sheetHandle}>
          <View style={styles.handleBar} />
        </View>

        <View style={styles.compactContent}>
          <View style={styles.mainInfo}>
            <View style={styles.infoItem}>
              <Ionicons name="time" size={16} color={COLORS.primary} />
              <Text style={styles.infoText}>
                {duration ? formatDuration(duration) : "--"}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Ionicons name="speedometer" size={14} color={COLORS.primary} />
              <Text style={styles.infoText}>
                {distance ? `${distance.toFixed(1)} km` : "--"}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.expandButton}
            onPress={toggleSheet}
          >
            <Ionicons 
              name={isSheetExpanded ? "chevron-down" : "chevron-up"} 
              size={16} 
              color="#FFF" 
            />
          </TouchableOpacity>
        </View>

        <Animated.View 
          style={[
            styles.expandedContent,
            {
              opacity: sheetAnim,
              display: isSheetExpanded ? 'flex' : 'none'
            }
          ]}
        >
          <View style={styles.detailSection}>
            <Text style={styles.detailTitle}>Detalhes da Rota</Text>
            <View style={styles.detailGrid}>
              <View style={styles.detailItem}>
                <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                <Text style={styles.detailLabel}>Tempo</Text>
                <Text style={styles.detailValue}>
                  {duration ? formatDuration(duration) : "--"}
                </Text>
              </View>
              
              <View style={styles.detailItem}>
                <Ionicons name="speedometer-outline" size={18} color={COLORS.primary} />
                <Text style={styles.detailLabel}>Distância</Text>
                <Text style={styles.detailValue}>
                  {distance ? `${distance.toFixed(1)} km` : "--"}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// Helper function para cores de carro
const getCarColorHex = (color: string) => {
  const colors: {[key: string]: string} = {
    'Preto': '#000000',
    'Branco': '#FFFFFF',
    'Prata': '#C0C0C0',
    'Cinza': '#808080',
    'Vermelho': '#FF0000',
    'Azul': '#0000FF',
    'Verde': '#008000',
    'Amarelo': '#FFFF00',
    'Laranja': '#FFA500',
    'Marrom': '#8B4513',
    'Roxo': '#800080',
    'Rosa': '#FFC0CB',
  };
  return colors[color] || '#666666';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  arrowMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowSimple: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  destinationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  // Quadro do Motorista - CORRIGIDO E VISÍVEL
  driverInfoContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    zIndex: 1000, // Garante que fique acima de tudo
  },
  closeDriverInfo: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1001,
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  driverPhotoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  driverBasicInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  driverPhone: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  conformanceBadge: {
    alignSelf: 'flex-start',
  },
  conformanceText: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#FFA500',
    color: '#FFF',
    overflow: 'hidden',
  },
  conformanceSuccess: {
    backgroundColor: '#4CAF50',
  },
  conformanceError: {
    backgroundColor: '#F44336',
  },
  driverDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  driverDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: '30%',
  },
  driverDetailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    flexShrink: 1,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  // Botão de Confirmar Entrega
  confirmDeliveryButtonContainer: {
    position: 'absolute',
    top: 140,
    left: 16,
    right: 16,
    alignItems: 'flex-start',
    zIndex: 999,
  },
  confirmDeliveryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  confirmDeliveryButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  confirmDeliveryButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 6,
  },
  // Estimativa de Tempo
  timeEstimateContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  timeEstimateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },
  timeEstimateText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
  },
  nearDestinationIndicator: {
    backgroundColor: '#FF5722',
    borderRadius: 8,
    padding: 3,
    marginLeft: 6,
  },
  // Bottom Sheet
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
    zIndex: 1000,
  },
  sheetHandle: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 2,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  mainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  infoText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  expandButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  detailSection: {
    marginTop: 8,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  detailGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  detailLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginTop: 2,
  },
});