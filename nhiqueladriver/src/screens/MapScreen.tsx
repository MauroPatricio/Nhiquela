import React, { useState, useEffect } from "react";
import { View, StyleSheet, Alert, ActivityIndicator, Text, TouchableOpacity } from "react-native";
import TripMap from "../components/TripMap";
import TripControls from "../components/TripControls";
import { getCurrentLocation, updateDeliverymanLocation } from "../services/driverLocationService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from 'expo-location';
import { startOrderInTransit } from "../services/orderService"; 
import { io } from 'socket.io-client';
import { showMessage } from "react-native-flash-message";

// 🔥 LOCALIZAÇÃO FALLBACK (caso não consiga obter a real)
const FALLBACK_LOCATION = {
  latitude: -25.8195323,
  longitude: 32.5109306
};

export default function MapScreen({ route, navigation }: any) {
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [destination, setDestination] = useState<any>(null);
  const [routeDrawn, setRouteDrawn] = useState(false);
  const [canFinishTrip, setCanFinishTrip] = useState(false);
  const [tripData, setTripData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [startingTrip, setStartingTrip] = useState(false);

  useEffect(() => {
    let interval: any;
    let socket: any;
  
    const startAutoUpdate = async () => {
      try {
        const storedTripString = await AsyncStorage.getItem("acceptedTrip");
        if (!storedTripString) return;
  
        const storedTrip = JSON.parse(storedTripString);
        const orderId = storedTrip.id;

        // Conectar ao Socket do Backend para Rastreamento em Tempo Real
        const isDev = process.env.NODE_ENV !== 'production';
        const backendUrl = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || (isDev ? 'http://localhost:5000' : 'https://api.nhiquelaservicos.com');
        socket = io(backendUrl);
  
        await updateDeliverymanLocation(orderId);
  
        // Atualiza a localização a cada 5 segundos via socket
        interval = setInterval(async () => {
          try {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const locationData = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              heading: loc.coords.heading
            };
            
            // Emite a localização em tempo real para o cliente
            socket.emit('updateDriverLocation', {
              orderId,
              location: locationData
            });

            // Fallback: Atualiza na API também, mas num intervalo maior se necessário
            await updateDeliverymanLocation(orderId);
          } catch (err) {
            console.log("Erro ao capturar GPS para socket", err);
          }
        }, 5000);
  
      } catch (error) {
        console.error("Erro ao iniciar atualização automática da localização:", error);
      }
    };
  
    startAutoUpdate();
  
    return () => {
      if (interval) clearInterval(interval);
      if (socket) socket.disconnect();
    };
  }, []);
  

  useEffect(() => {
    const loadTripData = async () => {
      try {
        setLoading(true);

        // 🔥 Obter localização atual com fallback PRIMEIRO
        try {
          const location = await getCurrentLocation();
          setCurrentLocation(location);
          setLocationError(null);
        } catch (locationError: any) {
          console.warn("⚠️ Não foi possível obter localização, usando fallback:", locationError.message);
          setCurrentLocation(FALLBACK_LOCATION);
          setLocationError(locationError.message);
        }

        const storedTripString = await AsyncStorage.getItem("acceptedTrip");
  
        if (!storedTripString) {
          setLoading(false);
          return;
        }
  
        const storedTrip = JSON.parse(storedTripString);
  
        // 🔥 Guardar dados no estado
        setTripData(storedTrip);
  
        // 🔥 Definir destino baseado no stepStatus
        if (storedTrip) {  
          if (storedTrip.stepStatus === 4) {
            // STEP 4 → destino = local do VENDEDOR (destinationLocation)
            const vendorLat = Number(storedTrip.destinationLocation?.latitude);
            const vendorLng = Number(storedTrip.destinationLocation?.longitude);
  
            if (vendorLat && vendorLng) {
              const vendorLocation = {
                latitude: vendorLat,
                longitude: vendorLng,
                title: storedTrip.destination || "Local de Coleta (Vendedor)",
              };
              setDestination(vendorLocation);
            } else {
              showMessage({
                message: "Atenção",
                description: "Localização do cliente indisponível.",
                type: "danger",
                icon: "warning",
                duration: 4000,
                style: {
                  paddingTop: 40,
                  borderRadius: 16,
                  margin: 10,
                  backgroundColor: '#FF3B30',
                },
                titleStyle: {
                  fontSize: 16,
                  fontWeight: "bold",
                  color: "#FFF"
                },
                textStyle: {
                  fontSize: 14,
                  color: "#FFF"
                }
              });
            }
  
          } else if (storedTrip.stepStatus === 5) {
            // STEP 5 → destino = local do CLIENTE (deliveryAddress)
            const clientLat = Number(storedTrip.originalData?.deliveryAddress?.latitude);
            const clientLng = Number(storedTrip.originalData?.deliveryAddress?.longitude);
  
            if (clientLat && clientLng) {
              const clientLocation = {
                latitude: clientLat,
                longitude: clientLng,
                title: storedTrip.originalData?.deliveryAddress?.address || "Destino do Cliente",
              };
              setDestination(clientLocation);
            } else {
              Alert.alert("Aviso", "Localização do cliente não disponível.");
            }
  
          } else {
            // STEP PENDENTE / ACEITE MAS NÃO INICIADO → destino = local da COLETA (VENDEDOR/CLIENTE ORIGEM)
            // Permite ao motorista ver a distância e rota até à coleta ANTES de aceitar/iniciar.
            const pickupLat = Number(storedTrip.destinationLocation?.latitude || storedTrip.originalData?.seller?.latitude || storedTrip.originalData?.originLocation?.latitude);
            const pickupLng = Number(storedTrip.destinationLocation?.longitude || storedTrip.originalData?.seller?.longitude || storedTrip.originalData?.originLocation?.longitude);
            
            if (pickupLat && pickupLng) {
              const pickupLocation = {
                latitude: pickupLat,
                longitude: pickupLng,
                title: storedTrip.destination || "Local da Coleta",
              };
              setDestination(pickupLocation);
            } else {
              setDestination(null);
            }
          }
        }
  
      } catch (err: any) {
        Alert.alert("Erro", "Não foi possível carregar os dados do mapa.");
      } finally {
        setLoading(false);
      }
    };
  
    loadTripData();
  }, []);
  
  // 🔥 FUNÇÃO startTrip ATUALIZADA
  const startTrip = async (trip: any) => {
    try {
      setStartingTrip(true);

      // Feedback visual instantâneo
      const updatedTrip = {
        ...trip,
        status: 'Em trânsito', 
        stepStatus: 5
      };
      
      setTripData(updatedTrip);
      await AsyncStorage.setItem("acceptedTrip", JSON.stringify(updatedTrip));

      // 🔥 ATUALIZAR LOCALIZAÇÃO NO BACKEND AO INICIAR VIAGEM
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });

        await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/orders/${trip.id}/deliveryman-location`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await AsyncStorage.getItem('authToken')}`
          },
          body: JSON.stringify({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            speed: location.coords.speed,
            heading: location.coords.heading,
            timestamp: new Date().toISOString(),
            action: 'trip_started'
          })
        });
      } catch (locationError) {
        console.warn('Erro ao atualizar localização de início:', locationError);
      }

      // Atualizar status da ordem no backend
      const isRequestDeliver = trip.originalData?.goodType !== undefined;
      await startOrderInTransit(trip.id, isRequestDeliver);

      // Atualizar destino para o cliente (agora stepStatus = 5)
      const clientLat = Number(trip.originalData?.deliveryAddress?.latitude);
      const clientLng = Number(trip.originalData?.deliveryAddress?.longitude);

      if (clientLat && clientLng) {
        const clientLocation = {
          latitude: clientLat,
          longitude: clientLng,
          title: trip.originalData?.deliveryAddress?.address || "Destino do Cliente",
        };
        setDestination(clientLocation);
      }

      Alert.alert("✅ Viagem Iniciada", "Você iniciou a viagem para entrega!");

    } catch (error: any) {
      console.error("Erro ao iniciar viagem:", error.message);
      
      // Reverter mudança visual em caso de erro
      const revertedTrip = {
        ...trip,
        status: 'Aceite pelo entregador',
        stepStatus: 4
      };
      
      setTripData(revertedTrip);
      await AsyncStorage.setItem("acceptedTrip", JSON.stringify(revertedTrip));
      
      Alert.alert("Erro", "Não foi possível iniciar a viagem.");
    } finally {
      setStartingTrip(false);
    }
  };

  const handleCancelTrip = () => {
    if (routeDrawn) {
      Alert.alert(
        "❌ Cancelamento não permitido",
        "Não é possível cancelar a viagem após a rota estar desenhada. Complete a entrega do produto.",
        [{ text: "OK" }]
      );
    } else {
      Alert.alert("Viagem cancelada", "Você cancelou a viagem.");
      AsyncStorage.removeItem("acceptedTrip");
      navigation.goBack();
    }
  };

  const handleFinishTrip = () => {
    if (!canFinishTrip) {
      Alert.alert(
        "⏳ Viagem não pode ser finalizada",
        "Você precisa estar próximo ao destino para finalizar."
      );
      return;
    }
    Alert.alert("✅ Viagem finalizada", "Entrega concluída com sucesso!");
    AsyncStorage.removeItem("acceptedTrip");
    navigation.navigate("Home");
  };

  const handleRetryLocation = async () => {
    try {
      setLoading(true);
      const location = await getCurrentLocation();
      setCurrentLocation(location);
      setLocationError(null);
    } catch (error: any) {
      console.error("❌ Falha ao tentar obter localização novamente:", error.message);
      setLocationError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 TELA DE CARREGAMENTO
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E86DE" />
        <Text style={styles.loadingText}>Carregando mapa...</Text>
      </View>
    );
  }

  // 🔥 SE NÃO TEM LOCALIZAÇÃO (nem fallback)
  if (!currentLocation) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Não foi possível obter a localização</Text>
        <Text style={styles.errorDetail}>{locationError}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={handleRetryLocation}
        >
          <Text style={styles.retryText}>Tentar Novamente</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 🔥 AVISO SE ESTIVER USANDO FALLBACK */}
      {locationError && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            ⚠️ Usando localização aproximada: {locationError}
          </Text>
          <TouchableOpacity onPress={handleRetryLocation}>
            <Text style={styles.retryLinkText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 🔥 INDICADOR DE CARREGAMENTO AO INICIAR VIAGEM */}
      {startingTrip && (
        <View style={styles.startingTripOverlay}>
          <ActivityIndicator size="large" color="#FFF" />
          <Text style={styles.startingTripText}>Iniciando viagem...</Text>
        </View>
      )}

      {/* 🔥 COMPONENTE DO MAPA */}
      <TripMap
        currentLocation={currentLocation}
        destination={destination}
        stepStatus={tripData?.stepStatus}
        onRouteReady={() => {
          setRouteDrawn(true);
          setCanFinishTrip(true);
        }}
        shouldDrawRoute={tripData?.stepStatus === 4 || tripData?.stepStatus === 5}
        tripData={tripData}
        onStartTrip={startTrip}
        onCancelTrip={handleCancelTrip}
        onFinishTrip={handleFinishTrip}
        canFinishTrip={canFinishTrip}
        routeDrawn={routeDrawn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff" 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10
  },
  errorText: {
    fontSize: 18,
    color: "#FF3B30",
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "bold"
  },
  errorDetail: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20
  },
  retryButton: {
    backgroundColor: "#2E86DE",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 10
  },
  retryText: {
    color: "#FFF",
    fontWeight: "bold"
  },
  backButton: {
    backgroundColor: "#666",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8
  },
  backText: {
    color: "#FFF",
    fontWeight: "bold"
  },
  warningBanner: {
    backgroundColor: "#FFF3CD",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#FFEAA7",
    alignItems: "center",
    zIndex: 1000,
  },
  warningText: {
    color: "#856404",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 5
  },
  retryLinkText: {
    color: "#2E86DE",
    fontSize: 14,
    fontWeight: "bold"
  },
  startingTripOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999
  },
  startingTripText: {
    color: "#FFF",
    fontSize: 16,
    marginTop: 10,
    fontWeight: "bold"
  }
});