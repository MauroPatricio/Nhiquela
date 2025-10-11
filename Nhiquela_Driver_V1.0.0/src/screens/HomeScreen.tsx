import React, { useState, useEffect } from "react";
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
  getOrdersByStatus, 
  startOrderInTransit
} from "../services/orderService";
import * as Location from "expo-location";

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

// Função temporária para buscar pedido aceite - MOVA ISSO PARA orderService.ts DEPOIS
const getAcceptedOrderByDeliveryman = async (): Promise<any> => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    const API_URL = process.env.API_URL || 'http://localhost:3000';
    
    const response = await fetch(`${API_URL}/api/orders/accepted-by-deliveryman`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Erro ao buscar viagem aceita');
    }
    
    const data = await response.json();
    return data.order;
  } catch (error) {
    console.error('Erro ao buscar viagem aceita:', error);
    return null;
  }
};

export default function HomeScreen({ navigation }: any) {
  const [requests, setRequests] = useState<any[]>([]);
  const [acceptedTripId, setAcceptedTripId] = useState<string | null>(null);
  const [acceptedTrip, setAcceptedTrip] = useState<any>(null);
  const [routeSummary, setRouteSummary] = useState<any>(null);
  const [blinkAnim] = useState(new Animated.Value(0));
  const [isTripStarted, setIsTripStarted] = useState(false);
  const [isDriverApproved, setIsDriverApproved] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [acceptingTripId, setAcceptingTripId] = useState<string | null>(null);
  const [startingTripId, setStartingTripId] = useState<string | null>(null);
  const [cancelingTrip, setCancelingTrip] = useState(false);

  // Função para verificar se o motorista está aprovado
  const checkDriverApproval = async () => {
    try {
      console.log("🔍 Iniciando verificação de aprovação do motorista...");
      
      const driverStatus = await AsyncStorage.getItem("driverApprovalStatus");
      console.log("📋 Status do motorista no AsyncStorage:", driverStatus);
      
      if (driverStatus !== null) {
        const isApproved = driverStatus === "approved";
        console.log("✅ Status definido como:", isApproved);
        setIsDriverApproved(isApproved);
      } else {
        console.log("📝 Status não encontrado, definindo valor padrão...");
        const mockApprovalStatus = true;
        console.log("🔄 Definindo mockApprovalStatus como:", mockApprovalStatus);
        setIsDriverApproved(mockApprovalStatus);
        await AsyncStorage.setItem("driverApprovalStatus", mockApprovalStatus ? "approved" : "pending");
        console.log("💾 Status salvo no AsyncStorage");
      }
    } catch (error) {
      console.error("❌ Erro ao verificar aprovação do motorista:", error);
      setIsDriverApproved(false);
    } finally {
      setLoading(false);
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

  useEffect(() => {
    console.log("🚀 HomeScreen montada - iniciando verificação de aprovação");
    checkDriverApproval();
  }, []);

  useEffect(() => {
    console.log("🔄 Efeito secundário - isDriverApproved:", isDriverApproved);
    
    if (isDriverApproved === true) {
      console.log("✅ Motorista aprovado, verificando viagem aceita...");
      checkAcceptedTrip().then(() => {
        loadOrders();
      });
    } else if (isDriverApproved === false) {
      console.log("❌ Motorista NÃO aprovado, não carregará pedidos");
    }

    // Verificar viagem armazenada localmente
    (async () => {
      try {
        console.log("🔍 Verificando viagem aceita anteriormente...");
        const storedTrip = await AsyncStorage.getItem("acceptedTrip");
        
        if (storedTrip) {
          const trip = JSON.parse(storedTrip);
          console.log("🎯 Restaurando viagem aceita do storage:", trip.id);
          setAcceptedTripId(trip.id);
          setAcceptedTrip(trip);
          setRouteSummary(trip);
          setIsTripStarted(true);
          startBlinkAnimation();
        }
      } catch (error) {
        console.error("❌ Erro ao carregar viagem armazenada:", error);
      }
    })();
  }, [isDriverApproved]);

  // Verificar se há viagem aceita atualmente
  const checkAcceptedTrip = async () => {
    try {
      console.log("🔍 Verificando viagem aceita no servidor...");
      const response = await getAcceptedOrderByDeliveryman();
      
      if (response && response._id) {
        console.log("🎯 Viagem aceita encontrada:", response._id);
        setAcceptedTripId(response._id);
        setAcceptedTrip(response);
        
        // Formatar a viagem aceita para exibição
        const formattedAcceptedTrip = formatOrder(response);
        setRouteSummary(formattedAcceptedTrip);
        setIsTripStarted(response.stepStatus === 4);
        
        if (response.stepStatus === 4) {
          startBlinkAnimation();
        }
        
        await AsyncStorage.setItem("acceptedTrip", JSON.stringify(formattedAcceptedTrip));
      } else {
        console.log("ℹ️ Nenhuma viagem aceita encontrada no servidor");
        // Não limpar dados aqui para manter consistência com storage local
      }
    } catch (error) {
      console.error("❌ Erro ao verificar viagem aceita:", error);
    }
  };

  // Função para formatar um pedido
  const formatOrder = (order: any, currentPosition?: any) => {
    const destinationLat = order.seller?.latitude || order.sellerInfo?.latitude || 0;
    const destinationLon = order.seller?.longitude || order.sellerInfo?.longitude || 0;
    
    let distance = 0;
    if (currentPosition && destinationLat && destinationLon) {
      distance = getDistanceFromLatLonInKm(
        currentPosition.latitude,
        currentPosition.longitude,
        destinationLat,
        destinationLon
      );
    }

    return {
      id: order._id,
      passenger: order.user?.name || "Cliente",
      pickup: order.seller?.address || "Local de origem",
      destination: order.seller?.address || "Destino",
      reward: `MZN ${Math.round(distance * 25)}`,
      distance: `${distance.toFixed(2)} km`,
      time: `${Math.round(distance / 40 * 60)} min`,
      destinationLocation: {
        latitude: destinationLat,
        longitude: destinationLon,
      },
      stepStatus: order.stepStatus,
    };
  };

  const loadOrders = async () => {
    if (loadingOrders) return;
    
    try {
      console.log("📡 Iniciando carregamento de pedidos...");
      setLoadingOrders(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log("📍 Status da permissão de localização:", status);

      if (status !== "granted") {
        console.error("❌ Permissão de localização negada");
        Alert.alert("Erro", "Permissão de localização é necessária");
        setLoadingOrders(false);
        return;
      }

      console.log("📍 Obtendo localização atual...");
      const location = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.High 
      });
      console.log("📌 Localização obtida:", location.coords);

      const currentPosition = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      console.log("🌐 Buscando pedidos disponíveis da API...");
      const availableOrders = await getOrdersByStatus("3");
      console.log("📦 Pedidos disponíveis recebidos:", availableOrders?.length || 0);

      if (!availableOrders || !Array.isArray(availableOrders)) {
        console.error("❌ Pedidos inválidos ou não é array");
        setRequests([]);
        setLoadingOrders(false);
        return;
      }

      // Formatar todos os pedidos disponíveis
      const formattedRequests = availableOrders.map((order: any) => {
        return formatOrder(order, currentPosition);
      });

      console.log("🎉 Pedidos formatados:", formattedRequests.length);
      
      // Se há viagem aceita, colocar ela primeiro na lista
      let sortedRequests = [...formattedRequests];
      if (acceptedTripId) {
        // Encontrar a viagem aceita na lista de disponíveis (se estiver lá)
        const acceptedIndex = sortedRequests.findIndex(req => req.id === acceptedTripId);
        if (acceptedIndex !== -1) {
          // Remover da posição atual e colocar no início
          const [acceptedTrip] = sortedRequests.splice(acceptedIndex, 1);
          sortedRequests.unshift(acceptedTrip);
        } else {
          // Se não está na lista, adicionar manualmente no início
          const acceptedFormatted = formatOrder(acceptedTrip, currentPosition);
          sortedRequests.unshift(acceptedFormatted);
        }
      }
      
      setRequests(sortedRequests);
      
    } catch (error) {
      console.error("❌ Erro ao carregar pedidos:", error);
      Alert.alert("Erro", "Não foi possível carregar as solicitações de viagem");
    } finally {
      setLoadingOrders(false);
      console.log("🏁 Carregamento de pedidos finalizado");
    }
  };

  const startBlinkAnimation = () => {
    console.log("✨ Iniciando animação de piscar");
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  };

  const acceptTrip = async (tripId: string) => {
    try {
      console.log("✅ Aceitando viagem:", tripId);
      setAcceptingTripId(tripId);
      
      await acceptOrderByDeliveryman(tripId);
      
      // Buscar dados atualizados do pedido aceito
      setTimeout(() => {
        checkAcceptedTrip();
        loadOrders();
      }, 1000);
      
      Alert.alert("✅ Viagem aceite", "Clique em iniciar viagem quando estiver com a mercadoria.");
    } catch (error) {
      console.error("❌ Erro ao aceitar viagem:", error);
      Alert.alert("Erro", "Não foi possível aceitar a viagem. Tente novamente.");
    } finally {
      setAcceptingTripId(null);
    }
  };

  const startTrip = (trip: any) => {
    console.log("🚀 Iniciando viagem:", trip.id);
    Alert.alert(
      "Iniciar Viagem",
      "Você já está com a mercadoria? Confirme para iniciar a viagem.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            try {
              console.log("📦 Confirmando início da viagem:", trip.id);
              setStartingTripId(trip.id);
              
              await startOrderInTransit(trip.id);
              setRouteSummary(trip);
              setIsTripStarted(true);
              await AsyncStorage.setItem("acceptedTrip", JSON.stringify(trip));
              
              console.log("💾 Viagem salva no AsyncStorage");
              startBlinkAnimation();
              navigation.navigate("Map", { tripData: trip, isActiveTrip: true });
            } catch (error) {
              console.error("❌ Erro ao iniciar viagem:", error);
              Alert.alert("Erro", "Não foi possível iniciar a viagem.");
            } finally {
              setStartingTripId(null);
            }
          },
        },
      ]
    );
  };

  const cancelTrip = async () => {
    console.log("❌ Cancelando viagem atual");
    Alert.alert(
      "Cancelar Viagem",
      "Deseja realmente cancelar a viagem?",
      [
        { text: "Não", style: "cancel" },
        {
          text: "Sim",
          onPress: async () => {
            try {
              console.log("🗑️ Removendo viagem aceita");
              setCancelingTrip(true);
              
              setAcceptedTripId(null);
              setAcceptedTrip(null);
              setIsTripStarted(false);
              setRouteSummary(null);
              blinkAnim.stopAnimation();
              await AsyncStorage.removeItem("acceptedTrip");
              
              console.log("🔄 Estado resetado, viagem cancelada");
              
              // Recarregar a lista para atualizar a ordem
              loadOrders();
            } catch (error) {
              console.error("❌ Erro ao cancelar viagem:", error);
              Alert.alert("Erro", "Não foi possível cancelar a viagem.");
            } finally {
              setCancelingTrip(false);
            }
          },
        },
      ]
    );
  };

  // Componente para mostrar quando o motorista não está aprovado
  const renderNotApprovedMessage = () => (
    <View style={styles.notApprovedContainer}>
      <Ionicons name="alert-circle-outline" size={64} color={COLORS.warning} />
      <Text style={styles.notApprovedTitle}>
        Aguardando Aprovação
      </Text>
      <Text style={styles.notApprovedSubtitle}>
        Sua conta está em processo de análise. Você poderá visualizar solicitações de entrega após a aprovação.
      </Text>
      <TouchableOpacity 
        style={styles.contactSupportButton}
        onPress={() => {
          console.log("📞 Abrindo suporte");
          Alert.alert("Suporte", "Entre em contato com o suporte para mais informações.");
        }}
      >
        <Text style={styles.contactSupportText}>Entrar em Contato com Suporte</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRequestCard = ({ item, index }: any) => {
    const isAccepted = acceptedTripId === item.id;
    const isAccepting = acceptingTripId === item.id;
    const isStarting = startingTripId === item.id;
    const hasAcceptedTrip = acceptedTripId !== null;

    return (
      <View style={[
        styles.requestCard,
        isAccepted && styles.acceptedCard
      ]}>
        <View style={[
          styles.requestIcon,
          isAccepted && styles.acceptedIcon
        ]}>
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
            <Ionicons
              name="arrow-forward-outline"
              size={16}
              color="#2E86DE"
              style={{ marginHorizontal: 4 }}
            />
            <Text style={styles.requestInfo}>{item.destination}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={16} color="#27AE60" />
            <Text style={styles.requestInfo}>{item.reward}</Text>

            <Ionicons
              name="speedometer-outline"
              size={16}
              color="#2980B9"
              style={{ marginLeft: 10 }}
            />
            <Text style={styles.requestInfo}>{item.distance}</Text>

            <Ionicons
              name="time-outline"
              size={16}
              color="#F39C12"
              style={{ marginLeft: 10 }}
            />
            <Text style={styles.requestInfo}>{item.time}</Text>
          </View>

          {/* Badge de status */}
          {isAccepted && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>
                {isTripStarted ? "Viagem Iniciada" : "Viagem Aceite"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.acceptButtonContainer}>
          {isAccepted ? (
            // Botões para viagem aceita
            <>
              {!isTripStarted && (
                <TouchableOpacity 
                  style={[
                    styles.startButton,
                    isStarting && styles.disabledButton
                  ]} 
                  onPress={() => startTrip(item)}
                  disabled={isStarting}
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
              )}
              <TouchableOpacity 
                style={[
                  styles.cancelButton,
                  cancelingTrip && styles.disabledButton
                ]} 
                onPress={cancelTrip}
                disabled={cancelingTrip}
              >
                {cancelingTrip ? (
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
            // Botão para outras viagens - desabilitado se já há viagem aceita
            <TouchableOpacity 
              style={[
                styles.acceptButton,
                (isAccepting || hasAcceptedTrip) && styles.disabledButton
              ]} 
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

  // Se ainda está carregando o status de aprovação
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
        {/* Banner piscante quando há rota activa */}
        {routeSummary && (
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
            </View>
          </View>
        )}

        {!isDriverApproved ? (
          renderNotApprovedMessage()
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🚗 Solicitações de Viagem</Text>
              <TouchableOpacity 
                style={styles.refreshHeaderButton} 
                onPress={loadOrders}
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
            ) : requests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="car-outline" size={64} color={COLORS.gray} />
                <Text style={styles.emptyText}>Nenhuma solicitação disponível</Text>
                <TouchableOpacity 
                  style={styles.refreshButton} 
                  onPress={loadOrders}
                  disabled={loadingOrders}
                >
                  <Ionicons name="refresh" size={20} color="#FFF" />
                  <Text style={styles.refreshText}>Recarregar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={requests}
                renderItem={renderRequestCard}
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

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: COLORS.gray50 },
  container: { flex: 1, backgroundColor: "#F9FAFB", padding: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: "600" },
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
  },
  routeText: { marginLeft: 12 },
  routeLabel: { fontSize: 14, color: "#FFF", fontWeight: "bold" },
  routeInfo: { fontSize: 16, color: "#FFF" },
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
  acceptedIcon: {
    backgroundColor: "#2ECC71",
  },
  requestContent: { 
    flex: 1, 
    marginLeft: 12,
  },
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
  disabledButton: {
    opacity: 0.6,
  },
  acceptText: { 
    color: "#FFF", 
    fontWeight: "bold", 
    marginLeft: 4,
    fontSize: 12,
  },
  statusBadge: {
    backgroundColor: "#2ECC71",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
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
  contactSupportText: {
    color: "#FFF",
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.gray50,
  },
  loadingOrdersContainer: {
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
  },
  loadingOrdersText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
    marginBottom: 20,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  refreshText: {
    color: "#FFF",
    fontWeight: "bold",
    marginLeft: 8,
  },
});