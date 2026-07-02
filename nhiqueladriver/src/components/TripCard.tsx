import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../styles/colors";
import { Trip } from "../types";

type Props = {
  item: Trip;
  acceptingTripId: string | null;
  startingTripId: string | null;
  cancelingTripId: string | null;
  acceptedTrip: Trip | null;
  isSharingLocation: boolean;
  isTripStarted: boolean;
  startTrip: (item: Trip) => void;
  cancelTrip: (id: string) => void;
  acceptTrip: (id: string, isDelivery?: boolean) => void;
  onViewRoute: (item: Trip) => void;
};

const TripCard = React.memo(function TripCard({
  item,
  acceptingTripId,
  startingTripId,
  cancelingTripId,
  acceptedTrip,
  isSharingLocation,
  isTripStarted,
  startTrip,
  cancelTrip,
  acceptTrip,
  onViewRoute
}: Props) {
  const isAccepted = item.isAcceptedByDeliveryman;
  const isAccepting = acceptingTripId === item.id;
  const isStarting = startingTripId === item.id;
  const isCanceling = cancelingTripId === item.id;
  const hasAcceptedTrip = acceptedTrip !== null;
  const isCurrentAcceptedTrip = acceptedTrip?.id === item.id;
  
  // 🔥 VERIFICAR SE É UM PEDIDO EM TRÂNSITO (STATUS 5)
  const isInTransit = item.stepStatus === 5;

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={() => onViewRoute(item)}
      style={[styles.requestCard, isAccepted && styles.acceptedCard]}
    >
      <View style={[styles.requestIcon, isAccepted && styles.acceptedIcon]}>
        <Ionicons
          name={isAccepted ? "checkmark-circle" : "car-outline"}
          size={28}
          color="#FFF"
        />
      </View>

      <View style={styles.requestContent}>
        <Text style={styles.requestTitle}>{item.passenger}</Text>
        
        {isAccepted && item.passengerPhone && (
          <Text style={[styles.requestInfo, { marginBottom: 8, color: '#666' }]}>
            Tel: {item.passengerPhone}
          </Text>
        )}

        {isAccepted && item.passengerId && (
          <TouchableOpacity 
            style={[styles.infoRow, { alignItems: 'center', justifyContent: 'center', paddingVertical: 8, backgroundColor: COLORS.primary + '10', borderRadius: 8, marginTop: 4, marginBottom: 8 }]}
            onPress={() => {
              const phoneStr = typeof item.passengerPhone === 'string' ? item.passengerPhone.replace(/\D/g, '') : '840000000';
              Linking.openURL(`tel:${phoneStr}`).catch(() => {});
            }}
          >
            <Ionicons name="call-outline" size={18} color={COLORS.primary} />
            <Text style={[styles.requestInfo, { color: COLORS.primary, marginLeft: 8, fontWeight: 'bold' }]}>
              Ligar para o cliente
            </Text>
          </TouchableOpacity>
        )}

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
                  disabled={isStarting || isCanceling || isInTransit}
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
                  disabled={isStarting || isCanceling || isInTransit}
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
                onPress={() => onViewRoute(item)}
              >
                <Ionicons name="map-outline" size={20} color="#FFF" />
                <Text style={styles.acceptText}>Ver Rota</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <TouchableOpacity
            style={[styles.acceptButton, (isAccepting || hasAcceptedTrip || isInTransit) && styles.disabledButton]}
            onPress={() => acceptTrip(item.id, item.originalData?.goodType !== undefined)}
            disabled={isAccepting || hasAcceptedTrip || isInTransit}
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
      </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  requestCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.1)',
  },
  acceptedCard: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: "#FDFBFF",
  },
  requestIcon: {
    backgroundColor: "rgba(147, 51, 234, 0.08)",
    borderRadius: 16,
    padding: 14,
    marginRight: 16,
    alignSelf: 'flex-start',
  },
  acceptedIcon: { 
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  requestContent: { flex: 1, marginLeft: 12 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  requestInfo: { fontSize: 14, color: "#4B5563", marginLeft: 6, fontWeight: "500" },
  requestTitle: { fontSize: 17, fontWeight: "800", color: "#111827", marginBottom: 6, letterSpacing: -0.3 },
  acceptButtonContainer: {
    justifyContent: "center",
    marginLeft: 10,
    minWidth: 110,
  },
  acceptButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  viewRouteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: { opacity: 0.5 },
  acceptText: {
    color: "#FFF",
    fontWeight: "800",
    marginLeft: 6,
    fontSize: 13,
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
  transitStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3498DB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 2,
  },
  transitStatusText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
    marginLeft: 4,
  },
  locationSharingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2ECC71",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  locationSharingText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
    marginLeft: 4,
  },
});

export default TripCard;
