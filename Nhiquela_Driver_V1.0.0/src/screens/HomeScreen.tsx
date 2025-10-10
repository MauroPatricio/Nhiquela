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
import { acceptOrderByDeliveryman, getOrdersByStatus, startOrderInTransit } from "../services/orderService";
import * as Location from "expo-location";

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function HomeScreen({ navigation }: any) {
  const [requests, setRequests] = useState<any[]>([]);
  const [acceptedTripId, setAcceptedTripId] = useState<string | null>(null);
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
      console.log("✅ Motorista aprovado, carregando pedidos...");
      loadOrders();
    } else if (isDriverApproved === false) {
      console.log("❌ Motorista NÃO aprovado, não carregará pedidos");
    }

    (async () => {
      try {
        console.log("🔍 Verificando viagem aceita anteriormente...");
        const storedTrip = await AsyncStorage.getItem("acceptedTrip");
        console.log("📦 Viagem armazenada:", storedTrip ? "Encontrada" : "Não encontrada");
        
        if (storedTrip) {
          const trip = JSON.parse(storedTrip);
          console.log("🎯 Restaurando viagem aceita:", trip.id);
          setAcceptedTripId(trip.id);
          setRouteSummary(trip);
          setIsTripStarted(true);
          startBlinkAnimation();
        }
      } catch (error) {
        console.error("❌ Erro ao carregar viagem armazenada:", error);
      }
    })();
  }, [isDriverApproved]);

  const loadOrders = async () => {
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
      const orders = await getOrdersByStatus("available");
      console.log("📦 Pedidos recebidos da API:", orders);
      console.log("📊 Número de pedidos:", orders?.length || 0);

      if (!orders || !Array.isArray(orders)) {
        console.error("❌ Pedidos inválidos ou não é array:", orders);
        setRequests([]);
        setLoadingOrders(false);
        return;
      }

      if (orders.length === 0) {
        console.log("ℹ️ Nenhum pedido disponível no momento");
        setRequests([]);
        setLoadingOrders(false);
        return;
      }

      const formattedRequests = orders.map((order: any, index: number) => {
        console.log(`📝 Processando pedido ${index + 1}:`, order._id);
        
        const destinationLat = parseFloat(order.sellerInfo?.latitude) || 0;
        const destinationLon = parseFloat(order.sellerInfo?.longitude) || 0;
        
        console.log(`📍 Destino do pedido ${order._id}:`, { destinationLat, destinationLon });

        const distance = getDistanceFromLatLonInKm(
          currentPosition.latitude,
          currentPosition.longitude,
          destinationLat,
          destinationLon
        );

        console.log(`📏 Distância calculada para pedido ${order._id}:`, distance, "km");

        const formattedOrder = {
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
        };

        console.log(`✅ Pedido ${order._id} formatado:`, formattedOrder);
        return formattedOrder;
      });

      console.log("🎉 Todos os pedidos formatados:", formattedRequests);
      setRequests(formattedRequests);
      
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
      setAcceptedTripId(tripId);
      
      console.log("🎉 Viagem aceita com sucesso:", tripId);
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
              setIsTripStarted(false);
              setRouteSummary(null);
              blinkAnim.stopAnimation();
              await AsyncStorage.removeItem("acceptedTrip");
              
              console.log("🔄 Estado resetado, viagem cancelada");
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
      
      <TouchableOpacity 
        style={styles.debugButton}
        onPress={async () => {
          console.log("🐛 Debug: Simulando aprovação do motorista");
          await AsyncStorage.setItem("driverApprovalStatus", "approved");
          setIsDriverApproved(true);
        }}
      >
        <Text style={styles.debugText}>[DEBUG] Simular Aprovação</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRequestCard = ({ item }: any) => {
    const isAccepted = acceptedTripId === item.id;
    const isAccepting = acceptingTripId === item.id;
    const isStarting = startingTripId === item.id;

    console.log(`🃏 Renderizando card ${item.id}, aceito: ${isAccepted}`);

    return (
      <View style={styles.requestCard}>
        <View style={styles.requestIcon}>
          <Ionicons name="car-outline" size={28} color="#FFF" />
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
        </View>

        <View style={styles.acceptButtonContainer}>
          {!isAccepted && !acceptedTripId && (
            <TouchableOpacity 
              style={[
                styles.acceptButton,
                isAccepting && styles.disabledButton
              ]} 
              onPress={() => acceptTrip(item.id)}
              disabled={isAccepting}
            >
              {isAccepting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                  <Text style={styles.acceptText}>Aceitar</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {isAccepted && (
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
                      <Text style={styles.acceptText}>Iniciar Viagem</Text>
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

  console.log("🎨 Renderizando HomeScreen com:", {
    isDriverApproved,
    requestsCount: requests.length,
    acceptedTripId,
    loading,
    loadingOrders
  });

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
                  {loadingOrders ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="refresh" size={20} color="#FFF" />
                      <Text style={styles.refreshText}>Recarregar</Text>
                    </>
                  )}
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
  requestIcon: {
    backgroundColor: "#2E86DE",
    borderRadius: 50,
    padding: 10,
    marginRight: 12,
  },
  requestContent: { flex: 1, marginLeft: 12 },
  infoRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  requestInfo: { fontSize: 14, color: "#555", marginLeft: 4 },
  requestTitle: { fontSize: 16, fontWeight: "bold", color: "#222" },
  acceptButtonContainer: { justifyContent: "center", marginLeft: 10 },
  acceptButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2ECC71",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2E86DE",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF4E4E",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  acceptText: { color: "#FFF", fontWeight: "bold", marginLeft: 4 },
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
  debugButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 10,
  },
  debugText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
});