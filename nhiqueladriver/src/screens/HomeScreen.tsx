import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Vibration,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Audio } from "expo-av";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
import { startBackgroundLocationUpdates, stopBackgroundLocationUpdates } from '../services/LocationService';
import { useAuth } from "../context/AuthContext";
import TripCard from "../components/TripCard";
import { API_BASE_URL } from "../api/apiConfig";
import { showMessage } from "react-native-flash-message";
import { Trip, WebSocketOrderData, LocationData } from "../types";

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

// 🔥 TIPOS PARA WEBSOCKET
type WebSocketError = {
  message: string;
  code?: string;
};

export default function HomeScreen({ navigation }: any) {
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [acceptedTrip, setAcceptedTrip] = useState<Trip | null>(null);
  const [routeSummary, setRouteSummary] = useState<Trip | null>(null);
  const [alertSound, setAlertSound] = useState<Audio.Sound | null>(null);

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
  const [showApprovedSuccessModal, setShowApprovedSuccessModal] = useState(false);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  
  const [isToggling, setIsToggling] = useState(false);
  const [showTripAcceptedModal, setShowTripAcceptedModal] = useState(false);
  const [showOrderTakenModal, setShowOrderTakenModal] = useState(false);
  const [tripToStart, setTripToStart] = useState<Trip | null>(null);
  const [showTripStartedModal, setShowTripStartedModal] = useState(false);
  const [startedTripData, setStartedTripData] = useState<Trip | null>(null);
  const [showLocationRequiredModal, setShowLocationRequiredModal] = useState(false);
  const { user, updateUser, updateDeliveryman } = useAuth();
  
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [tripToCancelId, setTripToCancelId] = useState<string | null>(null);

  // Load alert sound
  useEffect(() => {
    let soundObj: Audio.Sound | null = null;
    async function loadSound() {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        const { sound } = await Audio.Sound.createAsync(
          require('../assets/sounds/calldriver.mp3'),
          { volume: 1.0}
        );
        await sound.setVolumeAsync(1.0);
        await sound.setIsLoopingAsync(true);
        soundObj = sound;
        setAlertSound(sound);
      } catch (e) {
        console.log("Erro ao carregar som de alerta:", e);
      }
    }
    loadSound();
    return () => {
      soundObj?.unloadAsync();
    };
  }, []);

  // Play/Stop sound depending on pending trips
  useEffect(() => {
    if (alertSound) {
      const hasPending = allTrips.some(t => t.status === 'Pendente');
      if (hasPending && user?.availability === 'active') {
        alertSound.playAsync();
        // Vibrate repeatedly (Wait 500ms, Vibrate 1000ms, Wait 500ms)
        const PATTERN = [500, 1000, 500];
        Vibration.vibrate(PATTERN, true); // true for looping
      } else {
        alertSound.stopAsync();
        Vibration.cancel();
      }
    }
    
    return () => {
      Vibration.cancel();
    };
  }, [allTrips, alertSound, user?.availability]);

  const isMounted = useRef(true);

  // 🔥 OBTER E COMPARTILHAR LOCALIZAÇÃO EM TEMPO REAL
  const startLocationSharing = async () => {
    try {
      if (acceptedTrip) {
         await AsyncStorage.setItem('currentOrderId', JSON.stringify(acceptedTrip.id));
      }
      await startBackgroundLocationUpdates();
      setIsSharingLocation(true);
    } catch (error: any) {
      console.error("❌ Erro ao iniciar compartilhamento de localização:", error.message);
      Alert.alert("Erro", "Não foi possível iniciar o compartilhamento de localização.");
    }
  };

  // 🔥 PARAR COMPARTILHAMENTO DE LOCALIZAÇÃO
  const stopLocationSharing = async () => {
    try {
      await stopBackgroundLocationUpdates();
      await AsyncStorage.removeItem('currentOrderId');
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

        websocketService.connect(token, user);

        // 🔥 Se o socket já estava ligado antes do connect event disparar,
        // emitir onLogin directamente para garantir entrada na sala driver_<id>
        if (websocketService.isConnected && user) {
          websocketService.socket?.emit('onLogin', user);
        }


        const handleOrderWebSocketUpdate = async (data: any) => {
          if (!isMounted.current || !data || (!data._id && !data.id)) return;
          
          let currentPosition = { latitude: 0, longitude: 0 };
          try {
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            currentPosition = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };
          } catch (e) {}

          const newFormattedOrder = formatOrder(data, currentPosition);
          
          const isCancelled = data.status === 'Cancelado' || data.status === 'Motorista indisponível' || data.isCanceled || data.deleted;
          
          setAllTrips((prevTrips: any[]) => {
            let newTrips = [];
            if (isCancelled) {
              newTrips = prevTrips.filter(t => t.id !== newFormattedOrder.id);
            } else {
              const exists = prevTrips.some(t => t.id === newFormattedOrder.id);
              if (exists) {
                newTrips = prevTrips.map(t => t.id === newFormattedOrder.id ? newFormattedOrder : t);
              } else {
                newTrips = [newFormattedOrder, ...prevTrips];
              }
            }
            
            // Re-evaluate acceptedTrip
            const accepted = newTrips.find((order: any) => {
              const isAcceptedByCurrentUser = order.isAcceptedByDeliveryman;
              const isInTransit = order.stepStatus === 5;
              return isAcceptedByCurrentUser || isInTransit;
            });
            
            setAcceptedTrip(accepted || null);
            if (accepted) {
              const tripStarted = accepted.stepStatus === 5;
              setIsTripStarted(tripStarted);
              if (tripStarted) {
                setRouteSummary(accepted);
                AsyncStorage.setItem("acceptedTrip", JSON.stringify(accepted));
              } else {
                setRouteSummary(null);
              }
            } else {
              setRouteSummary(null);
              setIsTripStarted(false);
              AsyncStorage.removeItem("acceptedTrip");
            }
            return newTrips;
          });
          setLastUpdate(new Date());
        };

        // 🔥 LISTENER PARA ATUALIZAÇÕES DE PEDIDOS
        websocketService.on('order_updated', handleOrderWebSocketUpdate);

        // 🔥 LISTENER PARA PEDIDOS ATRIBUÍDOS
        websocketService.on('order_assigned', handleOrderWebSocketUpdate);

        // 🔥 LISTENER PARA LIBERTAÇÃO DO MOTORISTA
        websocketService.on('service_released', (data: any) => {
          if (!isMounted.current) return;
          console.log('✅ Serviço libertado:', data);
          
          Alert.alert(
            "Serviço Terminado",
            data.message || "Pode agora receber novos pedidos.",
            [{ text: "OK" }]
          );
          
          // Limpar a viagem atual
          AsyncStorage.removeItem("acceptedTrip");
          setAcceptedTrip(null);
          setIsTripStarted(false);
          setRouteSummary(null);
          
          // Recarregar viagens disponíveis
          loadAllOrdersSilent();
        });

        // 🔥 LISTENER PARA NOVOS PEDIDOS (Despacho Inteligente)
        websocketService.on('new_order', (data: any) => {
          if (!isMounted.current) return;
          // Adicionar novo pedido à lista se ainda não estiver lá
          setAllTrips(prev => {
            const exists = prev.some(t => t.id === data._id);
            if (exists) return prev;
            const newTrip = formatOrder(data);
            return newTrip ? [newTrip, ...prev] : prev;
          });
        });

        // 🔥 LISTENER PARA PEDIDO ACEITE POR OUTRO MOTORISTA
        websocketService.on('order_taken', (data: any) => {
          if (!isMounted.current) return;
          const { orderId, acceptedBy } = data;
          // Verificar se este motorista não é o que aceitou
          setAllTrips(prev => {
            const exists = prev.some(t => t.id === orderId);
            if (exists && acceptedBy !== user?._id) {
              setShowOrderTakenModal(true);
            }
            // Remover o pedido da lista apenas se não foi este motorista que o aceitou
            if (acceptedBy === user?._id) return prev;
            return prev.filter(t => t.id !== orderId);
          });
        });

        // 🔥 LISTENER PARA CANCELAMENTO DE PEDIDO PELO CLIENTE
        websocketService.on('order_cancelled', async (data: any) => {
          if (!isMounted.current) return;
          const { orderId } = data;
          
          // Parar alarme se estiver tocando
          if (alertSound) {
            alertSound.stopAsync().catch(() => {});
          }
          Vibration.cancel();

          // Remover o pedido da lista
          setAllTrips(prev => prev.filter(t => t.id !== orderId));
          
          // Se for a viagem atual sendo aceita ou iniciada, limpar
          setAcceptedTrip(prev => {
            if (prev && prev.id === orderId) {
              AsyncStorage.removeItem("acceptedTrip");
              setIsTripStarted(false);
              setRouteSummary(null);
              // Avisar o motorista
              Alert.alert(
                "Viagem Cancelada", 
                "O cliente cancelou esta viagem.",
                [{ text: "OK" }]
              );
              return null;
            }
            return prev;
          });
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
            setShowApprovedSuccessModal(true);
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
      websocketService.off('service_released');
      websocketService.off('new_order');
      websocketService.off('order_taken');
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
           // ?? ATUALIZAR LOCALIZACAO INSTANTANEAMENTE
           try {
             const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
             if (loc && user) {
               websocketService.sendLocation({
                 driverId: user._id || (user as any).id,
                 latitude: loc.coords.latitude,
                 longitude: loc.coords.longitude,
                 heading: loc.coords.heading || 0,
                 speed: loc.coords.speed || 0,
                 timestamp: new Date().toISOString()
               });
             }
           } catch (e) {
             console.log("Erro ao atualizar localizacao:", e);
           }
        }
      } else {
        const data = await response.json().catch(() => ({}));
        showMessage({
          message: "Atenção",
          description: data.message || "Erro ao alterar disponibilidade.",
          type: "danger",
          icon: "auto",
          style: {
            paddingTop: 40,
            borderRadius: 16,
            margin: 10,
            backgroundColor: COLORS.error || '#FF3B30',
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
          duration: 5000,
        });
        
        // Forçar UI voltar para o estado anterior (rollback visual do toggle)
        if (updateUser) {
          updateUser({ ...user }); 
        }
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
    // Modal de aprovação: só reage a user.status quando temos certeza do estado
    if (user?.status === 'Disponível' || user?.status === 'Em Entrega') {
      setIsDriverApproved(true);
      setShowApprovalModal(false);
    } else if (user?.status === 'Pendente' || user?.status === 'Inativo') {
      // Só mostra modal se realmente Pendente/Inativo — não quando status é undefined
      if (!isDriverApproved) {
        setShowApprovalModal(true);
      }
    }
  }, [user?.status]);

  // 🔄 POLLING DE SEGURANÇA: a cada 8s enquanto Pendente, verifica o estado no servidor
  useEffect(() => {
    // Só faz polling se o motorista ainda não foi aprovado E está autenticado
    if (isDriverApproved === true || !user?._id) return;

    const poll = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/drivers/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const fresh = await res.json();
        console.log('[POLL] Status actual no servidor:', fresh.status);
        const nowApproved = fresh.status === 'Disponível' || fresh.status === 'Em Entrega';
        if (nowApproved) {
          console.log('✅ [POLL] Motorista aprovado detectado!');
          // Actualizar o user no AuthContext completo (incluindo deliveryman.register_conformance)
          updateUser({ ...fresh, isApproved: true });
          setIsDriverApproved(true);
          setShowApprovalModal(false);
          loadAllOrders();
        }
      } catch (e) {
        console.log('[POLL] Erro:', e);
      }
    };

    // Primeira verificação imediata ao montar
    poll();
    const interval = setInterval(poll, 8000);
    return () => clearInterval(interval);
  }, [isDriverApproved, user?._id]);

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

      const formattedOrders = ordersData
        .map((order: any) => formatOrder(order, currentPosition))
        .filter((order: any) => {
          const tripStatus = order.status ? order.status.toLowerCase() : "";
          const isCompleted = tripStatus === "concluída" || tripStatus === "completed" || tripStatus === "entregue" || tripStatus === "delivered" || tripStatus === "cancelado" || tripStatus === "canceled" || tripStatus === "cancelled" || tripStatus === "motorista indisponível" || order.stepStatus === 6 || order.stepStatus === 7;
          // Keep if not completed OR if it's currently marked as accepted/in transit by THIS driver (sanity check)
          return !isCompleted || order.stepStatus === 5 || order.isAcceptedByDeliveryman;
        });

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
      if (error.message !== 'Network Error') {
        console.error("❌ Erro na atualização silenciosa:", error.message);
      }
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
  
      const formattedOrders = ordersData
        .map((order: any) => formatOrder(order, currentPosition))
        .filter((order: any) => {
          const tripStatus = order.status ? order.status.toLowerCase() : "";
          const isCompleted = tripStatus === "concluída" || tripStatus === "completed" || tripStatus === "entregue" || tripStatus === "delivered" || tripStatus === "cancelado" || tripStatus === "canceled" || tripStatus === "cancelled" || tripStatus === "motorista indisponível" || order.stepStatus === 6 || order.stepStatus === 7;
          return !isCompleted || order.stepStatus === 5 || order.isAcceptedByDeliveryman;
        });
  
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
    // Para requestService, usar destinationDetails. Se nao, os outros.
    const destinationLat = order.destinationDetails?.lat ||
      order.deliveryAddress?.latitude ||
      order.destinationLocation?.latitude ||
      order.seller?.latitude ||
      order.sellerInfo?.latitude || 
      order.latitude || 0;
  
    const destinationLon = order.destinationDetails?.lng ||
      order.deliveryAddress?.longitude ||
      order.destinationLocation?.longitude ||
      order.seller?.longitude ||
      order.sellerInfo?.longitude || 
      order.longitude || 0;

    // A origem do pedido (onde o motorista vai buscar o cliente/produto)
    const originLat = order.originDetails?.lat || order.seller?.latitude || order.latitude || 0;
    const originLon = order.originDetails?.lng || order.seller?.longitude || order.longitude || 0;
  
    let distance = 0;
    let timeStr = "Tempo nao disponvel";

    // 1. Tentar usar o distanceKm do pricing (calculado pelo backend via OSRM)
    if (order.pricing && order.pricing.distanceKm) {
      distance = order.pricing.distanceKm;
      if (order.pricing.breakdown && order.pricing.breakdown.durationMin) {
        timeStr = `${Math.round(order.pricing.breakdown.durationMin)} min`;
      }
    } 
    // 2. Fallback: Calcular distncia em linha reta (origem para destino)
    else if (originLat !== 0 && originLon !== 0 && destinationLat !== 0 && destinationLon !== 0) {
      distance = getDistanceFromLatLonInKm(originLat, originLon, destinationLat, destinationLon);
    }
    // 3. Fallback final: Calcular da posiao atual para o destino (caso antigo)
    else if (currentPosition && destinationLat && destinationLon &&
      currentPosition.latitude !== 0 && currentPosition.longitude !== 0) {
      distance = getDistanceFromLatLonInKm(
        currentPosition.latitude,
        currentPosition.longitude,
        destinationLat,
        destinationLon
      );
    }

    if (distance > 0 && timeStr === "Tempo nao disponvel") {
      timeStr = `${Math.round(distance / 40 * 60)} min`;
    }
  
    // ?? CORREAO DEFINITIVA: Lgica EXATA para verificar aceitaao
    const currentUserId = user?._id;
    const orderDeliverymanId = order.deliveryman?._id || order.deliveryman?.id || order.deliverymanId;
    
    // ?? LOGICA CORRIGIDA: 
    // - Se stepStatus  5 (em trnsito), considerar como "aceito" independente do deliveryman
    // - Caso contrrio, verificar se foi aceito pelo entregador atual
    const isInTransit = order.stepStatus === 5;
    const isAcceptedByDeliveryman = isInTransit || (
      orderDeliverymanId === currentUserId &&
      order.status === 'Aceite pelo entregador' &&
      order.stepStatus === 4  
    );
    const isReq = order.goodType !== undefined || order.type === 'requestService';
    let serviceNameStr;
    if (isReq) {
      if (order.serviceId && order.serviceId.name) {
        serviceNameStr = order.serviceId.name;
      } else {
        serviceNameStr = (order.name && !order.name.match(/^[0-9a-fA-F]{24}$/)) ? order.name : (order.goodType || "Serviço");
      }
    }

    return {
      id: order._id || order.id,
      passengerId: order.user?._id || order.user?.id || order.userId || "0",
      serviceName: serviceNameStr,
      serviceMotive: order.reason || order.description || order.goodType || undefined,
      passenger: order.user?.name || order.clientName || "Cliente",
      passengerImage: order.user?.profileImage,
      passengerPhone: order.user?.phoneNumber || order.phoneNumber || "Nao disponvel",
      pickup: order.originDetails?.address || order.seller?.location?.address || order.seller?.name || order.seller?.address || order.origin || order.pickupAddress || "Local de origem",
      destination: order.destinationDetails?.address || order.deliveryAddress?.address || order.destination || "Destino",
      reward: `MZN ${order.pricing?.totalPrice || order.deliveryPrice || order.totalPrice || order.reward || Math.round(distance * 25)}`,
      distance: distance > 0 ? `${distance.toFixed(2)} km` : "Distncia nao disponvel",
      time: timeStr,
      destinationLocation: {
        latitude: destinationLat,
        longitude: destinationLon,
      },
      stepStatus: order.stepStatus,
      status: order.status,
      isAcceptedByDeliveryman,
      paymentMethod: order.paymentMethod || 'Dinheiro',
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


  const acceptTrip = useCallback(async (tripId: string) => {
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
        // Usar um timeout para não bloquear eternamente e usar Balanced (rápido e suficiente para este step)
        const location = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 7000))
        ]) as Location.LocationObject;
        
        currentLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy ?? undefined,
          timestamp: new Date().toISOString()
        };

      } catch (error: any) {
        // 🔥 FALLBACK: Se falhar ou der timeout, tenta usar a última localização conhecida
        try {
          const lastLocation = await Location.getLastKnownPositionAsync();
          if (lastLocation) {
            currentLocation = {
              latitude: lastLocation.coords.latitude,
              longitude: lastLocation.coords.longitude,
              accuracy: lastLocation.coords.accuracy ?? undefined,
              timestamp: new Date().toISOString()
            };
          } else {
            throw new Error('Sem última localização');
          }
        } catch (fallbackError) {
          setShowLocationRequiredModal(true);
          throw new Error('Localização não disponível');
        }
      }

      // 🔥 ACEITAR PEDIDO COM LOCALIZAÇÃO
      // Usar o ID do servidor e detetar o tipo pelo originalData
      const trip = allTrips.find(t => t.id === tripId);
      const isReq = trip?.originalData?.type === 'requestService';
      await acceptOrderByDeliveryman(tripId, currentLocation, isReq);

      if (trip) {
        const updatedTrip = { ...trip, status: 'Aceite pelo entregador', stepStatus: 4 };
        await AsyncStorage.setItem("acceptedTrip", JSON.stringify(updatedTrip));
        setAcceptedTrip(updatedTrip);
      }

      // 🔥 ATUALIZAR LISTA COMPLETA APÓS ACEITAR
      await loadAllOrdersSilent();

      setShowTripAcceptedModal(true);
      
    } catch (error: any) {
      // 🔥 REVERTER MUDANÇAS EM CASO DE ERRO
      await loadAllOrdersSilent();
      
      if (error.message !== 'Localização não disponível') {
        const errMsg = error?.response?.data?.message || error?.message || 'Tente novamente.';
        setErrorModal({ visible: true, message: errMsg });
      }
    } finally {
      setAcceptingTripId(null);
    }
  }, [allTrips]);

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

