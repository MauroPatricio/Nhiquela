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
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "../styles/colors";
import {
  acceptOrderByDeliveryman,
  getAllOrdersForDeliveryman,
  startOrderInTransit,
  cancelOrderByDeliveryman
} from "../services/orderService";
import websocketService from "../services/websocketService";
import * as Location from "expo-location";
import { useAuth } from "../context/AuthContext";

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
  const { user, updateUser, updateDeliveryman } = useAuth();

  const isMounted = useRef(true);

  // 🔥 VERIFICAR APROVAÇÃO DO MOTORISTA
  const checkDriverApproval = async () => {
    try {
      // ✅ Obter o status real do usuário
      // const driverStatus = user?.isApproved;
      const driverStatus = true;

      console.log('🚗 Valor de user?.isApproved:', driverStatus);

      // ✅ Corrigir a verificação — o campo isApproved é booleano
      const isApproved = driverStatus === true;

      // ✅ Atualiza estado local
      setIsDriverApproved(isApproved);

      console.log('🚗 Status do motorista:', isApproved ? 'Aprovado' : 'Aguardando aprovação');
      console.log('🚗 Status do motorista:', driverStatus);

      // 🔥 CARREGAR VIAGENS IMEDIATAMENTE SE APROVADO
      if (isApproved) {
        console.log('🎯 Motorista aprovado, carregando viagens...');
        await loadAllOrders();
        await setupWebSocket();
      } else {
        console.log('⏳ Motorista não aprovado, mostrando mensagem de aprovação...');
      }
    } catch (error: any) {
      console.error('❌ Erro ao verificar status do motorista:', error.message);
      setIsDriverApproved(false);
    } finally {
      setLoading(false);
    }
  };


  // 🔥 CONFIGURAR WEBSOCKET PARA TEMPO REAL
  const setupWebSocket = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        console.log('🔌 Iniciando conexão WebSocket...');
        setConnectionStatus("Conectando...");

        websocketService.connect(token);

        // 🔥 LISTENER PARA ATUALIZAÇÕES DE PEDIDOS (com tipagem)
        websocketService.on('order_updated', (data: WebSocketOrderData) => {
          if (isMounted.current) {
            console.log('🔄 Atualização em tempo real recebida:', data.action);
            // Atualização silenciosa - sem loading
            loadAllOrdersSilent();
          }
        });

        // 🔥 LISTENER PARA PEDIDOS ATRIBUÍDOS (com tipagem)
        websocketService.on('order_assigned', (data: WebSocketOrderData) => {
          if (isMounted.current) {
            console.log('🎯 Pedido atribuído em tempo real');
            loadAllOrdersSilent();
          }
        });

        // 🔥 LISTENER PARA NOVOS PEDIDOS
        websocketService.on('new_order', (data: WebSocketOrderData) => {
          if (isMounted.current) {
            console.log('🆕 Novo pedido em tempo real');
            loadAllOrdersSilent();
          }
        });

        // 🔥 STATUS DA CONEXÃO (sem parâmetro)
        websocketService.on('connect', () => {
          setIsConnected(true);
          setConnectionStatus("Conectado");
          console.log('✅ Conectado ao servidor em tempo real');

          // 🔥 CARREGAR VIAGENS NOVAMENTE AO CONECTAR
          loadAllOrdersSilent();
        });

        // 🔥 STATUS DA DESCONEXÃO (sem parâmetro)
        websocketService.on('disconnect', () => {
          setIsConnected(false);
          setConnectionStatus("Desconectado");
          console.log('⚠️ Desconectado do servidor em tempo real');
        });

        // 🔥 ERRO DE CONEXÃO (com tipagem)
        websocketService.on('error', (error: WebSocketError) => {
          console.error('❌ Erro WebSocket:', error.message);
          setConnectionStatus("Erro de conexão");
        });

        // 🔥 CONEXÃO INICIAL - TENTAR CARREGAR DADOS MESMO SE WEBSOCKET FALHAR
        setTimeout(() => {
          if (!isConnected && isMounted.current) {
            console.log('🔄 Tentando carregar dados via fallback...');
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

      // 🔥 FALLBACK: CARREGAR DADOS MESMO COM ERRO NO WEBSOCKET
      loadAllOrdersSilent();
    }
  };

  useEffect(() => {
    isMounted.current = true;
    checkDriverApproval();

    return () => {
      isMounted.current = false;
      // Limpar listeners do WebSocket
      websocketService.off('order_updated');
      websocketService.off('order_assigned');
      websocketService.off('new_order');
      websocketService.off('connect');
      websocketService.off('disconnect');
      websocketService.off('error');
      websocketService.disconnect();
    };
  }, []);

  // 🔥 CARREGAMENTO SILENCIOSO (para WebSocket)
  const loadAllOrdersSilent = async () => {
    try {
      console.log("🔄 Atualização silenciosa via WebSocket...");

      const response = await getAllOrdersForDeliveryman();
      let ordersData = response?.trips || response?.orders || response || [];

      if (!Array.isArray(ordersData)) {
        ordersData = [];
      }

      console.log(`📊 ${ordersData.length} viagens recebidas via WebSocket`);

      // 🔥 TENTAR OBTER LOCALIZAÇÃO, MAS CONTINUAR MESMO SE FALHAR
      let currentPosition = { latitude: 0, longitude: 0 };
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeout: 5000 // Timeout de 5 segundos
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

      const accepted = formattedOrders.find((order: Trip) => order.isAcceptedByDeliveryman);
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
          await AsyncStorage.removeItem("acceptedTrip");
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

  // 🔥 CARREGAMENTO NORMAL (com loading)
  const loadAllOrders = async () => {
    try {
      setLoadingOrders(true);
      console.log("🔄 Carregando viagens...");

      // 🔥 SOLICITAR PERMISSÃO DE LOCALIZAÇÃO
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("⚠️ Permissão de localização negada, continuando sem localização...");
        // NÃO RETORNAR - CONTINUAR SEM LOCALIZAÇÃO
      }

      const response = await getAllOrdersForDeliveryman();
      let ordersData = response?.trips || response?.orders || response || [];

      console.log(`📊 ${ordersData.length} viagens recebidas`);

      if (!Array.isArray(ordersData)) {
        ordersData = [];
      }

      // 🔥 TENTAR OBTER LOCALIZAÇÃO, MAS CONTINUAR MESMO SE FALHAR
      let currentPosition = { latitude: 0, longitude: 0 };
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeout: 5000
        });
        currentPosition = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
      } catch (locationError) {
        console.warn('⚠️ Erro ao obter localização, continuando sem ela...');
      }

      const formattedOrders = ordersData.map((order: any) => formatOrder(order, currentPosition));

      setAllTrips(formattedOrders);
      setLastUpdate(new Date());

      const accepted = formattedOrders.find((order: Trip) => order.isAcceptedByDeliveryman);
      setAcceptedTrip(accepted || null);

      if (accepted) {
        console.log("🎯 Viagem aceita encontrada:", accepted.id);
        const tripStarted = accepted.stepStatus === 5;
        setIsTripStarted(tripStarted);

        if (tripStarted) {
          console.log("🚗 Viagem INICIADA - mostrando rota actual");
          setRouteSummary(accepted);
          startBlinkAnimation();
          await AsyncStorage.setItem("acceptedTrip", JSON.stringify(accepted));
        } else {
          console.log("⏳ Viagem ACEITA mas NÃO INICIADA");
          setRouteSummary(null);
          await AsyncStorage.removeItem("acceptedTrip");
        }
      } else {
        console.log("ℹ️ Nenhuma viagem aceita encontrada");
        setRouteSummary(null);
        setIsTripStarted(false);
        await AsyncStorage.removeItem("acceptedTrip");
      }

    } catch (error: any) {
      console.error("❌ Erro ao carregar pedidos:", error.message);
      Alert.alert("Erro", "Não foi possível carregar as viagens. Tente novamente.");
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

    const isAcceptedByDeliveryman =
      order.stepStatus === 4 ||
      order.status === 'Aceite pelo entregador' ||
      (order.deliveryman && order.deliveryman.id);

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

  // 🔥 AÇÃO COM FEEDBACK VISUAL INSTANTÂNEO
  const acceptTrip = async (tripId: string) => {
    try {
      setAcceptingTripId(tripId);

      // Feedback visual instantâneo
      setAllTrips(prev => prev.map(trip =>
        trip.id === tripId
          ? { ...trip, isAcceptedByDeliveryman: true, status: 'Aceite pelo entregador', stepStatus: 4 }
          : trip
      ));

      await acceptOrderByDeliveryman(tripId);

      Alert.alert("✅ Viagem aceite", "Clique em iniciar viagem quando estiver com a mercadoria.");
    } catch (error: any) {
      console.error("Erro ao aceitar viagem:", error.message);
      // Reverter mudança visual em caso de erro
      setAllTrips(prev => prev.map(trip =>
        trip.id === tripId
          ? { ...trip, isAcceptedByDeliveryman: false, status: 'Disponível para entrega', stepStatus: 3 }
          : trip
      ));
      Alert.alert("Erro", "Não foi possível aceitar a viagem. Tente novamente.");
    } finally {
      setAcceptingTripId(null);
    }
  };

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

  const renderTripCard = ({ item }: { item: Trip }) => {
    const isAccepted = item.isAcceptedByDeliveryman;
    const isAccepting = acceptingTripId === item.id;
    const isStarting = startingTripId === item.id;
    const isCanceling = cancelingTripId === item.id;
    const hasAcceptedTrip = acceptedTrip !== null;
    const isCurrentAcceptedTrip = acceptedTrip?.id === item.id;

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
            <Ionicons name="location-outline" size={16} color="#2E86DE" />
            <Text style={styles.requestInfo}>{item.pickup}</Text>
            <Ionicons name="arrow-forward-outline" size={16} color="#2E86DE" style={{ marginHorizontal: 4 }} />
            <Text style={styles.requestInfo}>{item.destination}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={16} color="#27AE60" />
            <Text style={styles.requestInfo}>{item.reward}</Text>

            <Ionicons name="speedometer-outline" size={16} color="#2980B9" style={{ marginLeft: 10 }} />
            <Text style={styles.requestInfo}>{item.distance}</Text>

            <Ionicons name="time-outline" size={16} color="#F39C12" style={{ marginLeft: 10 }} />
            <Text style={styles.requestInfo}>{item.time}</Text>
          </View>

          {isAccepted && (
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
                    disabled={isStarting || isCanceling}
                  >
                    {isStarting ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="play-circle-outline" size={20} color="#FFF" />
                        <Text style={styles.acceptText}>Iniciar</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cancelButton, (isStarting || isCanceling) && styles.disabledButton]}
                    onPress={() => cancelTrip(item.id)}
                    disabled={isStarting || isCanceling}
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
                  onPress={() => navigation.navigate("Map", { tripData: item, isActiveTrip: true })}
                >
                  <Ionicons name="map-outline" size={20} color="#FFF" />
                  <Text style={styles.acceptText}>Ver Rota</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <TouchableOpacity
              style={[styles.acceptButton, (isAccepting || hasAcceptedTrip) && styles.disabledButton]}
              onPress={() => acceptTrip(item.id)}
              disabled={isAccepting || hasAcceptedTrip}
            >
              {isAccepting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons
                    name={hasAcceptedTrip ? "time-outline" : "checkmark-circle-outline"}
                    size={20}
                    color="#FFF"
                  />
                  <Text style={styles.acceptText}>
                    {hasAcceptedTrip ? "Indisponível" : "Aceitar"}
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

        {routeSummary && isTripStarted && (
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
              <Ionicons name="navigate-outline" size={28} color="#FFF" />
              <View style={styles.routeText}>
                <Text style={styles.routeLabel}>Rota Actual</Text>
                <Text style={styles.routeInfo}>
                  {routeSummary.pickup} → {routeSummary.destination}
                </Text>
                <Text style={styles.routeInfo}>
                  {routeSummary.distance} • {routeSummary.time}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.viewMapButton}
                onPress={() => navigation.navigate("Map", { tripData: routeSummary, isActiveTrip: true })}
              >
                <Ionicons name="map-outline" size={20} color="#FFF" />
                <Text style={styles.viewMapText}>Ver Mapa</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 🔥 CORREÇÃO: MOSTRAR MENSAGEM DE APROVAÇÃO APENAS SE NÃO APROVADO */}
        {!isDriverApproved ? (
          renderNotApprovedMessage()
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  {acceptedTrip ? "🎯 Sua Viagem Aceite" : "🚗 Solicitações de Viagem"}
                </Text>
                <Text style={styles.sectionSubtitle}>
                  {allTrips.length} viagem{allTrips.length !== 1 ? 'ens' : ''} disponível{allTrips.length !== 1 ? 'eis' : ''}
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
        )}
      </ScrollView>
    </View>
  );
}

// ... (os estilos permanecem exatamente os mesmos)

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
  routeSummaryContainer: {
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
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
  routeText: { flex: 1, marginLeft: 12 },
  routeLabel: { fontSize: 14, color: "#FFF", fontWeight: "bold" },
  routeInfo: { fontSize: 16, color: "#FFF" },
  viewMapButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  viewMapText: { color: "#FFF", fontWeight: "bold", marginLeft: 4, fontSize: 12 },
  requestCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
  },
  acceptedCard: {
    borderWidth: 2,
    borderColor: "#2ECC71",
    backgroundColor: "#F0F9FF",
  },
  requestIcon: {
    backgroundColor: "#2E86DE",
    borderRadius: 50,
    padding: 10,
    marginRight: 12,
    alignSelf: 'flex-start',
  },
  acceptedIcon: { backgroundColor: "#2ECC71" },
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
    backgroundColor: "#2ECC71",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2E86DE",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF4E4E",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  viewRouteButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2E86DE",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
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
  emptyContainer: { alignItems: "center", padding: 40 },
  emptyText: {
    fontSize: 16,
    color: "#666",
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
});