import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  ActivityIndicator,
  Modal,
  Switch,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "../styles/colors";
import {
  acceptOrderByDeliveryman,
  getAllOrdersForDeliveryman,
  startOrderInTransit,
  cancelOrderByDeliveryman,
  updateDeliverymanLocation
} from "../services/orderService";
import websocketService from "../services/websocketService";
import * as Location from "expo-location";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../api/apiConfig";
import { showMessage } from "react-native-flash-message";

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

type Trip = {
  id: string;
  passenger: string;
  pickup: string;
  destination: string;
  reward: string;
  distance: string;
  time: string;
  destinationLocation: {
    latitude: number;
    longitude: number;
  };
  stepStatus: number;
  status: string;
  isAcceptedByDeliveryman: boolean;
  originalData: any;
  isProcessing?: boolean;
};

// 🔥 TIPOS PARA WEBSOCKET
type WebSocketOrderData = {
  order: any;
  action: string;
  timestamp: string;
  deliverymanId?: string;
};

type WebSocketError = {
  message: string;
  code?: string;
};

type LocationData = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp: number;
};

export default function HomeScreen({ navigation }: any) {
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [acceptedTrip, setAcceptedTrip] = useState<Trip | null>(null);
  const [routeSummary, setRouteSummary] = useState<Trip | null>(null);
  const [blinkAnim] = useState(new Animated.Value(0));
  const [isTripStarted, setIsTripStarted] = useState(false);
  const [isDriverApproved, setIsDriverApproved] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [acceptingTripId, setAcceptingTripId] = useState<string | null>(null);
  const [startingTripId, setStartingTripId] = useState<string | null>(null);
  const [cancelingTripId, setCancelingTripId] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Conectando...");
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  
  const [isToggling, setIsToggling] = useState(false);
  const { user, updateUser, updateDeliveryman } = useAuth();

  const isMounted = useRef(true);

  // 🔥 OBTER E COMPARTILHAR LOCALIZAÇÃO EM TEMPO REAL
  const startLocationSharing = async () => {
    try {
      
      // Solicitar permissões
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão Negada', 'Permissão de localização é necessária para compartilhar sua localização em tempo real.');
        return;
      }

      // Configurar precisão para melhor performance
      await Location.enableNetworkProviderAsync();

      // Obter localização atual
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? undefined,
        speed: location.coords.speed || 0,
        heading: location.coords.heading || 0,
        timestamp: Date.now(),
      };

      setCurrentLocation(locationData);
      setIsSharingLocation(true);

      // 🔥 COMPARTILHAR LOCALIZAÇÃO VIA WEBSOCKET
      if (websocketService && isConnected && acceptedTrip) {
        websocketService.emit('deliveryman_location_update', {
          deliverymanId: user?._id,
          orderId: acceptedTrip.id,
          location: locationData,
          timestamp: new Date().toISOString()
        });
      }

      // Iniciar watch de localização
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 10, // Atualizar a cada 10 metros
          timeInterval: 5000,   // Atualizar a cada 5 segundos
        },
        (newLocation) => {
          if (isMounted.current && isSharingLocation) {
            const updatedLocation: LocationData = {
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
              accuracy: newLocation.coords.accuracy ?? undefined,
              speed: newLocation.coords.speed || 0,
              heading: newLocation.coords.heading || 0,
              timestamp: Date.now(),
            };

            setCurrentLocation(updatedLocation);

            // 🔥 COMPARTILHAR ATUALIZAÇÃO DE LOCALIZAÇÃO EM TEMPO REAL
            if (websocketService && isConnected && acceptedTrip) {
              websocketService.emit('deliveryman_location_update', {
                deliverymanId: user?._id,
                orderId: acceptedTrip.id,
                location: updatedLocation,
                timestamp: new Date().toISOString()
              });
            }
          }
        }
      );

      setLocationSubscription(subscription);

    } catch (error: any) {
      console.error("❌ Erro ao iniciar compartilhamento de localização:", error.message);
      Alert.alert("Erro", "Não foi possível iniciar o compartilhamento de localização.");
    }
  };

  // 🔥 PARAR COMPARTILHAMENTO DE LOCALIZAÇÃO
  const stopLocationSharing = async () => {
    try {
      if (locationSubscription) {
        locationSubscription.remove();
        setLocationSubscription(null);
      }
      setIsSharingLocation(false);
    } catch (error: any) {
      console.error("Erro ao parar compartilhamento de localização:", error.message);
    }
  };

  // 🔥 VERIFICAR APROVAÇÃO DO MOTORISTA
  const checkDriverApproval = async () => {
    try {
      // Verifica os dois campos: status (novo) e register_conformance (legado)
      const driverStatus = user?.status;
      const conformance = user?.deliveryman?.register_conformance;

      const isApproved =
        driverStatus === 'Disponível' ||
        driverStatus === 'Em Entrega' ||
        conformance === 'CONFORMANCE';

      const isPending =
        !driverStatus ||
        driverStatus === 'Pendente' ||
        conformance === 'PENDING_CONFORMANCE';

      setIsDriverApproved(isApproved);

      if (isApproved) {
        await loadAllOrders();
        await setupWebSocket();
      } else {
        // Pendente ou rejeitado — mostra modal de análise e conecta socket
        // para receber notificação em tempo real quando o admin aprovar
        setShowApprovalModal(true);
        await setupWebSocket(); // Mantém socket ativo para receber eventos do admin
      }
    } catch (error: any) {
      console.error('❌ Erro ao verificar status do motorista:', error.message);
      setIsDriverApproved(false);
      setShowApprovalModal(true);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 CONFIGURAR WEBSOCKET PARA TEMPO REAL
  const setupWebSocket = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        setConnectionStatus("Conectando...");

        websocketService.connect(token);

        // 🔥 LISTENER PARA ATUALIZAÇÕES DE PEDIDOS
        websocketService.on('order_updated', (data: WebSocketOrderData) => {
          if (isMounted.current) {
            loadAllOrdersSilent();
          }
        });

        // 🔥 LISTENER PARA PEDIDOS ATRIBUÍDOS
        websocketService.on('order_assigned', (data: WebSocketOrderData) => {
          if (isMounted.current) {
            loadAllOrdersSilent();
          }
        });

        // 🔥 LISTENER PARA NOVOS PEDIDOS
        websocketService.on('new_order', (data: WebSocketOrderData) => {
          if (isMounted.current) {
            loadAllOrdersSilent();
          }
        });

        // 🔥 LISTENER PARA REQUISIÇÕES DE LOCALIZAÇÃO
        websocketService.on('request_location_update', (data: any) => {
          if (isMounted.current && acceptedTrip) {
            if (isSharingLocation) {
              startLocationSharing();
            }
          }
        });

        // 🔔 LISTENER EM TEMPO REAL — Admin aprova/rejeita conta do motorista
        websocketService.on('driver_status_updated', (data: any) => {
          if (!isMounted.current) return;
          console.log('🔔 Estado atualizado pelo admin:', data);

          const nowApproved = data.status === 'Disponível' || data.status === 'Em Entrega';

          if (nowApproved) {
            // ✅ Conta aprovada: fecha o modal e carrega as ordens
            setIsDriverApproved(true);
            setShowApprovalModal(false);
            Alert.alert(
              '✅ Conta Aprovada!',
              'A sua conta foi aprovada. Já pode receber pedidos de entrega!',
              [{ text: 'Começar!', style: 'default' }]
            );
            loadAllOrders();
          } else if (data.status === 'Inativo') {
            // ❌ Conta suspensa
            setIsDriverApproved(false);
            setShowApprovalModal(true);
            Alert.alert(
              '❌ Conta Suspensa',
              'A sua conta foi suspensa. Contacte o suporte para mais informações.',
              [{ text: 'OK' }]
            );
          } else {
            // ⏳ De volta a Pendente
            setIsDriverApproved(false);
            setShowApprovalModal(true);
          }
        });

        // 🔥 STATUS DA CONEXÃO
        websocketService.on('connect', () => {
          setIsConnected(true);
          setConnectionStatus("Conectado");

          // 🔥 CARREGAR VIAGENS NOVAMENTE AO CONECTAR
          loadAllOrdersSilent();
        });

        // 🔥 STATUS DA DESCONEXÃO
        websocketService.on('disconnect', () => {
          setIsConnected(false);
          setConnectionStatus("Desconectado");
        });

        // 🔥 ERRO DE CONEXÃO
        websocketService.on('error', (error: WebSocketError) => {
          console.error('❌ Erro WebSocket:', error.message);
          setConnectionStatus("Erro de conexão");
        });

        // 🔥 CONEXÃO INICIAL - TENTAR CARREGAR DADOS MESMO SE WEBSOCKET FALHAR
        setTimeout(() => {
          if (!isConnected && isMounted.current) {
            loadAllOrdersSilent();
          }
        }, 3000);

      } else {
        console.error('❌ Token não encontrado para WebSocket');
        setConnectionStatus("Erro - Token não encontrado");
      }
    } catch (error: any) {
      console.error('❌ Erro ao configurar WebSocket:', error.message);
      setConnectionStatus("Erro na conexão");
      loadAllOrdersSilent();
    }
  };

  useEffect(() => {
    isMounted.current = true;
    checkDriverApproval();
    resetIncorrectAcceptedTrips();

    return () => {
      isMounted.current = false;
      // Limpar listeners do WebSocket e localização
      websocketService.off('order_updated');
      websocketService.off('order_assigned');
      websocketService.off('new_order');
      websocketService.off('request_location_update');
      websocketService.off('connect');
      websocketService.off('disconnect');
      websocketService.off('error');
      websocketService.disconnect();
      stopLocationSharing();
    };
  }, []);

  // 🔥 ATUALIZAR STATUS DE DISPONIBILIDADE LOCALMENTE NA HOME
  const handleToggleOnline = async (value: boolean) => {
    try {
      setIsToggling(true);
      const newStatus = value ? 'active' : 'paused';
      
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/drivers/availability`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ availability: newStatus })
      });

      if (response.ok) {
        if (updateUser) {
          updateUser({ ...user, availability: newStatus });
        }
        
        showMessage({
          message: value ? "Conectado!" : "Modo Offline",
          description: value ? "Pronto para receber pedidos." : "Você não receberá pedidos.",
          type: value ? "success" : "info",
          icon: "auto",
          style: {
            paddingTop: 40,
            borderRadius: 16,
            margin: 10,
            backgroundColor: value ? COLORS.success : COLORS.gray,
          },
          titleStyle: {
            fontSize: 16,
            fontWeight: "bold",
            color: "#FFF"
          },
          textStyle: {
            fontSize: 14,
            color: "#FFF"
          },
          duration: 3500,
        });
        
        // Se ficou offline, limpa a lista de viagens disponíveis
        if (!value) {
           setAllTrips([]);
        } else {
           // Se ficou online, carrega imediatamente
           loadAllOrdersSilent();
        }
      } else {
        throw new Error("Falha ao atualizar");
      }
    } catch (error) {
      showMessage({
        message: "Erro",
        description: "Não foi possível alterar seu status de disponibilidade.",
        type: "danger",
        icon: "auto"
      });
    } finally {
      setIsToggling(false);
    }
  };

  useEffect(() => {
    // Manter tracking ativo para o modal
    const checkStatus = () => {
      if (user?.status === 'Pendente') {
        setShowApprovalModal(true);
      } else {
        setShowApprovalModal(false);
      }
    };
    checkStatus();
  }, [user?.status]);

  // 🔥 ATUALIZAR COMPARTILHAMENTO DE LOCALIZAÇÃO QUANDO A VIAGEM MUDAR
  useEffect(() => {
    if (acceptedTrip) {
      // Pare o anterior se existir
      if (locationSharingRef.current) {
        locationSharingRef.current();
      }
      locationSharingRef.current = startLocationSharingToBackend(acceptedTrip.id);
    } else {
      if (locationSharingRef.current) {
        locationSharingRef.current();
        locationSharingRef.current = null;
      }
    }

    return () => {
      if (locationSharingRef.current) {
        locationSharingRef.current();
        locationSharingRef.current = null;
      }
    };
  }, [acceptedTrip]);

  // 🔥 CARREGAMENTO SILENCIOSO (para WebSocket)
  const loadAllOrdersSilent = async () => {
    try {
      // 🔥 NÃO CARREGAR PEDIDOS SE ESTIVER OFFLINE
      if (user?.availability !== 'active') {
        setAllTrips([]);
        setLastUpdate(new Date());
        return;
      }

      const response = await getAllOrdersForDeliveryman();
      let ordersData = response?.trips || response?.orders || response || [];

      if (!Array.isArray(ordersData)) {
        ordersData = [];
      }

      // 🔥 TENTAR OBTER LOCALIZAÇÃO, MAS CONTINUAR MESMO SE FALHAR
      let currentPosition = { latitude: 0, longitude: 0 };
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          // timeout removed
        });
        currentPosition = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
      } catch (locationError) {
        console.warn('⚠️ Erro ao obter localização, continuando sem ela...');
      }

      const formattedOrders = ordersData.map((order: any) => formatOrder(order, currentPosition));

      // 🔥 ATUALIZAÇÃO DIRETA SEM LOADING
      setAllTrips(formattedOrders);
      setLastUpdate(new Date());

      // 🔥 CORREÇÃO CRÍTICA: BUSCAR PEDIDO ACEITO CORRETAMENTE
      const accepted = formattedOrders.find((order: Trip) => {
        // Pedido aceito pelo entregador atual
        const isAcceptedByCurrentUser = order.isAcceptedByDeliveryman;
        
        // Pedido em trânsito (status 5) - mesmo que não esteja "aceito" no sentido tradicional
        const isInTransit = order.stepStatus === 5;
        
        // 🔥 SE ESTÁ EM TRÂNSITO, CONSIDERAR COMO ACEITO MESMO QUE isAcceptedByDeliveryman SEJA FALSE
        return isAcceptedByCurrentUser || isInTransit;
      });
      
      setAcceptedTrip(accepted || null);

      if (accepted) {
        const tripStarted = accepted.stepStatus === 5;
        setIsTripStarted(tripStarted);

        if (tripStarted) {
          setRouteSummary(accepted);
          startBlinkAnimation();
          await AsyncStorage.setItem("acceptedTrip", JSON.stringify(accepted));
        } else {
          setRouteSummary(null);
        }
      } else {
        setRouteSummary(null);
        setIsTripStarted(false);
        await AsyncStorage.removeItem("acceptedTrip");
      }

    } catch (error: any) {
      console.error("❌ Erro na atualização silenciosa:", error.message);
    }
  };

  const loadAllOrders = async () => {
    try {
      // 🔥 NÃO CARREGAR PEDIDOS SE ESTIVER OFFLINE
      if (user?.availability !== 'active') {
        setAllTrips([]);
        setLastUpdate(new Date());
        setLoadingOrders(false);
        return;
      }

      setLoadingOrders(true);
  
      // 🔥 LIMPAR CACHE ANTES DE CARREGAR
      await clearAllCacheAndReset();
  
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("⚠️ Permissão de localização negada");
      }
  
      const response = await getAllOrdersForDeliveryman();
      let ordersData = response?.trips || response?.orders || response || [];
    
      if (!Array.isArray(ordersData)) {
        ordersData = [];
      }
  
      // Obter localização
      let currentPosition = { latitude: 0, longitude: 0 };
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          // timeout removed
        });
        currentPosition = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
      } catch (locationError) {
        console.warn('⚠️ Erro ao obter localização');
      }
  
      const formattedOrders = ordersData.map((order: any) => formatOrder(order, currentPosition));
  
      // 🔥 VERIFICAÇÃO CORRIGIDA DAS VIAGENS ACEITAS
      const acceptedTrips = formattedOrders.filter((order: Trip) => {
        const isAcceptedByCurrentUser = order.isAcceptedByDeliveryman;
        const isInTransit = order.stepStatus === 5;
        
        // 🔥 SE ESTÁ EM TRÂNSITO, CONSIDERAR COMO ACEITO
        return isAcceptedByCurrentUser || isInTransit;
      });
    
      setAllTrips(formattedOrders);
      setLastUpdate(new Date());
  
      // 🔥 BUSCAR VIAGEM ACEITA APENAS SE HOUVER UMA REAL
      const accepted = acceptedTrips.length > 0 ? acceptedTrips[0] : null;
      
      setAcceptedTrip(accepted || null);
  
      if (accepted) {
        const tripStarted = accepted.stepStatus === 5;
        setIsTripStarted(tripStarted);

        // 🔥 ATUALIZAR ROUTE SUMMARY APENAS SE ESTIVER EM TRÂNSITO
        if (tripStarted) {
          setRouteSummary(accepted);
          startBlinkAnimation();
        } else {
          setRouteSummary(null);
        }
  
        // 🔥 SALVAR NO ASYNCSTORAGE INDEPENDENTE DO STATUS
        await AsyncStorage.setItem("acceptedTrip", JSON.stringify(accepted));
  
      } else {
        setRouteSummary(null);
        setIsTripStarted(false);
        await AsyncStorage.removeItem("acceptedTrip");
      }
  
    } catch (error: any) {
      console.error("❌ Erro ao carregar pedidos:", error.message);
      Alert.alert("Erro", "Não foi possível carregar as viagens.");
    } finally {
      setLoadingOrders(false);
    }
  };

  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const deg2rad = (deg: number) => deg * (Math.PI / 180);
  
  const formatOrder = (order: any, currentPosition?: any): Trip => {
    const destinationLat = order.deliveryAddress?.latitude ||
      order.seller?.latitude ||
      order.sellerInfo?.latitude || 0;
  
    const destinationLon = order.deliveryAddress?.longitude ||
      order.seller?.longitude ||
      order.sellerInfo?.longitude || 0;
  
    let distance = 0;
    if (currentPosition && destinationLat && destinationLon &&
      currentPosition.latitude !== 0 && currentPosition.longitude !== 0) {
      distance = getDistanceFromLatLonInKm(
        currentPosition.latitude,
        currentPosition.longitude,
        destinationLat,
        destinationLon
      );
    }
  
    // 🔥 CORREÇÃO DEFINITIVA: Lógica EXATA para verificar aceitação
    const currentUserId = user?._id;
    const orderDeliverymanId = order.deliveryman?._id || order.deliveryman?.id || order.deliverymanId;
    
    // 🔥 LÓGICA CORRIGIDA: 
    // - Se stepStatus é 5 (em trânsito), considerar como "aceito" independente do deliveryman
    // - Caso contrário, verificar se foi aceito pelo entregador atual
    const isInTransit = order.stepStatus === 5;
    const isAcceptedByDeliveryman = isInTransit || (
      orderDeliverymanId === currentUserId &&
      order.status === 'Aceite pelo entregador' &&
      order.stepStatus === 4  
    );
  
    return {
      id: order._id,
      passenger: order.user?.name || order.clientName || "Cliente",
      pickup: order.seller?.name || order.seller?.address || "Local de origem",
      destination: order.deliveryAddress?.address || "Destino",
      reward: `MZN ${order.totalPrice || order.reward || Math.round(distance * 25)}`,
      distance: distance > 0 ? `${distance.toFixed(2)} km` : "Distância não disponível",
      time: distance > 0 ? `${Math.round(distance / 40 * 60)} min` : "Tempo não disponível",
      destinationLocation: {
        latitude: destinationLat,
        longitude: destinationLon,
      },
      stepStatus: order.stepStatus,
      status: order.status,
      isAcceptedByDeliveryman,
      originalData: order
    };
  };

  const startBlinkAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  };

// 🔥 AÇÃO COM FEEDBACK VISUAL INSTANTÂNEO E COMPARTILHAMENTO DE LOCALIZAÇÃO
const acceptTrip = async (tripId: string) => {
  try {
    setAcceptingTripId(tripId);

    // 🔥 BLOQUEAR TODOS OS BOTÕES ENQUANTO PROCESSANDO
    setAllTrips(prev => prev.map(trip => ({
      ...trip,
      isProcessing: trip.id === tripId ? true : trip.isProcessing
    })));

    // 🔥 TENTAR OBTER LOCALIZAÇÃO
    let currentLocation = null;
    
    try {
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        // timeout removed
      });
      
      currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? undefined,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      Alert.alert(
        "Localização Necessária", 
        "Não foi possível obter sua localização. Ative a localização do dispositivo e tente novamente.",
        [{ text: "OK" }]
      );
      throw new Error('Localização não disponível');
    }


    // 🔥 ACEITAR PEDIDO COM LOCALIZAÇÃO
    await acceptOrderByDeliveryman(tripId, currentLocation);

    // 🔥 ATUALIZAR LISTA COMPLETA APÓS ACEITAR
    await loadAllOrdersSilent();

    Alert.alert("✅ Viagem aceite", "Clique em iniciar viagem quando estiver com a mercadoria.");
    
  } catch (error: any) {
    
    // 🔥 REVERTER MUDANÇAS EM CASO DE ERRO
    await loadAllOrdersSilent();
    
    if (error.message !== 'Localização não disponível') {
      Alert.alert("Erro", "Não foi possível aceitar a viagem. Tente novamente.");
    }
  } finally {
    setAcceptingTripId(null);
  }
};

// 🔥 ADICIONAR ESTA FUNÇÃO PARA RESETAR ESTADO INCORRETO
const resetIncorrectAcceptedTrips = async () => {
  try {
    
    // Remover do AsyncStorage se existir
    const storedTrip = await AsyncStorage.getItem("acceptedTrip");
    if (storedTrip) {
      const trip = JSON.parse(storedTrip);
      
      // Verificar se a viagem ainda está realmente aceita
      const response = await getAllOrdersForDeliveryman();
      let ordersData = response?.trips || response?.orders || response || [];
      
      if (Array.isArray(ordersData)) {
        const currentTrip = ordersData.find((order: any) => order._id === trip.id);
        
        // Se a viagem não está mais aceita, remover do storage
        if (!currentTrip || 
            (currentTrip.deliveryman?._id !== user?._id && 
             currentTrip.status !== 'Aceite pelo entregador' &&
             currentTrip.stepStatus !== 5)) { // 🔥 ADICIONAR VERIFICAÇÃO DO STEP STATUS
          await AsyncStorage.removeItem("acceptedTrip");
        }
      }
    }
  } catch (error) {
    console.error("Erro ao resetar viagens aceitas:");
  }
};


// 🔥 ADICIONE ESTA FUNÇÃO PARA LIMPAR CACHE COMPLETO
const clearAllCacheAndReset = async () => {
  try {
    
    // Limpar AsyncStorage completamente
    await AsyncStorage.removeItem("acceptedTrip");
    await AsyncStorage.removeItem("allTrips");
    await AsyncStorage.removeItem("lastUpdate");
    
    // Resetar todos os estados
    setAllTrips([]);
    setAcceptedTrip(null);
    setRouteSummary(null);
    setIsTripStarted(false);
    
    // Parar animações
    blinkAnim.stopAnimation();
    
    // Parar compartilhamento de localização
    await stopLocationSharing();
    
    
  } catch (error) {
    console.error("Erro ao limpar cache:");
  }
};

// 🔥 ATUALIZAR LOCALIZAÇÃO NO BACKEND A CADA 5 SEGUNDOS
const startLocationSharingToBackend = (orderId: string) => {
  let updateInterval: any = null;
  
  const updateLocationToBackend = async () => {
    try {
      // 🔥 SEMPRE OBTER LOCALIZAÇÃO ATUAL
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        // timeout removed
      });

      // 🔥 VALIDAR LOCALIZAÇÃO ANTES DE ENVIAR
      if (!location.coords.latitude || !location.coords.longitude) {
        console.warn('⚠️ Localização inválida obtida, pulando atualização');
        return;
      }

      await updateDeliverymanLocation(orderId, {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? undefined,
        speed: location.coords.speed || 0,
        heading: location.coords.heading || 0,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Erro ao atualizar localização no backend:');
    }
  };

  // 🔥 ATUALIZAR IMEDIATAMENTE E DEPOIS A CADA 5 SEGUNDOS
  updateLocationToBackend(); // Primeira atualização
  
  updateInterval = setInterval(updateLocationToBackend, 5000); // 5 segundos

  // Retornar função para parar
  return () => {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
  };
};

// 🔥 ADICIONAR useRef PARA CONTROLAR O SHARING
const locationSharingRef = useRef<(() => void) | null>(null);

// 🔥 ATUALIZAR FUNÇÃO cancelTrip PARA PARAR O SHARING
const cancelTrip = async (tripId: string) => {
  Alert.alert(
    "Cancelar Viagem",
    "Deseja realmente cancelar a viagem?",
    [
      { text: "Não", style: "cancel" },
      {
        text: "Sim",
        onPress: async () => {
          try {
            setCancelingTripId(tripId);

            // 🔥 PARAR COMPARTILHAMENTO DE LOCALIZAÇÃO
            if (locationSharingRef.current) {
              locationSharingRef.current();
              locationSharingRef.current = null;
            }

            // Feedback visual instantâneo
            setAllTrips(prev => prev.filter(t => t.id !== tripId));

            await cancelOrderByDeliveryman(tripId);

            setAcceptedTrip(null);
            setIsTripStarted(false);
            setRouteSummary(null);
            blinkAnim.stopAnimation();
            await AsyncStorage.removeItem("acceptedTrip");
          } catch (error: any) {
            console.error("Erro ao cancelar viagem:", error.message);
            Alert.alert("Erro", "Não foi possível cancelar a viagem.");
          } finally {
            setCancelingTripId(null);
          }
        },
      },
    ]
  );
};

// 🔥 ATUALIZAR FUNÇÃO startTrip TAMBÉM
const startTrip = async (trip: Trip) => {
  Alert.alert(
    "Iniciar Viagem",
    "Você já está com a mercadoria? Confirme para iniciar a viagem.",
    [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Confirmar",
        onPress: async () => {
          try {
            setStartingTripId(trip.id);

            // Feedback visual instantâneo
            setAllTrips(prev => prev.map(t =>
              t.id === trip.id
                ? { ...t, status: 'Em trânsito', stepStatus: 5 }
                : t
            ));

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
                  accuracy: location.coords.accuracy ?? undefined,
                  speed: location.coords.speed,
                  heading: location.coords.heading,
                  timestamp: new Date().toISOString(),
                  action: 'trip_started'
                })
              });
            } catch (locationError) {
              console.warn('Erro ao atualizar localização de início:');
            }

            await startOrderInTransit(trip.id);

            setIsTripStarted(true);
            setRouteSummary(trip);
            await AsyncStorage.setItem("acceptedTrip", JSON.stringify(trip));
            startBlinkAnimation();

            navigation.navigate("Map", {
              tripData: trip,
              isActiveTrip: true
            });
          } catch (error: any) {
            console.error("Erro ao iniciar viagem:", error.message);
            // Reverter mudança visual
            setAllTrips(prev => prev.map(t =>
              t.id === trip.id
                ? { ...t, status: 'Aceite pelo entregador', stepStatus: 4 }
                : t
            ));
            Alert.alert("Erro", "Não foi possível iniciar a viagem.");
          } finally {
            setStartingTripId(null);
          }
        },
      },
    ]
  );
};

  const formatLastUpdate = () => {
    if (!lastUpdate) return "Nunca atualizado";
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `Atualizado há ${diffInSeconds}s`;
    } else {
      return `Atualizado há ${Math.floor(diffInSeconds / 60)}min`;
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case "Conectado": return "#2ECC71";
      case "Conectando...": return "#F39C12";
      case "Desconectado": return "#E74C3C";
      case "Erro de conexão": return "#E74C3C";
      default: return "#95A5A6";
    }
  };

  const renderNotApprovedMessage = () => (
    <View style={styles.notApprovedContainer}>
      <Ionicons name="alert-circle-outline" size={64} color={COLORS.warning} />
      <Text style={styles.notApprovedTitle}>Aguardando Aprovação</Text>
      <Text style={styles.notApprovedSubtitle}>
        Sua conta está em processo de análise. Você poderá visualizar solicitações de entrega após a aprovação.
      </Text>
      <TouchableOpacity
        style={styles.contactSupportButton}
        onPress={() => Alert.alert("Suporte", "Entre em contato com o suporte para mais informações.")}
      >
        <Text style={styles.contactSupportText}>Entrar em Contato com Suporte</Text>
      </TouchableOpacity>
    </View>
  );

  // 🔥 RENDERIZAR CARD DE ROTA ATUAL (EM TRÂNSITO)
  const renderCurrentRouteCard = () => {
    if (!routeSummary || !isTripStarted) return null;

    return (
      <View style={styles.routeSummaryContainer}>
        <Animated.View
          style={[
            styles.animatedBackground,
            {
              backgroundColor: blinkAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['#2E86DE', '#1a5ca8']
              })
            }
          ]}
        />
        <View style={styles.routeSummaryContent}>
          <View style={styles.routeHeader}>
            <Ionicons name="navigate-outline" size={28} color="#FFF" />
            <View style={styles.routeText}>
              <Text style={styles.routeLabel}>🎯 EM ACTIVIDADE</Text>
              <Text style={styles.routeInfo}>
                {routeSummary.pickup} → {routeSummary.destination}
              </Text>
              <Text style={styles.routeDetails}>
                {routeSummary.distance} • {routeSummary.time} • {routeSummary.reward}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.viewMapButton}
            onPress={() => navigation.navigate("Map", { 
              tripData: routeSummary, 
              isActiveTrip: true,
              currentLocation: currentLocation 
            })}
          >
            <Ionicons name="map-outline" size={20} color="#FFF" />
            <Text style={styles.viewMapText}>Ver Rota</Text>
          </TouchableOpacity>
        </View>
        
        {/* 🔥 STATUS DA ENTREGA */}
        <View style={styles.deliveryStatus}>
          <Ionicons name="cube-outline" size={16} color="#FFF" />
          <Text style={styles.deliveryStatusText}>
            Mercadoria a caminho da entrega
          </Text>
        </View>
      </View>
    );
  };

  const renderTripCard = ({ item }: { item: Trip }) => {
    const isAccepted = item.isAcceptedByDeliveryman;
    const isAccepting = acceptingTripId === item.id;
    const isStarting = startingTripId === item.id;
    const isCanceling = cancelingTripId === item.id;
    const hasAcceptedTrip = acceptedTrip !== null;
    const isCurrentAcceptedTrip = acceptedTrip?.id === item.id;
    
    // 🔥 VERIFICAR SE É UM PEDIDO EM TRÂNSITO (STATUS 5)
    const isInTransit = item.stepStatus === 5;

    return (
      <View style={[styles.requestCard, isAccepted && styles.acceptedCard]}>
        <View style={[styles.requestIcon, isAccepted && styles.acceptedIcon]}>
          <Ionicons
            name={isAccepted ? "checkmark-circle" : "car-outline"}
            size={28}
            color="#FFF"
          />
        </View>

        <View style={styles.requestContent}>
          <Text style={styles.requestTitle}>{item.passenger}</Text>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color={COLORS.primary} />
            <Text style={styles.requestInfo}>{item.pickup}</Text>
            <Ionicons name="arrow-forward-outline" size={16} color={COLORS.primary} style={{ marginHorizontal: 4 }} />
            <Text style={styles.requestInfo}>{item.destination}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="speedometer-outline" size={16} color="#2980B9" />
            <Text style={styles.requestInfo}>{item.distance}</Text>

            <Ionicons name="time-outline" size={16} color="#F39C12" style={{ marginLeft: 10 }} />
            <Text style={styles.requestInfo}>{item.time}</Text>
          </View>

          {/* 🔥 INDICADOR DE STATUS ESPECIAL PARA PEDIDOS EM TRÂNSITO */}
          {isInTransit && (
            <View style={styles.transitStatusBadge}>
              <Ionicons name="flash" size={12} color="#FFF" />
              <Text style={styles.transitStatusText}>EM TRÂNSITO</Text>
            </View>
          )}

          {/* 🔥 INDICADOR DE LOCALIZAÇÃO COMPARTILHADA */}
          {isAccepted && isSharingLocation && (
            <View style={styles.locationSharingBadge}>
              <Ionicons name="location" size={12} color="#FFF" />
              <Text style={styles.locationSharingText}>Localização compartilhada</Text>
            </View>
          )}

          {isAccepted && !isInTransit && (
            <View style={[
              styles.statusBadge,
              isTripStarted && isCurrentAcceptedTrip ? styles.startedBadge : styles.acceptedBadge
            ]}>
              <Text style={styles.statusBadgeText}>
                {isTripStarted && isCurrentAcceptedTrip ? "Viagem Iniciada" : "Viagem Aceite"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.acceptButtonContainer}>
          {isAccepted ? (
            <>
              {!isTripStarted || !isCurrentAcceptedTrip ? (
                <>
                  <TouchableOpacity
                    style={[styles.startButton, (isStarting || isCanceling) && styles.disabledButton]}
                    onPress={() => startTrip(item)}
                    disabled={isStarting || isCanceling || isInTransit} // 🔥 BLOQUEAR SE JÁ ESTIVER EM TRÂNSITO
                  >
                    {isStarting ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="play-circle-outline" size={20} color="#FFF" />
                        <Text style={styles.acceptText}>
                          {isInTransit ? "Em Andamento" : "Iniciar"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cancelButton, (isStarting || isCanceling) && styles.disabledButton]}
                    onPress={() => cancelTrip(item.id)}
                    disabled={isStarting || isCanceling || isInTransit} // 🔥 BLOQUEAR SE JÁ ESTIVER EM TRÂNSITO
                  >
                    {isCanceling ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="close-circle-outline" size={20} color="#FFF" />
                        <Text style={styles.acceptText}>Cancelar</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.viewRouteButton}
                  onPress={() => navigation.navigate("Map", { 
                    tripData: item, 
                    isActiveTrip: true,
                    currentLocation: currentLocation 
                  })}
                >
                  <Ionicons name="map-outline" size={20} color="#FFF" />
                  <Text style={styles.acceptText}>Ver Rota</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <TouchableOpacity
              style={[styles.acceptButton, (isAccepting || hasAcceptedTrip || isInTransit) && styles.disabledButton]}
              onPress={() => acceptTrip(item.id)}
              disabled={isAccepting || hasAcceptedTrip || isInTransit} // 🔥 BLOQUEAR SE JÁ ESTIVER EM TRÂNSITO
            >
              {isAccepting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons
                    name={hasAcceptedTrip || isInTransit ? "time-outline" : "checkmark-circle-outline"}
                    size={20}
                    color="#FFF"
                  />
                  <Text style={styles.acceptText}>
                    {hasAcceptedTrip || isInTransit ? "Indisponível" : "Aceitar"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.container}>
        {/* 🔥 STATUS DA CONEXÃO WEBSOCKET - SÓ MOSTRAR SE APROVADO */}
        {isDriverApproved && (
          <View style={[styles.connectionStatus, { backgroundColor: getConnectionStatusColor() }]}>
            <View style={styles.connectionInfo}>
              <Ionicons
                name={isConnected ? "wifi" : "wifi-outline"}
                size={16}
                color="#FFF"
              />
              <Text style={styles.connectionText}>
                {connectionStatus}
              </Text>
            </View>
            <Text style={styles.lastUpdateText}>
              {formatLastUpdate()}
            </Text>
          </View>
        )}

        {/* 🔥 BOTÃO DE ONLINE/OFFLINE */}
        {isDriverApproved && (
          <View style={styles.onlineToggleContainer}>
            <View style={styles.onlineToggleInfo}>
              <Ionicons 
                name={user?.availability === 'active' ? "car-sport" : "car-sport-outline"} 
                size={24} 
                color={user?.availability === 'active' ? COLORS.success : COLORS.gray} 
              />
              <View style={styles.onlineToggleTexts}>
                <Text style={[styles.onlineToggleTitle, { color: user?.availability === 'active' ? COLORS.success : COLORS.gray }]}>
                  {user?.availability === 'active' ? "Você está Online" : "Você está Offline"}
                </Text>
                <Text style={styles.onlineToggleSubtitle}>
                  {user?.availability === 'active' ? "Recebendo novas viagens" : "Pausado para novas viagens"}
                </Text>
              </View>
            </View>
            {isToggling ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Switch
                trackColor={{ false: "#767577", true: COLORS.success }}
                thumbColor="#f4f3f4"
                ios_backgroundColor="#3e3e3e"
                onValueChange={handleToggleOnline}
                value={user?.availability === 'active'}
              />
            )}
          </View>
        )}

        {/* 🔥 INDICADOR DE LOCALIZAÇÃO COMPARTILHADA */}
        {isSharingLocation && acceptedTrip && (
          <View style={styles.locationSharingContainer}>
            <Ionicons name="location" size={20} color="#2ECC71" />
            <Text style={styles.locationSharingInfo}>
              Compartilhando localização em tempo real
            </Text>
          </View>
        )}

        {/* 🔥 CARD DA ROTA ATUAL (EM TRÂNSITO) */}
        {renderCurrentRouteCard()}

        {/* 🔥 CORREÇÃO: O modal de aprovação substituiu a mensagem estática de bloqueio */}
        <View style={{ flex: 1 }}>
          <>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  {acceptedTrip ? "Sua Viagem" : "Solicitações de Viagem"}
                </Text>
                <Text style={styles.sectionSubtitle}>
                  {allTrips.length === 0 
                    ? "Nenhuma viagem disponível no momento" 
                    : `${allTrips.length} viagem${allTrips.length !== 1 ? 'ens' : ''} disponível${allTrips.length !== 1 ? 'eis' : ''}`}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.refreshHeaderButton}
                onPress={loadAllOrders}
                disabled={loadingOrders}
              >
                {loadingOrders ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Ionicons name="refresh" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            </View>

            {loadingOrders ? (
              <View style={styles.loadingOrdersContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingOrdersText}>Carregando solicitações...</Text>
              </View>
            ) : allTrips.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="car-outline" size={64} color={COLORS.gray} />
                <Text style={styles.emptyText}>Nenhuma solicitação disponível</Text>
                <Text style={styles.websocketInfo}>
                  {isConnected
                    ? "Novas viagens aparecerão automaticamente aqui"
                    : "Conectando ao servidor..."}
                </Text>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={loadAllOrders}
                  disabled={loadingOrders}
                >
                  <Ionicons name="refresh" size={20} color="#FFF" />
                  <Text style={styles.refreshText}>Recarregar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={allTrips}
                renderItem={renderTripCard}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            )}
          </>
        </View>
      </ScrollView>

      {/* 🔥 MODAL PREMIUM "CONTA EM ANÁLISE" */}
      <Modal visible={showApprovalModal} transparent animationType="slide">
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalContainer}>
            <View style={styles.premiumModalHeader}>
              <Ionicons name="time-outline" size={40} color="#F39C12" />
              <Text style={styles.premiumModalTitle}>Conta em Análise</Text>
            </View>
            <Text style={styles.premiumModalText}>
              O seu perfil de motorista encontra-se neste momento sob avaliação pela nossa equipa.
            </Text>
            <Text style={styles.premiumModalSubText}>
              Aguarde pela aprovação para começar a receber as solicitações de entrega e poder realizar viagens!
            </Text>
            <TouchableOpacity 
              style={styles.premiumModalCloseBtn}
              onPress={() => setShowApprovalModal(false)}
            >
              <Text style={styles.premiumModalCloseBtnText}>Compreendi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: COLORS.gray50 },
  container: { flex: 1, backgroundColor: "#F9FAFB", padding: 16 },
  // 🔥 NOVOS ESTILOS PARA WEBSOCKET
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  onlineToggleContainer: {
    backgroundColor: '#FFF',
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  onlineToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineToggleTexts: {
    marginLeft: 12,
  },
  onlineToggleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  onlineToggleSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  connectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  connectionText: {
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
  lastUpdateText: {
    color: '#FFF',
    fontSize: 12,
    opacity: 0.9,
  },
  // 🔥 NOVOS ESTILOS PARA LOCALIZAÇÃO COMPARTILHADA
  locationSharingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2ECC71',
  },
  locationSharingInfo: {
    color: '#2ECC71',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
  locationSharingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2ECC71',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  locationSharingText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  // 🔥 ESTILOS PARA CARD DE ROTA ATUAL (EM TRÂNSITO)
  routeSummaryContainer: {
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COLORS.primary,
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  animatedBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  routeSummaryContent: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
    justifyContent: "space-between",
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  routeText: { flex: 1, marginLeft: 12 },
  routeLabel: { 
    fontSize: 16, 
    color: "#FFF", 
    fontWeight: "bold",
    marginBottom: 4,
  },
  routeInfo: { 
    fontSize: 14, 
    color: "#FFF",
    fontWeight: '500',
    marginBottom: 2,
  },
  routeDetails: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  viewMapButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  viewMapText: { 
    color: "#FFF", 
    fontWeight: "bold", 
    marginLeft: 4, 
    fontSize: 12 
  },
  deliveryStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  deliveryStatusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  // 🔥 NOVO ESTILO PARA BADGE DE TRÂNSITO
  transitStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E67E22',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  transitStatusText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  websocketInfo: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    fontStyle: 'italic',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
  },
  refreshHeaderButton: {
    padding: 8,
  },
  requestCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  acceptedCard: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: "#F9F5FF",
  },
  requestIcon: {
    backgroundColor: "rgba(127, 0, 255, 0.1)",
    borderRadius: 50,
    padding: 12,
    marginRight: 16,
    alignSelf: 'flex-start',
  },
  acceptedIcon: { backgroundColor: COLORS.primary },
  requestContent: { flex: 1, marginLeft: 12 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  requestInfo: { fontSize: 14, color: "#555", marginLeft: 4 },
  requestTitle: { fontSize: 16, fontWeight: "bold", color: "#222", marginBottom: 4 },
  acceptButtonContainer: {
    justifyContent: "center",
    marginLeft: 10,
    minWidth: 100,
  },
  acceptButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF4E4E",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  viewRouteButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  disabledButton: { opacity: 0.6 },
  acceptText: {
    color: "#FFF",
    fontWeight: "bold",
    marginLeft: 4,
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  acceptedBadge: { backgroundColor: "#F39C12" },
  startedBadge: { backgroundColor: "#2ECC71" },
  statusBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  notApprovedContainer: {
    backgroundColor: "#FFF",
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    elevation: 2,
  },
  notApprovedTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  notApprovedSubtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#666",
    lineHeight: 20,
    marginBottom: 20,
  },
  contactSupportButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 10,
  },
  contactSupportText: { color: "#FFF", fontWeight: "bold" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.gray50,
  },
  loadingOrdersContainer: { alignItems: "center", padding: 40 },
  loadingText: { fontSize: 16, color: "#666", marginTop: 16 },
  loadingOrdersText: { fontSize: 16, color: "#666", marginTop: 16 },
  emptyContainer: { 
    alignItems: "center", 
    padding: 40, 
    backgroundColor: "#FFF", 
    borderRadius: 16, 
    elevation: 2, 
    shadowColor: "#000", 
    shadowOpacity: 0.05, 
    shadowRadius: 10,
    marginTop: 20
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  refreshText: { color: "#FFF", fontWeight: "bold", marginLeft: 8 },
  premiumModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumModalContainer: {
    backgroundColor: '#FFF',
    width: '85%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  premiumModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#333',
    marginTop: 10,
    textAlign: 'center',
  },
  premiumModalText: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
    marginBottom: 12,
  },
  premiumModalSubText: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  premiumModalCloseBtn: {
    backgroundColor: '#F39C12',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  premiumModalCloseBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});