// 🔥 ATUALIZAR LOCALIZAÇÃO NO BACKEND VIA WEBSOCKET A CADA 10 SEGUNDOS (Otimizado)
const startLocationSharingToBackend = (orderId: string) => {
  let updateInterval: any = null;
  
  const updateLocationToBackend = async () => {
    try {
      // 🔥 SEMPRE OBTER LOCALIZAÇÃO ATUAL
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // 🔥 VALIDAR LOCALIZAÇÃO ANTES DE ENVIAR
      if (!location.coords.latitude || !location.coords.longitude) {
        console.warn('⚠️ Localização inválida obtida, pulando atualização');
        return;
      }

      // Envia via WebSocket em vez de HTTP request
      if (user?._id) {
        websocketService.sendLocation({
          driverId: user._id,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          speed: location.coords.speed || 0,
          heading: location.coords.heading || 0,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('Erro ao atualizar localização via socket:');
    }
  };

  // 🔥 ATUALIZAR IMEDIATAMENTE E DEPOIS A CADA 10 SEGUNDOS
  updateLocationToBackend(); // Primeira atualização
  
  updateInterval = setInterval(updateLocationToBackend, 10000); // 10 segundos para poupar servidor

  // Retornar função para parar
  return () => {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
  };
};

// 🔥 ADICIONAR useRef PARA CONTROLAR O SHARING
const locationSharingRef = useRef<(() => void) | null>(null);

const cancelTrip = useCallback(async (tripId: string) => {
  setTripToCancelId(tripId);
  setCancelModalVisible(true);
}, []);

const confirmCancelTrip = async () => {
  if (!tripToCancelId) return;
  const tripId = tripToCancelId;
  
  try {
    setCancelModalVisible(false);
    setCancelingTripId(tripId);

    // 🔥 PARAR COMPARTILHAMENTO DE LOCALIZAÇÃO
    if (locationSharingRef.current) {
      locationSharingRef.current();
      locationSharingRef.current = null;
    }

    // Feedback visual instantâneo
    setAllTrips(prev => prev.filter(t => t.id !== tripId));

    const trip = allTrips.find(t => t.id === tripId);
    const isReq = trip?.originalData?.goodType !== undefined || trip?.originalData?.type === 'requestService';
    await cancelOrderByDeliveryman(tripId, isReq);

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
    setTripToCancelId(null);
  }
};

const startTrip = useCallback((trip: Trip) => {
  setTripToStart(trip);
}, []);

const proceedStartTrip = async (trip: Trip) => {
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
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
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
          timestamp: new Date().toISOString(),
          action: 'trip_started'
        })
      });
    } catch (locationError) {
      console.warn('Erro ao atualizar localização de início:');
    }

    const isReq = trip?.originalData?.type === 'requestService';
    await startOrderInTransit(trip.id, isReq);

    setIsTripStarted(true);
    setRouteSummary(trip);
    await AsyncStorage.setItem("acceptedTrip", JSON.stringify(trip));
    startBlinkAnimation();

    // Mostrar modal premium de sucesso
    setStartedTripData(trip);
    setShowTripStartedModal(true);
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
                outputRange: ['#A855F7', '#7E22CE'] // Premium Purple glow
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
                {routeSummary.distance} • {routeSummary.time} • {routeSummary.reward} • {routeSummary.paymentMethod}
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

  const onViewRoute = useCallback((item: Trip) => {
    navigation.navigate("Map", { 
      tripData: item, 
      isActiveTrip: true 
    });
  }, [navigation]);

  const handleTripExpire = useCallback((id: string) => {
    setAllTrips(prev => prev.filter(t => t.id !== id));
  }, []);

  const renderTripCard = useCallback(({ item }: { item: Trip }) => {
    return (
      <TripCard
        item={item}
        acceptingTripId={acceptingTripId}
        startingTripId={startingTripId}
        cancelingTripId={cancelingTripId}
        acceptedTrip={acceptedTrip}
        isSharingLocation={isSharingLocation}
        isTripStarted={isTripStarted}
        startTrip={startTrip}
        cancelTrip={cancelTrip}
        acceptTrip={acceptTrip}
        onViewRoute={onViewRoute}
        onExpire={handleTripExpire}
      />
    );
  }, [acceptingTripId, startingTripId, cancelingTripId, acceptedTrip, isSharingLocation, isTripStarted, startTrip, cancelTrip, acceptTrip, onViewRoute, handleTripExpire]);

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
      <ScrollView 
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 🔥 STATUS DA CONEXÃO WEBSOCKET - SÓ MOSTRAR SE APROVADO */}
        {false && isDriverApproved && connectionStatus !== "Conectado" && (
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
        <View>
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

      {/* ✅ MODAL PREMIUM "CONTA APROVADA SUCESSO" */}
      <Modal visible={showApprovedSuccessModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(17,24,39,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{
            backgroundColor: '#FFFFFF', borderRadius: 32, width: '100%', maxWidth: 350,
            padding: 32, alignItems: 'center',
            shadowColor: '#10B981', shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.3, shadowRadius: 30, elevation: 18,
          }}>
            <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              <Ionicons name="checkmark-done-circle" size={54} color="#059669" />
            </View>

            <Text style={{ fontSize: 26, fontWeight: '900', color: '#064E3B', marginBottom: 12, textAlign: 'center' }}>
              Conta Aprovada! 🎉
            </Text>

            <Text style={{ fontSize: 16, color: '#374151', textAlign: 'center', lineHeight: 24, marginBottom: 8, fontWeight: '600' }}>
              Parabéns! A sua documentação foi validada.
            </Text>
            
            <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
              A sua conta está ativa. Já pode receber pedidos de entrega e começar a faturar.
            </Text>

            <TouchableOpacity
              style={{
                width: '100%', paddingVertical: 16, borderRadius: 16,
                backgroundColor: '#059669', alignItems: 'center',
                shadowColor: '#059669', shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
              }}
              onPress={() => setShowApprovedSuccessModal(false)}
              activeOpacity={0.9}
            >
              <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '800' }}>Começar Agora!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 🔥 MODAL DE NOVA VIAGEM (INCOMING TRIP) */}
      <Modal 
        visible={allTrips.some(t => t.status === 'Pendente')} 
        transparent 
        animationType="slide"
      >
        <View style={styles.newTripModalOverlay}>
          <View style={styles.newTripModalContainer}>
            <Text style={styles.newTripModalTitle}>Nova Solicitação de Viagem</Text>
            {allTrips.filter(t => t.status === 'Pendente').map(trip => (
              <View key={trip.id} style={{ width: '100%', marginBottom: 15 }}>
                {renderTripCard({ item: trip })}
              </View>
            ))}
          </View>
        </View>
      </Modal>

      {/* ✅ MODAL PREMIUM — VIAGEM ACEITE */}
      <Modal visible={showTripAcceptedModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(17,24,39,0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{
            backgroundColor: '#FFFFFF', borderRadius: 28, width: '100%', maxWidth: 340,
            padding: 28, alignItems: 'center',
            shadowColor: '#10B981', shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.2, shadowRadius: 24, elevation: 14,
          }}>
            {/* Green checkmark icon */}
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginBottom: 18 }}>
              <Ionicons name="checkmark-circle" size={46} color="#059669" />
            </View>

            <Text style={{ fontSize: 22, fontWeight: '900', color: '#065F46', marginBottom: 10, textAlign: 'center' }}>
              Viagem Aceite! 🎉
            </Text>

            <Text style={{ fontSize: 14, color: '#374151', textAlign: 'center', lineHeight: 22, marginBottom: 8 }}>
              Parabéns! A viagem foi aceite com sucesso.
            </Text>
            <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21, marginBottom: 28 }}>
              Dirija-se ao local de recolha e clique em{' '}
              <Text style={{ fontWeight: '700', color: '#059669' }}>"Iniciar Viagem"</Text>{' '}
              quando estiver com a mercadoria.
            </Text>

            <TouchableOpacity
              style={{
                width: '100%', paddingVertical: 15, borderRadius: 14,
                backgroundColor: '#059669', alignItems: 'center',
                shadowColor: '#059669', shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
              }}
              onPress={() => {
                setShowTripAcceptedModal(false);
                if (acceptedTrip) {
                  navigation.navigate("Map", { tripData: acceptedTrip, isActiveTrip: true });
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 🚫 MODAL PREMIUM — PEDIDO ACEITE POR OUTRO MOTORISTA */}
      <Modal visible={showOrderTakenModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(17,24,39,0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{
            backgroundColor: '#FFFFFF', borderRadius: 28, width: '100%', maxWidth: 340,
            padding: 28, alignItems: 'center',
            shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.2, shadowRadius: 24, elevation: 14,
          }}>
            {/* Warning icon */}
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginBottom: 18 }}>
              <MaterialCommunityIcons name="car-multiple" size={42} color="#D97706" />
            </View>

            <Text style={{ fontSize: 21, fontWeight: '900', color: '#92400E', marginBottom: 10, textAlign: 'center' }}>
              Pedido já foi aceite
            </Text>

            <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
              Outro motorista aceitou este pedido antes de si. O pedido foi removido da sua lista.{'\n\n'}Fique atento para novas solicitações!{' '}🚀
            </Text>

            <TouchableOpacity
              style={{
                width: '100%', paddingVertical: 15, borderRadius: 14,
                backgroundColor: '#D97706', alignItems: 'center',
                shadowColor: '#D97706', shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
              }}
              onPress={() => setShowOrderTakenModal(false)}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>Continuar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 🔥 MODAL DE CONFIRMAÇÃO PREMIUM - INICIAR VIAGEM */}
      <Modal
        visible={tripToStart !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setTripToStart(null)}
      >
        <View style={styles.premiumModalOverlay}>
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
                onPress={() => setTripToStart(null)}
              >
                <Text style={styles.premiumCancelButtonText}>Não, Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.premiumConfirmButton}
                activeOpacity={0.85}
                onPress={async () => {
                  const trip = tripToStart;
                  setTripToStart(null);
                  if (trip) {
                    await proceedStartTrip(trip);
                  }
                }}
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

      {/* 🔥 MODAL PREMIUM — VIAGEM INICIADA COM SUCESSO */}
      <Modal
        visible={showTripStartedModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalContainer}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              <Ionicons name="compass-outline" size={44} color="#059669" />
            </View>
            
            <Text style={styles.premiumModalTitle}>Viagem Iniciada! 🚀</Text>
            
            <Text style={styles.premiumModalMessage}>
              A rota para a entrega foi traçada com sucesso. Conduza com cuidado e respeite as regras de trânsito.
            </Text>

            <TouchableOpacity 
              style={{
                width: '100%',
                borderRadius: 16,
                overflow: 'hidden',
              }}
              activeOpacity={0.85}
              onPress={() => {
                setShowTripStartedModal(false);
                navigation.navigate("Map", {
                  tripData: startedTripData,
                  isActiveTrip: true
                });
              }}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.premiumConfirmGradient}
              >
                <Text style={styles.premiumConfirmButtonText}>Ir para o Mapa</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 🚫 MODAL PREMIUM — LOCALIZAÇÃO NECESSÁRIA */}
      <Modal
        visible={showLocationRequiredModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLocationRequiredModal(false)}
      >
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalContainer}>
            <View style={[styles.premiumIconContainer, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="location-outline" size={44} color="#D97706" />
            </View>
            
            <Text style={styles.premiumModalTitle}>Localização Necessária</Text>
            
            <Text style={styles.premiumModalMessage}>
              Não foi possível obter sua localização. Ative a localização do dispositivo e tente novamente.
            </Text>

            <TouchableOpacity 
              style={[styles.premiumConfirmButton, { width: '100%', flex: 0, marginTop: 16 }]}
              activeOpacity={0.85}
              onPress={() => setShowLocationRequiredModal(false)}
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

      {/* 🔥 MODAL DE ERRO */}
      <Modal
        visible={errorModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setErrorModal({ visible: false, message: '' })}
      >
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalContainer}>
            <View style={[styles.premiumIconContainer, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="warning" size={40} color="#EF4444" />
            </View>
            
            <Text style={styles.premiumModalTitle}>Aviso</Text>
            
            <Text style={styles.premiumModalMessage}>
              {errorModal.message}
            </Text>

            <TouchableOpacity 
              style={[styles.premiumConfirmButton, { width: '100%', flex: 0, marginTop: 16 }]}
              activeOpacity={0.85}
              onPress={() => setErrorModal({ visible: false, message: '' })}
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

      {/* MODAL PREMIUM PARA CANCELAR VIAGEM */}
      <Modal
        visible={cancelModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalContainer}>
            <View style={[styles.premiumIconContainer, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="warning" size={40} color="#EF4444" />
            </View>
            <Text style={styles.premiumModalTitle}>Cancelar Viagem?</Text>
            <Text style={styles.premiumModalMessage}>
              Tem a certeza de que deseja cancelar esta viagem? Esta ação afetará as suas estatísticas e ganhos.
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.premiumConfirmButton, { flex: 1, backgroundColor: '#F3F4F6' }]}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={{ color: '#4B5563', fontWeight: '700', fontSize: 16 }}>Manter Viagem</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.premiumConfirmButton, { flex: 1, backgroundColor: '#EF4444', shadowColor: '#EF4444' }]}
                onPress={confirmCancelTrip}
              >
                <Text style={styles.premiumConfirmButtonText}>Sim, Cancelar</Text>
              </TouchableOpacity>
            </View>
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
    borderRadius: 24,
    marginBottom: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#9333EA',
    elevation: 12,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(216,180,254,0.3)',
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
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  newTripModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  newTripModalContainer: {
    width: "100%",
    backgroundColor: "#F9FAFB",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    paddingBottom: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  newTripModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 20,
    textAlign: "center",
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