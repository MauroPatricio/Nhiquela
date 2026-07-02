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
} from "react-native";
import { Image } from "expo-image";
import { Audio } from "expo-av";
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
  const [loadTripsError, setLoadTripsError] = useState<string | null>(null);
  const [acceptingTripId, setAcceptingTripId] = useState<string | null>(null);
  const [startingTripId, setStartingTripId] = useState<string | null>(null);
  const [cancelingTripId, setCancelingTripId] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // --- ADDED FOR NEW ORDER RINGTONE ---
  const [ringtoneSound, setRingtoneSound] = useState<Audio.Sound | null>(null);
  const ringtoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [incomingOrder, setIncomingOrder] = useState<any>(null);

  const startRingtone = async (order: any) => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=classic-phone-ring-99705.mp3' },
        { shouldPlay: true, isLooping: true }
      );
      setRingtoneSound(sound);
      setIncomingOrder(order);
      
      // Auto-reject after 30 seconds
      if (ringtoneTimerRef.current) clearTimeout(ringtoneTimerRef.current);
      ringtoneTimerRef.current = setTimeout(() => {
         stopRingtone();
         handleRejectOrder(order.id);
      }, 30000);
    } catch (error) {
      console.log('Error playing ringtone:', error);
    }
  };

  const stopRingtone = async () => {
    if (ringtoneTimerRef.current) {
      clearTimeout(ringtoneTimerRef.current);
      ringtoneTimerRef.current = null;
    }
    if (ringtoneSound) {
      await ringtoneSound.stopAsync();
      await ringtoneSound.unloadAsync();
      setRingtoneSound(null);
    }
    setIncomingOrder(null);
  };

  const handleRejectOrder = async (orderId: string) => {
    try {
       const token = await AsyncStorage.getItem("userToken");
       await fetch(`${API_BASE_URL}/api/request-deliver/${orderId}/reject`, {
         method: 'PUT',
         headers: {
            'Authorization': `Bearer ${token}`
         }
       });
       setAllTrips(prev => prev.filter(t => t.id !== orderId));
       stopRingtone();
    } catch (e) {
       console.log('Error rejecting order', e);
    }
  };
  // ------------------------------------
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Conectando...");
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  
  const [isToggling, setIsToggling] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceMessage, setBalanceMessage] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { user, updateUser, updateDeliveryman } = useAuth();

  // Load alert sound
  useEffect(() => {
    let soundObj: Audio.Sound | null = null;
    async function loadSound() {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/sounds/alert.ogg')
        );
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
      } else {
        alertSound.stopAsync();
      }
    }
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

        websocketService.connect(token);

        // 🔥 OTIMIZAÇÃO DE WEBSOCKET: Processa payload direto sem refetch
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
            
            // Check if it's a new pending order that is specifically assigned to me via targetDriverId
            // The WS event is just 'new_order'. If it's pending (stepStatus === 3) and no accepted trip yet:
            if (newFormattedOrder.stepStatus === 3 && !acceptedTrip) {
               // Only trigger if we aren't already ringing for it
               if (!incomingOrder || incomingOrder.id !== newFormattedOrder.id) {
                  startRingtone(newFormattedOrder);
               }
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  messageBox: {
    flexDirection: 'row',
    backgroundColor: '#FDF2E9',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F39C12',
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
});
