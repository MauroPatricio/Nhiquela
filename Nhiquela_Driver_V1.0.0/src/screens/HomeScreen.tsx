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

const tripRequests = [
  {
    id: "1",
    passenger: "João Silva",
    pickup: "Mercado Central",
    destination: "Aeroporto Internacional",
    reward: "MZN 1 200,00",
    distance: "15 km",
    time: "25 min",
    destinationLocation: { latitude: -25.9369, longitude: 32.4586 },
  },
  {
    id: "2",
    passenger: "Maria Costa",
    pickup: "Praia Nova",
    destination: "Shopping Cidade",
    reward: "MZN 850,00",
    distance: "10 km",
    time: "18 min",
    destinationLocation: { latitude: -25.8244, longitude: 32.5834 },
  },
  {
    id: "3",
    passenger: "Carlos Mendes",
    pickup: "Universidade",
    destination: "Hospital Central",
    reward: "MZN 1 500,00",
    distance: "20 km",
    time: "30 min",
    destinationLocation: { latitude: -25.8571, longitude: 32.5291 },
  },
];

export default function HomeScreen({ navigation }: any) {
  const [requests, setRequests] = useState<any[]>([]);
  const [acceptedTripId, setAcceptedTripId] = useState<string | null>(null);
  const [routeSummary, setRouteSummary] = useState<any>(null);
  const [blinkAnim] = useState(new Animated.Value(0));
  const [isTripStarted, setIsTripStarted] = useState(false);
  const [isDriverApproved, setIsDriverApproved] = useState<boolean | null>(null);

  // Função para verificar se o motorista está aprovado
  const checkDriverApproval = async () => {
    try {
      // Aqui você deve buscar a informação de aprovação do motorista
      // Pode ser do AsyncStorage, API, ou contexto da aplicação
      const driverStatus = await AsyncStorage.getItem("driverApprovalStatus");
      
      // Se não existir no AsyncStorage, você pode buscar de uma API
      if (driverStatus !== null) {
        setIsDriverApproved(driverStatus === "approved");
      } else {
        // Simulação - substitua por sua lógica real de verificação
        // Por exemplo, buscar do seu backend
        const mockApprovalStatus = false; // Altere para true para testar motorista aprovado
        setIsDriverApproved(mockApprovalStatus);
        await AsyncStorage.setItem("driverApprovalStatus", mockApprovalStatus ? "approved" : "pending");
      }
    } catch (error) {
      console.error("Erro ao verificar aprovação do motorista:", error);
      setIsDriverApproved(false);
    }
  };

  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // raio da Terra em km
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
    // Verificar aprovação do motorista primeiro
    checkDriverApproval();
  }, []);

  useEffect(() => {
    // Só carregar pedidos se o motorista estiver aprovado
    if (isDriverApproved) {
      loadOrders();
    }

    (async () => {
      const storedTrip = await AsyncStorage.getItem("acceptedTrip");
      if (storedTrip) {
        const trip = JSON.parse(storedTrip);
        setAcceptedTripId(trip.id);
        setRouteSummary(trip);
        setIsTripStarted(true);
        startBlinkAnimation();
      }
    })();
  }, [isDriverApproved]);

  const loadOrders = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        console.error("Permissão de localização negada");
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const currentPosition = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      const orders = await getOrdersByStatus("available");

      setRequests(
        orders.map((order: any) => {
          const destinationLat = parseFloat(order.sellerInfo?.latitude) || 0;
          const destinationLon = parseFloat(order.sellerInfo?.longitude) || 0;

          const distance = getDistanceFromLatLonInKm(
            currentPosition.latitude,
            currentPosition.longitude,
            destinationLat,
            destinationLon
          );

          return {
            id: order._id,
            passenger: order.user?.name || "Cliente",
            pickup: order.seller?.address || "Local de origem",
            destination: order.seller?.address || "Destino",
            reward: `MZN ${Math.round(distance * 25)}`, // 25 MZN por km
            distance: `${distance.toFixed(2)} km`,
            time: `${Math.round(distance / 40 * 60)} min`, // assumindo velocidade média = 40km/h
            destinationLocation: {
              latitude: destinationLat,
              longitude: destinationLon,
            },
          };
        })
      );
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error);
    }
  };

  const startBlinkAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  };

  const acceptTrip = async (tripId: string) => {
    try {
      await acceptOrderByDeliveryman(tripId);
      setAcceptedTripId(tripId);
      Alert.alert("✅ Viagem aceite", "Clique em iniciar viagem quando estiver com a mercadoria.");
    } catch (error) {
      console.error("Erro ao aceitar viagem:", error);
      Alert.alert("Erro", "Não foi possível aceitar a viagem. Tente novamente.");
    }
  };

  const startTrip = (trip: any) => {
    Alert.alert(
      "Iniciar Viagem",
      "Você já está com a mercadoria? Confirme para iniciar a viagem.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            try {
              await startOrderInTransit(trip.id);
              setRouteSummary(trip);
              setIsTripStarted(true);
              await AsyncStorage.setItem("acceptedTrip", JSON.stringify(trip));
              startBlinkAnimation();
              navigation.navigate("Map", { tripData: trip, isActiveTrip: true });
            } catch (error) {
              console.error("Erro ao iniciar viagem:", error);
              Alert.alert("Erro", "Não foi possível iniciar a viagem.");
            }
          },
        },
      ]
    );
  };
  

  const cancelTrip = async () => {
    Alert.alert(
      "Cancelar Viagem",
      "Deseja realmente cancelar a viagem?",
      [
        { text: "Não", style: "cancel" },
        {
          text: "Sim",
          onPress: async () => {
            setAcceptedTripId(null);
            setIsTripStarted(false);
            setRouteSummary(null);
            blinkAnim.stopAnimation();
            await AsyncStorage.removeItem("acceptedTrip");
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
        Não é possível visualizar novas Solicitações de Entrega antes da aprovação
      </Text>
      <Text style={styles.notApprovedSubtitle}>
        Aguarde a aprovação da sua conta para começar a receber solicitações de viagem.
      </Text>
      <TouchableOpacity 
        style={styles.contactSupportButton}
        onPress={() => {
          // Navegar para suporte ou abrir modal de contato
          Alert.alert("Suporte", "Entre em contato com o suporte para mais informações.");
        }}
      >
        <Text style={styles.contactSupportText}>Entrar em Contato com Suporte</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRequestCard = ({ item }: any) => {
    const isAccepted = acceptedTripId === item.id;
    const isStarted = acceptedTripId === item.id;

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
            <TouchableOpacity style={styles.acceptButton} onPress={() => acceptTrip(item.id)}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
              <Text style={styles.acceptText}>Aceitar</Text>
            </TouchableOpacity>
          )}

          {isAccepted && (
            <>
              {!isTripStarted && (
                <TouchableOpacity style={styles.startButton} onPress={() => startTrip(item)}>
                  <Ionicons name="play-circle-outline" size={20} color="#FFF" />
                  <Text style={styles.acceptText}>Iniciar Viagem</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.cancelButton} onPress={cancelTrip}>
                <Ionicons name="close-circle-outline" size={20} color="#FFF" />
                <Text style={styles.acceptText}>Cancelar Viagem</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  // Se ainda está carregando o status de aprovação
  if (isDriverApproved === null) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Verificando status da conta...</Text>
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

        {/* Mostrar mensagem de não aprovado ou solicitações de viagem */}
        {!isDriverApproved ? (
          renderNotApprovedMessage()
        ) : (
          <>
            <Text style={styles.sectionTitle}>🚗 Solicitações de Viagem</Text>
            <FlatList
              data={requests}
              renderItem={renderRequestCard}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: COLORS.gray50 },
  container: { flex: 1, backgroundColor: "#F9FAFB", padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: "600", marginBottom: 10 },
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
  acceptText: { color: "#FFF", fontWeight: "bold", marginLeft: 4 },
  // Novos estilos para a mensagem de não aprovado
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
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
});