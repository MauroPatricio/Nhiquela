import React, { useEffect, useRef, useState } from "react";
import MapView, { Marker, Camera } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { StyleSheet, Dimensions, View, Text, Animated } from "react-native";
import COLORS from "../styles/colors";
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
  
  // Refs para animação suave
  const lastPositionRef = useRef<any>(null);
  const animationRef = useRef<any>(null);

  // Obter localização atual do usuário
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
        accuracy: Location.Accuracy.Balanced // Reduzido para melhor performance
      });
      
      const initialLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
      
      setOrigin(initialLocation);
      lastPositionRef.current = initialLocation;

      // Configurar watch para atualizações
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced, // Reduzido para melhor performance
          distanceInterval: 5, // Aumentado para menos atualizações
          timeInterval: 1000, // Aumentado para menos atualizações
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
          
          // Atualizar posição diretamente (sem animação complexa)
          setOrigin(updatedLocation);
          lastPositionRef.current = updatedLocation;
        }
      );
    })();

    return () => {
      // Cleanup
      if (locationSubscription) {
        locationSubscription.remove();
      }
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, []);

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
      pitch: 0, // Removido pitch 3D
      heading: customHeading !== undefined ? customHeading : heading,
      altitude: 1000, // Aumentado para vista mais plana
      zoom: 16, // Reduzido zoom para vista mais ampla
    };
    mapRef.current?.animateCamera(camera, { duration: 500 });
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
        edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
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

  // Estilo simplificado para rotacionar a seta
  const getArrowRotationStyle = () => {
    return {
      transform: [
        { rotate: `${heading}deg` }
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
        pitchEnabled={false} // Desabilitado pitch 3D
        scrollEnabled={true}
        zoomEnabled={true}
      >
        {origin && (
          <Marker 
            coordinate={origin} 
            title="Sua posição"
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
          >
            <Animated.View style={[styles.arrowMarkerContainer, getArrowRotationStyle()]}>
              <View style={styles.arrowSimple}>
                <Ionicons name="navigate" size={28} color={COLORS.primary} />
              </View>
            </Animated.View>
          </Marker>
        )}
        
        {destination && (
          <Marker coordinate={destination} title="Destino" flat={true}>
            <View style={styles.destinationMarker}>
              <Ionicons name="location" size={32} color="#FF3B30" />
            </View>
          </Marker>
        )}

        {origin && destination && (
          <MapViewDirections
            origin={origin}
            destination={destination}
            apikey={GOOGLE_API_KEY}
            strokeWidth={3}
            strokeColor={COLORS.primary}
            optimizeWaypoints={true}
            mode="DRIVING"
            onReady={handleRouteReady}
          />        
        )}
      </MapView>

      {duration && (
        <Animated.View style={[styles.timeBox, { opacity: fadeAnim }]}>
          <Ionicons name="time" size={18} color="#000" style={styles.timeIcon} />
          <Text style={styles.timeText}>{Math.round(duration)} min</Text>
        </Animated.View>
      )}

      {distance && (
        <View style={styles.distanceBox}>
          <Ionicons name="speedometer" size={16} color="#FFF" style={styles.distanceIcon} />
          <Text style={styles.distanceText}>{distance.toFixed(1)} km</Text>
        </View>
      )}

      {origin && (
        <View style={styles.compassBox}>
          <Text style={styles.compassText}>Direção</Text>
          <View style={styles.compassArrow}>
            <Ionicons 
              name="arrow-up" 
              size={20} 
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  destinationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBox: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    backgroundColor: "#FFD700",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
    fontSize: 16,
    fontWeight: "bold",
  },
  distanceBox: {
    position: "absolute",
    bottom: 30,
    left: 20,
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
    padding: 10,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  compassText: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
    fontWeight: '600',
  },
  compassArrow: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassIcon: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  compassDegree: {
    fontSize: 9,
    color: '#333',
    marginTop: 1,
    fontWeight: 'bold',
  },
});