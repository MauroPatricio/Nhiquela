import React, { useEffect, useRef, useState } from "react";
import MapView, { Marker, Camera } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { StyleSheet, Dimensions, View, Text, Animated } from "react-native";
import { COLORS } from "../styles/colors";
import * as Location from 'expo-location';
import { Ionicons } from "@expo/vector-icons";

type Props = {
  destination: any;
  onRouteReady: () => void;
};

const GOOGLE_API_KEY = "AIzaSyCcEJkIShYipbwcKBfDFKKkLR6QudOQG3Q";

export default function TripMap({ destination, onRouteReady }: Props) {
  const mapRef = useRef<MapView>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [origin, setOrigin] = useState<any>(null);
  const [heading, setHeading] = useState<number>(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // Refs para animação suave - CORREÇÃO: usar any para timeout
  const lastPositionRef = useRef<any>(null);
  const animationRef = useRef<any>(null);
  const positionAnim = useRef(new Animated.ValueXY()).current;

  // Obter localização atual do usuário com movimento ultra suave
  useEffect(() => {
    let locationSubscription: any = null;

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permissão de localização negada');
        return;
      }

      // Obter localização inicial
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      const initialLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
      
      setOrigin(initialLocation);
      lastPositionRef.current = initialLocation;
      positionAnim.setValue({
        x: initialLocation.longitude,
        y: initialLocation.latitude
      });

      // Configurar watch para atualizações suaves
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 2,
          timeInterval: 500,
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
          
          // Animação ultra suave para nova posição
          ultraSmoothAnimateToPosition(updatedLocation);
          lastPositionRef.current = updatedLocation;
        }
      );
    })();

    return () => {
      // Cleanup de todas as subscriptions e timeouts
      if (locationSubscription) {
        locationSubscription.remove();
      }
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, []);

  // Animação ultra suave com interpolação em milissegundos
  const ultraSmoothAnimateToPosition = (newPosition: any) => {
    if (!origin) return;

    const steps = 20;
    const totalDuration = 800;
    const stepDuration = totalDuration / steps;
    
    const startLat = origin.latitude;
    const startLng = origin.longitude;
    const latStep = (newPosition.latitude - startLat) / steps;
    const lngStep = (newPosition.longitude - startLng) / steps;
    
    let currentStep = 0;
    
    const animateStep = () => {
      if (currentStep < steps) {
        currentStep++;
        
        const progress = currentStep / steps;
        const easedProgress = easeInOutCubic(progress);
        
        const intermediatePosition = {
          latitude: startLat + (latStep * currentStep),
          longitude: startLng + (lngStep * currentStep)
        };
        
        setOrigin(intermediatePosition);
        updateCamera(intermediatePosition);
        
        animationRef.current = setTimeout(animateStep, stepDuration);
      } else {
        setOrigin(newPosition);
        updateCamera(newPosition);
      }
    };
    
    animateStep();
  };

  // Função de easing para movimento mais natural
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  // Calcular bearing (direção) entre dois pontos
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
      pitch: 75,
      heading: customHeading !== undefined ? customHeading : heading,
      altitude: 200,
      zoom: 18,
    };
    mapRef.current?.animateCamera(camera, { duration: 800 });
  };

  useEffect(() => {
    if (origin && mapRef.current) {
      updateCamera(origin);
    }
    startBlinkAnimation();
  }, [origin]);

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

  const handleRouteReady = (result: any) => {
    console.log("📍 Route result:", result);
  
    if (result.duration_in_traffic) {
      console.log("🚦 Tempo com trânsito:", result.duration_in_traffic);
      setDuration(result.duration_in_traffic);
    } else {
      setDuration(result.duration);
    }
  
    setDistance(result.distance);
  
    if (origin) {
      mapRef.current?.fitToCoordinates([origin, ...result.coordinates], {
        edgePadding: { top: 150, right: 50, bottom: 150, left: 50 },
        animated: true,
      });
    }
    
    if (onRouteReady) onRouteReady();

    if (result.coordinates.length > 1 && origin) {
      const routeHeading = calculateHeading(result.coordinates);
      updateCamera(origin, routeHeading);
    }
  };

  const calculateHeading = (coordinates: any[]) => {
    const start = coordinates[0];
    const next = coordinates[1];
    const dx = next.longitude - start.longitude;
    const dy = next.latitude - start.latitude;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    return angle;
  };

  // Estilo para rotacionar a seta 3D
  const getArrowRotationStyle = () => {
    return {
      transform: [
        { rotate: `${heading}deg` },
        { perspective: 1000 }
      ]
    };
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        showsUserLocation={false}
        loadingEnabled
        rotateEnabled={true}
        pitchEnabled={true}
      >
        {origin && (
          <Marker 
            coordinate={origin} 
            title="Sua posição"
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
          >
            <Animated.View style={[styles.arrowMarkerContainer, getArrowRotationStyle()]}>
              <View style={styles.arrow3D}>
                <Ionicons name="navigate" size={32} color={COLORS.primary} />
              </View>
              <View style={styles.arrowShadow} />
              <View style={styles.arrowGlow} />
            </Animated.View>
          </Marker>
        )}
        
        {destination && (
          <Marker coordinate={destination} title="Destino" flat={true}>
            <View style={styles.destinationMarker}>
              <Ionicons name="location" size={36} color="#FF3B30" />
              <View style={styles.destinationPulse} />
            </View>
          </Marker>
        )}

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
          />        
        )}
      </MapView>

      {duration && (
        <Animated.View style={[styles.timeBox, { opacity: fadeAnim }]}>
          <Ionicons name="time" size={20} color="#000" style={styles.timeIcon} />
          <Text style={styles.timeText}>{Math.round(duration)} min</Text>
        </Animated.View>
      )}

      {distance && (
        <View style={styles.distanceBox}>
          <Ionicons name="speedometer" size={18} color="#FFF" style={styles.distanceIcon} />
          <Text style={styles.distanceText}>{distance.toFixed(1)} km</Text>
        </View>
      )}

      {origin && (
        <View style={styles.compassBox}>
          <Text style={styles.compassText}>Direção</Text>
          <View style={styles.compassArrow}>
            <Ionicons 
              name="arrow-up" 
              size={24} 
              color={COLORS.primary} 
              style={[styles.compassIcon, { transform: [{ rotate: `${heading}deg` }] }]} 
            />
          </View>
          <Text style={styles.compassDegree}>{Math.round(heading)}°</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },
  arrowMarkerContainer: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  arrow3D: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  arrowShadow: {
    position: 'absolute',
    bottom: -5,
    width: 25,
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 4,
    transform: [{ skewX: '-20deg' }],
  },
  arrowGlow: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    opacity: 0.1,
  },
  destinationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  destinationPulse: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF3B30',
    opacity: 0.2,
    zIndex: -1,
  },
  timeBox: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    backgroundColor: "#FFD700",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeIcon: {
    marginRight: 8,
  },
  timeText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "sans-serif-condensed",
  },
  distanceBox: {
    position: "absolute",
    bottom: 30,
    left: 20,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceIcon: {
    marginRight: 6,
  },
  distanceText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  compassBox: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 12,
    borderRadius: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  compassText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  compassArrow: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassIcon: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  compassDegree: {
    fontSize: 10,
    color: '#333',
    marginTop: 2,
    fontWeight: 'bold',
  },
});