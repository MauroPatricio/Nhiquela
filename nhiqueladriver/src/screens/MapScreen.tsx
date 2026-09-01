import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Alert, ActivityIndicator, Text, TouchableOpacity, Modal, Linking, Image } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import TripMap from "../components/TripMap";
import TripControls from "../components/TripControls";
import { getCurrentLocation, updateDeliverymanLocation } from "../services/driverLocationService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from 'expo-location';
import { startOrderInTransit, confirmOrderDelivered, cancelNoShowOrder, finalizeOrder } from "../services/orderService"; 
import { io } from 'socket.io-client';
import { showMessage } from "react-native-flash-message";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { API_BASE_URL } from '../api/apiConfig';
import websocketService from "../services/websocketService";

// 🔥 LOCALIZAÇÃO FALLBACK (caso não consiga obter a real)
const FALLBACK_LOCATION = {
  latitude: -25.8195323,
  longitude: 32.5109306
};

const getImageUrl = (path?: string) => {
  if (!path) return null;
  const normalizedPath = path.replace(/\\/g, '/');
  if (normalizedPath.startsWith('http') || normalizedPath.startsWith('data:image')) return normalizedPath;
  const baseUrl = API_BASE_URL.replace('/api', '');
  return normalizedPath.startsWith('/') ? `${baseUrl}${normalizedPath}` : `${baseUrl}/${normalizedPath}`;
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
  const [showInfoCard, setShowInfoCard] = useState(true);
  const [showTripStartedModal, setShowTripStartedModal] = useState(false);
  const [showNoLocationModal, setShowNoLocationModal] = useState(false);
  const [showFinishConfirmationModal, setShowFinishConfirmationModal] = useState(false);
  const [showFinishSuccessModal, setShowFinishSuccessModal] = useState(false);
  const [showCannotFinishModal, setShowCannotFinishModal] = useState(false);

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
        const backendUrl = API_BASE_URL.replace('/api', '');
        socket = io(backendUrl);
  
        await updateDeliverymanLocation(orderId);
  
        // Atualiza a localização a cada 10 segundos via socket (otimizado)
        interval = setInterval(async () => {
          try {
            let loc = null;
            try {
              loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            } catch (err) {
              // Fallback to last known position if current fails (e.g. emulator without GPS)
              loc = await Location.getLastKnownPositionAsync();
            }

            if (loc) {
              const locationData = {
                driverId: storedTrip?.deliveryman?.id,
                orderId,
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                heading: loc.coords.heading,
                speed: loc.coords.speed
              };
              // Emite a localização em tempo real para o backend processar e transmitir ao cliente
              socket.emit('update_location', locationData);
            }
          } catch (err) {
            console.log("Erro ao capturar GPS para socket", err);
          }
        }, 10000);
        
        socket.on('order_updated', async (data) => {
          if (data && (data._id === orderId || data.id === orderId)) {
            const status = data.status || "";
            if (status === 'Entregue' || status === 'Finalizado' || status === 'Concluído' || status === 'Cancelado' || status === 'Motorista indisponível' || data.isCanceled || data.deleted) {
              await AsyncStorage.removeItem("acceptedTrip");
              navigation.navigate('Home');
            }
          }
        });

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
  
  useFocusEffect(
    useCallback(() => {
      const loadTripData = async () => {
        try {
          setLoading(true);

        // 🔥 Acelerar carregamento usando a última localização conhecida (Instantâneo)
        try {
          const lastLocation = await Location.getLastKnownPositionAsync();
          if (lastLocation) {
            setCurrentLocation({
              latitude: lastLocation.coords.latitude,
              longitude: lastLocation.coords.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
              accuracy: lastLocation.coords.accuracy,
            });
            setLocationError(null);
          } else {
            setCurrentLocation(FALLBACK_LOCATION);
          }
        } catch (err) {
          setCurrentLocation(FALLBACK_LOCATION);
        }

        // 🔥 Disparar a busca de alta precisão em background sem bloquear o render
        getCurrentLocation().then(location => {
          setCurrentLocation(location);
          setLocationError(null);
        }).catch(err => {
          console.warn("Falha no GPS de alta precisão em background", err.message);
        });

        let storedTripString = await AsyncStorage.getItem("acceptedTrip");
        let storedTrip = null;

        if (route.params?.tripData) {
          storedTrip = route.params.tripData;
          // Garantir que persistimos a viagem atual
          await AsyncStorage.setItem("acceptedTrip", JSON.stringify(storedTrip));
        } else if (storedTripString) {
          storedTrip = JSON.parse(storedTripString);
        }
  
        if (!storedTrip) {
          setLoading(false);
          return;
        }
  
        // 🔥 Guardar dados no estado
        setTripData(storedTrip);
  
        // 🔥 Definir destino baseado no stepStatus
        if (storedTrip) {  
          if (storedTrip.stepStatus === 4) {
            // STEP 4 → destino = local do VENDEDOR/COLETA (originLocation ou seller)
            const vendorLat = Number(storedTrip.originLat || storedTrip.originalData?.originLocation?.latitude || storedTrip.originalData?.seller?.location?.lat || storedTrip.originalData?.seller?.latitude || storedTrip.originalData?.originDetails?.lat || storedTrip.originalData?.latitude);
            const vendorLng = Number(storedTrip.originLng || storedTrip.originalData?.originLocation?.longitude || storedTrip.originalData?.seller?.location?.lng || storedTrip.originalData?.seller?.longitude || storedTrip.originalData?.originDetails?.lng || storedTrip.originalData?.longitude);
  
            if (vendorLat && vendorLng) {
              const vendorLocation = {
                latitude: vendorLat,
                longitude: vendorLng,
                title: storedTrip.pickup || "Local de Coleta",
              };
              setDestination(vendorLocation);
            } else {
              setShowNoLocationModal(true);
            }
  
          } else if (storedTrip.stepStatus === 5) {
            // STEP 5 → destino = local do CLIENTE (destinationLocation ou deliveryAddress)
            const clientLat = Number(storedTrip.originalData?.destinationDetails?.lat || storedTrip.originalData?.destinationLocation?.latitude || storedTrip.originalData?.deliveryAddress?.latitude || storedTrip.originalData?.latitude);
            const clientLng = Number(storedTrip.originalData?.destinationDetails?.lng || storedTrip.originalData?.destinationLocation?.longitude || storedTrip.originalData?.deliveryAddress?.longitude || storedTrip.originalData?.longitude);
  
            if (clientLat && clientLng) {
              const clientLocation = {
                latitude: clientLat,
                longitude: clientLng,
                title: storedTrip.destination || storedTrip.originalData?.deliveryAddress?.address || "Destino do Cliente",
              };
              setDestination(clientLocation);
            } else {
              setShowNoLocationModal(true);
            }
  
          } else {
            // STEP PENDENTE / ACEITE MAS NÃO INICIADO 👉 destino = local da COLETA (VENDEDOR/CLIENTE ORIGEM)
            // Permite ao motorista ver a distância e rota até à coleta ANTES de aceitar/iniciar.
            const pickupLat = Number(storedTrip.originLat || storedTrip.originalData?.originLocation?.latitude || storedTrip.originalData?.seller?.location?.lat || storedTrip.originalData?.seller?.latitude || storedTrip.originalData?.originDetails?.lat || storedTrip.originalData?.latitude);
            const pickupLng = Number(storedTrip.originLng || storedTrip.originalData?.originLocation?.longitude || storedTrip.originalData?.seller?.location?.lng || storedTrip.originalData?.seller?.longitude || storedTrip.originalData?.originDetails?.lng || storedTrip.originalData?.longitude);
            
            if (pickupLat && pickupLng) {
              const pickupLocation = {
                latitude: pickupLat,
                longitude: pickupLng,
                title: storedTrip.pickup || "Local da Coleta",
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
  }, [route.params])
  );

  // 🔥 LISTENER PARA ATUALIZAÇÕES DO BACKEND (CANCELAMENTO / ENTREGUE)
  useEffect(() => {
    const handleOrderCancelled = async (data: any) => {
      await AsyncStorage.removeItem("acceptedTrip");
      setTripData(null);
      setShowNoLocationModal(false);
      Alert.alert("Viagem Cancelada", "O cliente cancelou esta viagem.");
      navigation.navigate('Home');
    };

    const handleOrderUpdated = async (data: any) => {
      // O backend pode enviar os dados diretamente ou dentro de { order: data }
      const order = data?.order || data;
      
      if (order) {
        const orderId = order._id || order.id;
        const currentTripId = tripData?.id;
        
        if (!currentTripId || orderId === currentTripId || String(orderId) === String(currentTripId)) {
          const status = order.status || "";
          const isTerminalStatus = (
            status === 'Entregue' || 
            status === 'Finalizado' || 
            status === 'Concluído' || 
            status === 'Concluido' || 
            status === 'Cancelado' || 
            status === 'Recusado' ||
            status === 'Motorista indisponível' || 
            order.isCanceled || 
            order.deleted ||
            order.stepStatus >= 7
          );

          if (isTerminalStatus) {
            await AsyncStorage.removeItem("acceptedTrip");
            setTripData(null);
            setShowNoLocationModal(false);
            
            if (status === 'Cancelado' || order.isCanceled) {
               Alert.alert("Viagem Cancelada", "Esta viagem foi cancelada pelo cliente.");
            }
            
            navigation.navigate('Home');
          }
        }
      }
    };

    websocketService.on('order_cancelled', handleOrderCancelled);
    websocketService.on('order_updated', handleOrderUpdated);
    websocketService.on('service_released', handleOrderCancelled);

    return () => {
      websocketService.off('order_cancelled');
      websocketService.off('order_updated');
      websocketService.off('service_released');
    };
  }, [tripData, navigation]);

  // 🔥 POLLING DE VERIFICAÇÃO EM TEMPO REAL DO ESTADO DA VIAGEM
  useEffect(() => {
    let pollingInterval: any = null;

    const checkLiveTripStatus = async () => {
      try {
        const storedTripString = await AsyncStorage.getItem("acceptedTrip");
        if (!storedTripString) return;

        const storedTrip = JSON.parse(storedTripString);
        if (!storedTrip?.id) return;

        const token = await AsyncStorage.getItem("authToken");
        const baseUrl = API_BASE_URL;

        let res = await fetch(`${baseUrl}/request-services/${storedTrip.id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (!res.ok) {
          res = await fetch(`${baseUrl}/orders/${storedTrip.id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
        }

        if (res.ok) {
          const liveOrder = await res.json();
          const orderData = liveOrder.order || liveOrder;
          const status = orderData.status || "";

          const isCancelled = (
            status === 'Cancelado' ||
            status === 'Recusado' ||
            status === 'Finalizado' ||
            status === 'Entregue' ||
            status === 'Concluído' ||
            status === 'Concluido' ||
            status === 'Motorista indisponível' ||
            orderData.isCanceled ||
            orderData.deleted ||
            orderData.stepStatus >= 7
          );

          if (isCancelled) {
            await AsyncStorage.removeItem("acceptedTrip");
            setTripData(null);
            setShowNoLocationModal(false);
            if (status === 'Cancelado' || orderData.isCanceled) {
              Alert.alert("Viagem Cancelada", "Esta viagem foi cancelada pelo cliente.");
            }
            navigation.navigate('Home');
          }
        } else if (res.status === 404) {
          await AsyncStorage.removeItem("acceptedTrip");
          setTripData(null);
          setShowNoLocationModal(false);
          navigation.navigate('Home');
        }
      } catch (err) {
        console.log("Erro no polling de verificação da viagem:", err);
      }
    };

    checkLiveTripStatus();
    pollingInterval = setInterval(checkLiveTripStatus, 3500);

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [navigation]);
  
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
      const isRequestService = trip.originalData?.goodType !== undefined;
      await startOrderInTransit(trip.id, isRequestService);

      // Atualizar destino para o cliente (agora stepStatus = 5)
      const clientLat = Number(trip.originalData?.destinationDetails?.lat || trip.originalData?.destinationLocation?.latitude || trip.originalData?.deliveryAddress?.latitude || trip.originalData?.latitude);
      const clientLng = Number(trip.originalData?.destinationDetails?.lng || trip.originalData?.destinationLocation?.longitude || trip.originalData?.deliveryAddress?.longitude || trip.originalData?.longitude);

      if (clientLat && clientLng) {
        const clientLocation = {
          latitude: clientLat,
          longitude: clientLng,
          title: trip.originalData?.deliveryAddress?.address || "Destino do Cliente",
        };
        setDestination(clientLocation);
      }

      setShowTripStartedModal(true);

    } catch (error: any) {
      console.error("Erro ao iniciar viagem:", error.message);
      
      // Reverter mudança visual em caso de erro
      const revertedTrip = {
        ...trip,
        status: 'Pedido aceite',
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
        "âŒ Cancelamento não permitido",
        "Não é possível cancelar a viagem após a rota estar desenhada. Complete a entrega do produto.",
        [{ text: "OK" }]
      );
    } else {
      Alert.alert("Viagem cancelada", "Você cancelou a viagem.");
      AsyncStorage.removeItem("acceptedTrip");
      navigation.navigate('Home');
    }
  };

  const handleNoShow = () => {
    Alert.alert(
      "Confirmar Cancelamento",
      "Tem certeza de que o cliente não compareceu? A viagem será cancelada.",
      [
        { text: "Não", style: "cancel" },
        { 
          text: "Sim", 
          style: "destructive",
          onPress: async () => {
            try {
              const tripId = tripData?.id || tripData?._id;
              if (tripId) {
                const isRequestService = tripData?.originalData?.goodType !== undefined || tripData?.originalData?.type === 'requestService';
                await cancelNoShowOrder(tripId, isRequestService);
              }
              await AsyncStorage.removeItem("acceptedTrip");
              setTripData(null);
              Alert.alert("Sucesso", "Viagem cancelada por não comparecimento.");
              navigation.navigate('Home');
            } catch (error) {
              console.error("Erro ao cancelar:", error);
              Alert.alert("Erro", "Não foi possível cancelar a viagem.");
            }
          }
        }
      ]
    );
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth radius in metres
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleFinishTrip = () => {
    if (currentLocation && destination) {
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        destination.latitude,
        destination.longitude
      );
      
      // Se a distância for maior que 200 metros, não permite finalizar
      if (distance > 200) {
        setShowCannotFinishModal(true);
        return;
      }
    } else if (!canFinishTrip) {
      setShowCannotFinishModal(true);
      return;
    }
    
    setShowFinishConfirmationModal(true);
  };

  const proceedFinishTrip = async () => {
    try {
      setShowFinishConfirmationModal(false);
      
      // 🔥 AVISAR O BACKEND QUE O MOTORISTA CHEGOU AO DESTINO
      if (tripData?.id) {
        const isRequestService = tripData?.originalData?.goodType !== undefined || tripData?.originalData?.type === 'requestService';
        await confirmOrderDelivered(tripData.id, isRequestService, currentLocation?.latitude, currentLocation?.longitude);
      }
      
      // Update local state to waiting
      const updatedTrip = { ...tripData, status: 'No destino indicado', stepStatus: 6 };
      setTripData(updatedTrip);
      await AsyncStorage.setItem("acceptedTrip", JSON.stringify(updatedTrip));
      
      // Start waiting timer (optional)
      // We will show UI based on stepStatus === 6 in TripMap
    } catch (error) {
      console.warn("Erro ao confirmar chegada:", error);
    }
  };

  const completeService = async () => {
    if (currentLocation && destination) {
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        destination.latitude,
        destination.longitude
      );
      
      if (distance > 200) {
        setShowCannotFinishModal(true);
        return;
      }
    } else if (!canFinishTrip) {
      setShowCannotFinishModal(true);
      return;
    }

    Alert.alert(
      "Concluir Serviço",
      "Tem a certeza que deseja confirmar a entrega e concluir este serviço?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Confirmar", 
          onPress: async () => {
            try {
              const tripId = tripData?.id || tripData?._id;
              if (tripId) {
                const isRequestService = tripData?.originalData?.goodType !== undefined || tripData?.originalData?.type === 'requestService';
                await finalizeOrder(tripId, isRequestService);
                // Atualiza o estado local para parar o cronómetro no TripMap (que apenas conta em 4, 5, ou 6)
                setTripData(prev => prev ? { ...prev, stepStatus: 7 } : null);

                // 🔴 COLOCAR O MOTORISTA OFFLINE APÓS CONCLUIR A VIAGEM
                try {
                  const token = await AsyncStorage.getItem('authToken');
                  if (token) {
                    fetch(`${API_BASE_URL}/drivers/availability`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({ availability: 'paused' })
                    }).catch(err => console.log('Erro ao alterar disponibilidade para offline:', err));
                  }

                  const userStr = await AsyncStorage.getItem('@app:user');
                  if (userStr) {
                    const u = JSON.parse(userStr);
                    u.availability = 'paused';
                    u.isOnline = false;
                    await AsyncStorage.setItem('@app:user', JSON.stringify(u));
                  }
                } catch (e) {
                  console.log('Erro ao atualizar disponibilidade local:', e);
                }
              }
              await AsyncStorage.removeItem("acceptedTrip");
              setShowFinishSuccessModal(true);
            } catch(err) {
              console.warn(err);
              Alert.alert("Erro", "Falha ao tentar finalizar a viagem.");
            }
          }
        }
      ]
    );
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
          onPress={() => navigation.navigate('Home')}
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
        shouldDrawRoute={tripData?.stepStatus === 4 || tripData?.stepStatus === 5 || tripData?.stepStatus === 6}
        tripData={tripData}
        onStartTrip={startTrip}
        onCancelTrip={handleCancelTrip}
        onFinishTrip={handleFinishTrip}
        onCompleteService={completeService}
        onNoShow={handleNoShow}
        canFinishTrip={canFinishTrip}
        routeDrawn={routeDrawn}
      />

      {/* 🔥 INFO CARD DO PEDIDO (FLUTUANTE NO TOPO) */}
      {tripData && (
        <View style={showInfoCard ? [styles.floatingInfoCard, { paddingBottom: 10 }] : styles.hiddenInfoCardButton}>
          <TouchableOpacity 
            onPress={() => setShowInfoCard(!showInfoCard)}
            style={showInfoCard ? { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: 4 } : {}}
          >
            <Ionicons name={showInfoCard ? "eye-off" : "eye"} size={26} color="#64748B" />
          </TouchableOpacity>
          
          {showInfoCard && (
            <>
              <View style={styles.infoRow}>
                {(tripData.passengerImage || tripData.originalData?.user?.profileImage || tripData.originalData?.user?.photo) ? (
                  <Image source={{ uri: getImageUrl(tripData.passengerImage || tripData.originalData?.user?.profileImage || tripData.originalData?.user?.photo) || '' }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                ) : (
                  <Ionicons name="person-circle" size={44} color="#3B82F6" />
                )}
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B' }}>{tripData.passengerName || tripData.passenger || tripData.originalData?.user?.name || tripData.originalData?.name || 'Cliente'}</Text>
                  {/* <Text style={{ fontSize: 14, color: '#64748B' }}>{tripData.passengerPhone || 'Telefone não disponível'}</Text> */}
                  {tripData.serviceMotive && (
                    <Text style={{ fontSize: 13, color: '#3B82F6', marginTop: 2, fontWeight: '500' }}>
                      Motivo: {tripData.serviceMotive}
                    </Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  
                  {tripData.passengerPhone && tripData.passengerPhone !== "Não disponível" && (
                    <TouchableOpacity 
                      style={styles.callButton}
                      onPress={() => {
                        if (tripData.passengerPhone) Linking.openURL(`tel:${tripData.passengerPhone}`);
                      }}
                    >
                      <Ionicons name="call" size={18} color="#FFF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              <View style={{ height: 1, backgroundColor: '#E2E8F0', marginVertical: 12 }} />
              
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Ionicons name="location" size={16} color="#3B82F6" style={{ marginTop: 2, marginRight: 8 }} />
                  <Text style={{ fontSize: 13, color: '#475569', flex: 1 }}>
                    <Text style={{ fontWeight: '600' }}>Recolha: </Text>
                    {tripData.pickup || tripData.originalData?.originDetails?.address || tripData.originalData?.origin || 'Não especificada'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Ionicons name="flag" size={16} color="#10B981" style={{ marginTop: 2, marginRight: 8 }} />
                  <Text style={{ fontSize: 13, color: '#475569', flex: 1 }}>
                    <Text style={{ fontWeight: '600' }}>Destino: </Text>
                    {tripData.destination || 'Não especificado'}
                  </Text>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: '#E2E8F0', marginVertical: 12 }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="card" size={16} color="#64748B" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 13, color: '#475569', fontWeight: '500' }}>{tripData.paymentMethod || 'Dinheiro'}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="cube" size={16} color="#64748B" style={{ marginRight: 6, marginLeft: 12 }} />
                  <Text style={{ fontSize: 13, color: '#475569', fontWeight: '500' }}>{tripData.serviceMotive || tripData.serviceName || tripData.goodType || tripData.service?.name || 'Serviço Padrão'}</Text>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: '#E2E8F0', marginVertical: 12 }} />
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, color: '#1E293B', fontWeight: '700' }}>Preço Total:</Text>
                <Text style={{ fontSize: 18, color: '#059669', fontWeight: '800' }}>{tripData.reward ? tripData.reward.replace('MZN ', '') : '0'} MT</Text>
              </View>
            </>
          )}
        </View>
      )}

      {/* 🔥 CONTROLES DA VIAGEM (CANCELAR / FINALIZAR) NO MAPA */}
      {(tripData?.stepStatus === 5) && (
          <TripControls
            onCancelTrip={handleCancelTrip}
            onFinishTrip={handleFinishTrip}
            canFinishTrip={canFinishTrip}
            routeDrawn={routeDrawn}
            isWaitingClient={false}
          />
        )}
      
      {(tripData?.stepStatus === 6) && (
        <TripControls
          onCancelTrip={handleCancelTrip}
          onFinishTrip={completeService}
          canFinishTrip={canFinishTrip}
          routeDrawn={routeDrawn}
          isWaitingClient={true}
        />
      )}

      {/* 🔥 MODAL PREMIUM — VIAGEM INICIADA COM SUCESSO */}
      <Modal
        visible={showTripStartedModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalContainer}>
            <View style={styles.premiumIconContainer}>
              <Ionicons name="compass-outline" size={44} color="#059669" />
            </View>
            
            <Text style={styles.premiumModalTitle}>Viagem Iniciada! 🚀</Text>
            
            <Text style={styles.premiumModalMessage}>
              A rota para a entrega foi traçada com sucesso. Conduza com cuidado e respeite as regras de trânsito.
            </Text>

            <TouchableOpacity 
              style={styles.premiumConfirmButton}
              activeOpacity={0.85}
              onPress={() => setShowTripStartedModal(false)}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.premiumConfirmGradient}
              >
                <Text style={styles.premiumConfirmButtonText}>Entendido</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 🚫 MODAL PREMIUM — LOCALIZAÇÃO INDISPONÍVEL */}
      <Modal
        visible={showNoLocationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNoLocationModal(false)}
      >
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumWarningModalContainer}>
            <View style={styles.premiumWarningIconContainer}>
              <Ionicons name="location-off-outline" size={44} color="#D97706" />
            </View>
            
            <Text style={styles.premiumWarningModalTitle}>Localização Indisponível</Text>
            
            <Text style={styles.premiumWarningModalMessage}>
              Infelizmente, não foi possível obter as coordenadas geográficas para o local de entrega.{'\n\n'}Por favor, contacte o cliente diretamente para combinar a rota ou obter direções.
            </Text>

            <TouchableOpacity 
              style={styles.premiumWarningConfirmButton}
              activeOpacity={0.85}
              onPress={async () => {
                setShowNoLocationModal(false);
                const storedTripString = await AsyncStorage.getItem("acceptedTrip");
                if (!storedTripString || !tripData) {
                  navigation.navigate('Home');
                }
              }}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.premiumConfirmGradient}
              >
                <Text style={styles.premiumConfirmButtonText}>Entendido</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 🚩 MODAL PREMIUM — CONFIRMAR ENTREGA */}
      <Modal
        visible={showFinishConfirmationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFinishConfirmationModal(false)}
      >
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalContainer}>
            <View style={[styles.premiumIconContainer, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="flag-outline" size={42} color="#EF4444" />
            </View>
            
            <Text style={[styles.premiumModalTitle, { color: '#991B1B' }]}>Confirmar Entrega?</Text>
            
            <Text style={styles.premiumModalMessage}>
              Confirme que entregou a mercadoria ao cliente com sucesso para concluir esta viagem e atualizar o seu saldo.
            </Text>

            <View style={[styles.premiumModalButtons, { flexDirection: 'column' }]}>
              <TouchableOpacity 
                style={[styles.premiumConfirmButton, { width: '100%', marginBottom: 12 }]}
                activeOpacity={0.85}
                onPress={proceedFinishTrip}
              >
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.premiumConfirmGradient}
                >
                  <Text style={styles.premiumConfirmButtonText}>Confirmar</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.premiumCancelButton, { width: '100%' }]}
                activeOpacity={0.8}
                onPress={() => setShowFinishConfirmationModal(false)}
              >
                <Text style={styles.premiumCancelButtonText}>Voltar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ⚠️ MODAL PREMIUM — NÃO PODE FINALIZAR */}
      <Modal
        visible={showCannotFinishModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalContainer}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              <Ionicons name="location-outline" size={44} color="#EF4444" />
            </View>
            
            <Text style={styles.premiumModalTitle}>Viagem não pode ser finalizada</Text>
            
            <Text style={styles.premiumModalMessage}>
              Para terminar a viagem deve estar no local de destino.
            </Text>

            <TouchableOpacity 
              style={{
                width: '100%',
                borderRadius: 16,
                overflow: 'hidden',
              }}
              activeOpacity={0.85}
              onPress={() => setShowCannotFinishModal(false)}
            >
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.premiumConfirmGradient}
              >
                <Text style={styles.premiumConfirmButtonText}>Entendido</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 🎉 MODAL PREMIUM — ENTREGA CONCLUÍDA COM SUCESSO */}
      <Modal
        visible={showFinishSuccessModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalContainer}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              <Ionicons name="wallet-outline" size={44} color="#059669" />
            </View>
            
            <Text style={styles.premiumModalTitle}>Valor em Processamento! 🎉</Text>
            
            <Text style={styles.premiumModalMessage}>
              Completou a sua viagem com sucesso. Assim que o pagamento for confirmado, o saldo ficará disponível para si.
            </Text>
            
            <View style={{ backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8, marginBottom: 20 }}>
              <Text style={{ fontSize: 13, color: '#4B5563', textAlign: 'center', fontStyle: 'italic' }}>
                A sua carteira digital reflete o valor imediatamente para garantir a máxima transparência dos seus ganhos, ficando o saldo disponível para uso ou levantamento logo após a confirmação final.
              </Text>
            </View>

            <TouchableOpacity 
              style={{
                width: '100%',
                borderRadius: 16,
                overflow: 'hidden',
              }}
              activeOpacity={0.85}
              onPress={() => {
                setShowFinishSuccessModal(false);
                setTripData(null);
                navigation.navigate("Home");
              }}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.premiumConfirmGradient}
              >
                <Text style={styles.premiumConfirmButtonText}>Voltar ao Início</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* 🔥 MODAL BLOQUEADOR QUANDO MOTORISTA CHEGA AO DESTINO */}
      <Modal
        visible={tripData?.stepStatus === 6}
        transparent={true}
        animationType="slide"
      >
        <View style={{ flex: 1, backgroundColor: '#7F00FF', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
           <Ionicons name="location" size={80} color="#FFF" style={{ marginBottom: 24 }} />
           <Text style={{ color: '#FFF', fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 }}>
             Você chegou ao destino!
           </Text>
           <Text style={{ color: '#FFF', fontSize: 18, textAlign: 'center', lineHeight: 28, opacity: 0.9 }}>
             Aguarde a confirmação da recepção do cliente para se libertar deste pedido e receber mais pedidos.
           </Text>
           <ActivityIndicator size="large" color="#FFF" style={{ marginTop: 40 }} />
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  floatingInfoCard: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 6,
    zIndex: 99,
  },
  hiddenInfoCardButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 12,
    zIndex: 99,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callButton: {
    backgroundColor: '#10B981',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
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
  },
  premiumModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  premiumModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 14,
  },
  premiumIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  premiumModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 12,
    textAlign: 'center',
  },
  premiumModalMessage: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  premiumConfirmButton: {
    width: '100%',
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
  },
  premiumWarningModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 14,
  },
  premiumWarningIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  premiumWarningModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 12,
    textAlign: 'center',
  },
  premiumWarningModalMessage: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  premiumWarningConfirmButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  premiumModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  premiumCancelButton: {
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
  }
});