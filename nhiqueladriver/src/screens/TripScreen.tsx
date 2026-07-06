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
  Modal,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { COLORS } from "../styles/colors";
import { getTripsHistory } from "../services/tripService";
import { useAuth } from '../context/AuthContext';

export default function TripScreen({ navigation }: any) {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [isDriverApproved, setIsDriverApproved] = useState<boolean | null>(null);
  const { user } = useAuth();

  // 🔍 Verificar aprovação do motorista
  const checkDriverApproval = async () => {
    try {
      const driverStatus = await AsyncStorage.getItem("driverApprovalStatus");
      if (driverStatus !== null) {
        setIsDriverApproved(driverStatus === "approved");
      } else {
        const mockApprovalStatus = true;
        setIsDriverApproved(mockApprovalStatus);
        await AsyncStorage.setItem(
          "driverApprovalStatus",
          mockApprovalStatus ? "approved" : "pending"
        );
      }
    } catch (error) {
      console.error("Erro ao verificar aprovação do motorista:", error);
      setIsDriverApproved(false);
    }
  };

  // 🚀 Carregar histórico de viagens da API
  const loadTripsHistory = async () => {
    setLoading(true);
    try {
      if (!user?._id) {
        console.error("User ID não encontrado");
        setLoading(false);
        return;
      }

      const apiResponse = await getTripsHistory(user._id);
      const apiTrips = apiResponse.orders || [];

      if (!Array.isArray(apiTrips)) {
        setTrips([]);
        setLoading(false);
        return;
      }

      if (apiTrips.length === 0) {
        setTrips([]);
        setLoading(false);
        return;
      }

      // 🔹 FORMATAR HISTÓRICO DE VIAGENS (Misto de Orders e RequestServices)
      const formattedTrips = apiTrips.map((trip: any) => {
        const isRequestService = trip.type === 'requestService';
        
        const distance = trip.distance || 0;
        
        let status = "Concluída";
        let statusColor = "#27AE60";
        let statusIcon = "checkmark-circle";
        
        const tripStatus = trip.status ? trip.status.toLowerCase() : "";
        if (trip.isCanceled || tripStatus === "cancelado" || tripStatus === "cancelled" || tripStatus === "rejected") {
          status = "Cancelada";
          statusColor = "#FF4E4E";
          statusIcon = "close-circle";
        } else if (trip.isInTransit || tripStatus === "em andamento" || tripStatus === "pending" || tripStatus === "accepted") {
          status = "Em Andamento";
          statusColor = "#F39C12";
          statusIcon = "time";
        }

        let tripDate = "Data não disponível";
        if (trip.createdAt) {
          const date = new Date(trip.createdAt);
          tripDate = date.toLocaleDateString('pt-BR') + " " + date.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
        }

        let passengerName = "Passageiro";
        let pickupLoc = "Origem";
        let destLoc = "Destino";
        let rewardPrice = 0;

        if (isRequestService) {
          passengerName = trip.name || trip.user?.name || "Passageiro";
          pickupLoc = trip.origin || "Local de Partida";
          destLoc = trip.destination || "Destino";
          rewardPrice = trip.deliveryPrice || trip.pricetopay || 0;
        } else {
          passengerName = trip.user?.name || "Cliente";
          pickupLoc = trip.sellers?.[0]?.name || trip.orderItems?.[0]?.seller || "Loja/Fornecedor";
          destLoc = trip.deliveryAddress?.address || trip.deliveryAddress?.city || "Endereço do Cliente";
          rewardPrice = trip.deliveryPrice || trip.totalPrice || 0;
        }

        return {
          id: trip.id || trip._id || Math.random().toString(),
          passengerId: trip.user?._id || trip.user?.id || trip.user || trip.userId || trip.client || "Não disponível",
          type: isRequestService ? (trip.name && !trip.name.match(/^[0-9a-fA-F]{24}$/) ? trip.name : (trip.goodType || "Serviço")) : "Pedido de Loja",
          passenger: passengerName,
          pickup: pickupLoc,
          destination: destLoc,
          reward: rewardPrice > 0 ? `MT ${rewardPrice}` : `MT ${Math.round(distance * 25)}`,
          distance: distance ? `${distance.toFixed(2)} km` : "Distância não disponível",
          time: tripDate,
          status: status,
          statusColor: statusColor,
          statusIcon: statusIcon,
        };
      });

      setTrips(formattedTrips);
    } catch (error) {
      console.error("Erro ao carregar histórico de viagens:", error);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 VER DETALHES DA VIAGEM
  const viewTripDetails = (trip: any) => {
    setSelectedTrip(trip);
  };

  // 🔹 COMPARTILHAR DETALHES DA VIAGEM
  const shareTripDetails = (trip: any) => {
    Alert.alert(
      "Compartilhar Viagem",
      `Detalhes da viagem com ${trip.passenger} copiados para a área de transferência.`,
      [{ text: "OK", style: "default" }]
    );
  };

  useEffect(() => {
    checkDriverApproval();
  }, []);

  useEffect(() => {
    loadTripsHistory();
  }, [isDriverApproved]);

  const renderNotApprovedMessage = () => (
    <View style={styles.notApprovedContainer}>
      <Ionicons name="alert-circle-outline" size={64} color={COLORS.warning} />
      <Text style={styles.notApprovedTitle}>
        Sua conta ainda não foi aprovada
      </Text>
      <Text style={styles.notApprovedSubtitle}>
        Aguarde a aprovação da sua conta para visualizar o histórico de viagens.
      </Text>
    </View>
  );

  const renderEmptyHistory = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="time-outline" size={64} color={COLORS.gray} />
      <Text style={styles.emptyTitle}>Nenhuma viagem no histórico</Text>
      <Text style={styles.emptySubtitle}>
        Você ainda não realizou nenhuma viagem. As viagens concluídas aparecerão aqui.
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadTripsHistory}>
        <Ionicons name="refresh-outline" size={20} color="#FFF" />
        <Text style={styles.retryText}>Recarregar</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTripCard = ({ item }: any) => {
    return (
      <TouchableOpacity 
        style={styles.tripCard}
        onPress={() => viewTripDetails(item)}
        onLongPress={() => shareTripDetails(item)}
      >
        <View style={styles.tripHeader}>
          <View style={styles.passengerInfo}>
            <Ionicons name="person-circle-outline" size={24} color={COLORS.primary} />
            <Text style={styles.passengerName}>{item.passenger}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: item.statusColor }]}>
            <Ionicons name={item.statusIcon} size={14} color="#FFF" />
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.routeInfo}>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color="#27AE60" />
            <Text style={styles.locationText}>{item.pickup}</Text>
          </View>
          <View style={styles.arrowRow}>
            <Ionicons name="arrow-down-outline" size={16} color="#666" />
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="flag-outline" size={16} color="#FF4E4E" />
            <Text style={styles.locationText}>{item.destination}</Text>
          </View>
        </View>

        <View style={styles.tripFooter}>
          <View style={styles.infoItem}>
            <Ionicons name="cash-outline" size={14} color="#27AE60" />
            <Text style={styles.infoText}>{item.reward}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="speedometer-outline" size={14} color="#2980B9" />
            <Text style={styles.infoText}>{item.distance}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={14} color="#F39C12" />
            <Text style={styles.infoText}>{item.time}</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.detailButton}
            onPress={() => viewTripDetails(item)}
          >
            <Ionicons name="eye-outline" size={16} color={COLORS.primary} />
            <Text style={styles.detailButtonText}>Detalhes</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={() => shareTripDetails(item)}
          >
            <Ionicons name="share-outline" size={16} color="#666" />
            <Text style={styles.shareButtonText}>Compartilhar</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (isDriverApproved === null) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Verificando status da conta...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadTripsHistory}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        <>
          <View style={styles.header}>
            <Text style={styles.sectionTitle}>Histórico de Viagens</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={loadTripsHistory}>
              <Ionicons name="refresh-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.sectionSubtitle}>
            {trips.length > 0 
              ? `${trips.length} viagem${trips.length > 1 ? 's' : ''} encontrada${trips.length > 1 ? 's' : ''}` 
              : "Suas viagens aparecerão aqui"}
          </Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <Ionicons name="time-outline" size={48} color={COLORS.gray} />
              <Text style={styles.loadingText}>Carregando histórico...</Text>
            </View>
          ) : trips.length === 0 ? (
            renderEmptyHistory()
          ) : (
            <FlatList
              data={trips}
              renderItem={renderTripCard}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      </ScrollView>

      {/* 🔥 MODAL DE DETALHES DA VIAGEM PREMIUM */}
      <Modal visible={selectedTrip !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedTrip && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Detalhes da Viagem</Text>
                  <TouchableOpacity onPress={() => setSelectedTrip(null)} style={styles.closeModalButton}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                  <View style={styles.modalSection}>
                    <View style={styles.modalRow}>
                      <Ionicons name="cube-outline" size={20} color={COLORS.primary} />
                      <Text style={styles.modalTextBold}>{selectedTrip.type}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: selectedTrip.statusColor, alignSelf: 'flex-start', marginTop: 10 }]}>
                      <Ionicons name={selectedTrip.statusIcon} size={14} color="#FFF" />
                      <Text style={styles.statusText}>{selectedTrip.status}</Text>
                    </View>
                  </View>

                  <View style={styles.modalDivider} />

                  <View style={styles.modalSection}>
                    <View style={styles.modalRow}>
                      <Ionicons name="person-circle-outline" size={24} color={COLORS.primary} />
                      <Text style={styles.modalTextTitle}>Passageiro/Cliente</Text>
                    </View>
                    <Text style={styles.modalTextValue}>{selectedTrip.passenger}</Text>
                    <Text style={{ fontSize: 12, color: "#9CA3AF", marginLeft: 32, marginTop: 2 }}>ID: {selectedTrip.passengerId}</Text>
                  </View>

                  <View style={styles.modalDivider} />

                  <View style={styles.modalSection}>
                    <View style={styles.locationTimeline}>
                      <View style={styles.locationDot} />
                      <View style={styles.locationLine} />
                      <View style={[styles.locationDot, { backgroundColor: '#E74C3C' }]} />
                    </View>
                    <View style={styles.locationDetails}>
                      <View style={styles.locationItem}>
                        <Text style={styles.modalLocationLabel}>Origem</Text>
                        <Text style={styles.modalLocationText}>{selectedTrip.pickup}</Text>
                      </View>
                      <View style={[styles.locationItem, { marginTop: 15 }]}>
                        <Text style={styles.modalLocationLabel}>Destino</Text>
                        <Text style={styles.modalLocationText}>{selectedTrip.destination}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.modalDivider} />

                  <View style={styles.modalGrid}>
                    <View style={styles.modalGridItem}>
                      <Ionicons name="cash-outline" size={22} color="#2ECC71" />
                      <Text style={styles.modalGridLabel}>Valor</Text>
                      <Text style={styles.modalGridValue}>{selectedTrip.reward}</Text>
                    </View>
                    <View style={styles.modalGridItem}>
                      <Ionicons name="speedometer-outline" size={22} color="#3498DB" />
                      <Text style={styles.modalGridLabel}>Distância</Text>
                      <Text style={styles.modalGridValue}>{selectedTrip.distance}</Text>
                    </View>
                    <View style={styles.modalGridItem}>
                      <Ionicons name="calendar-outline" size={22} color="#F39C12" />
                      <Text style={styles.modalGridLabel}>Data</Text>
                      <Text style={styles.modalGridValue} numberOfLines={2} adjustsFontSizeToFit>{selectedTrip.time}</Text>
                    </View>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: COLORS.gray50, paddingTop: 45 },
  container: { flex: 1, padding: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: { 
    fontSize: 26, 
    fontWeight: "800", 
    color: '#9D4EDD',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 20,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
  },
  tripCard: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 24,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  tripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 12,
  },
  passengerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  passengerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginLeft: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statusText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  routeInfo: {
    marginVertical: 12,
    paddingHorizontal: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  arrowRow: {
    alignItems: "flex-start",
    marginLeft: 6,
    marginVertical: -8,
  },
  locationText: {
    fontSize: 15,
    color: "#4B5563",
    marginLeft: 10,
    fontWeight: "500",
    flex: 1,
  },
  locationDivider: {
    width: 2,
    height: 16,
    backgroundColor: "#E5E7EB",
    marginLeft: 7,
    marginVertical: -8,
  },
  tripFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 4,
  },
  
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(127, 0, 255, 0.1)",
  },
  detailButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.primary,
    marginLeft: 4,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.gray100,
  },
  shareButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.gray,
    marginLeft: 4,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: { 
    fontSize: 16, 
    color: COLORS.gray,
    marginTop: 12,
  },
  emptyContainer: {
    backgroundColor: "#FFF",
    padding: 30,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    color: COLORS.black,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    color: COLORS.gray,
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: "#FFF",
    fontWeight: "bold",
    marginLeft: 8,
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
    color: COLORS.black,
    marginTop: 16,
    marginBottom: 8,
  },
  notApprovedSubtitle: {
    fontSize: 14,
    textAlign: "center",
    color: COLORS.gray,
    lineHeight: 20,
  },
  // 🔥 PREMIUM MODAL CSS
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    minHeight: '60%',
    maxHeight: '85%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1F2937",
  },
  closeModalButton: {
    padding: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
  },
  modalContent: {
    marginTop: 10,
  },
  modalSection: {
    marginBottom: 5,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalTextBold: {
    fontSize: 18,
    fontWeight: "700",
    color: "#374151",
    marginLeft: 10,
  },
  modalTextTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginLeft: 8,
  },
  modalTextValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 8,
    marginLeft: 32,
  },
  modalDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 20,
  },
  locationTimeline: {
    width: 20,
    alignItems: "center",
    marginRight: 15,
    position: "absolute",
    top: 5,
    bottom: 5,
    left: 0,
  },
  locationDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#2ECC71",
    borderWidth: 3,
    borderColor: "#E5E7EB",
  },
  locationLine: {
    flex: 1,
    width: 2,
    backgroundColor: "#E5E7EB",
    marginVertical: 4,
  },
  locationDetails: {
    marginLeft: 35,
  },
  locationItem: {
    marginBottom: 5,
  },
  modalLocationLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  modalLocationText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
    lineHeight: 22,
  },
  modalGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
  },
  modalGridItem: {
    flex: 1,
    alignItems: "center",
  },
  modalGridLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
    marginBottom: 4,
  },
  modalGridValue: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1F2937",
    textAlign: "center",
  },
});
