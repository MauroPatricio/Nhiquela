import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Dimensions, Image, Animated } from "react-native";
import { API_BASE_URL } from "../api/apiConfig";

const getImageUrl = (path?: string) => {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('data:image')) return path;
  const baseUrl = API_BASE_URL.replace('/api', '');
  return path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
};
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
  onExpire?: (id: string) => void;
};

const { width } = Dimensions.get('window');

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
  onViewRoute,
  onExpire
}: Props) {
  const isCurrentAcceptedTrip = acceptedTrip?.id === item.id;
  const isAccepted = item.isAcceptedByDeliveryman || isCurrentAcceptedTrip;
  const isAccepting = acceptingTripId === item.id;
  const isStarting = startingTripId === item.id;
  const isCanceling = cancelingTripId === item.id;
  const hasAcceptedTrip = acceptedTrip !== null;
  const isInTransit = item.stepStatus === 5;
  const imageUrl = getImageUrl(item.passengerImage);

  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (isAccepted || hasAcceptedTrip || isInTransit) return;
    
    if (timeLeft <= 0) {
      if (onExpire) onExpire(item.id);
      return;
    }
    
    const timerId = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    
    return () => clearInterval(timerId);
  }, [timeLeft, isAccepted, hasAcceptedTrip, isInTransit, item.id, onExpire]);

  const progressWidth = (timeLeft / 30) * 100;

  return (
    <TouchableOpacity 
      activeOpacity={0.95} 
      onPress={() => onViewRoute(item)}
      style={[styles.card, isAccepted && styles.cardAcceptedOuter]}
    >
      {/* If accepted, we wrap everything in a premium gradient */}
      <View style={[isAccepted ? styles.cardAcceptedInner : { padding: 20 }]}>
        {isAccepted && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 24, overflow: 'hidden' }}>
            <LinearGradient
              colors={['rgba(242, 240, 255, 0.9)', 'rgba(233, 213, 255, 0.4)']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ flex: 1 }}
            />
          </View>
        )}
        <View style={isAccepted ? { padding: 20 } : {}}>
          {/* Header Profile / Status */}
          <View style={styles.header}>
        <View style={styles.profileSection}>
          <View style={[styles.avatar, isAccepted && styles.avatarAccepted]}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.avatarImage} />
            ) : (
              <Ionicons
                name={isAccepted ? "checkmark" : "person"}
                size={22}
                color={isAccepted ? "#FFF" : COLORS.primary}
              />
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.passengerName} numberOfLines={1}>
              {item.serviceName ? `${item.serviceName} - ${item.passenger}` : item.passenger}
            </Text>
            {item.serviceMotive && (
              <Text style={styles.serviceMotive} numberOfLines={1}>
                Motivo: {item.serviceMotive}
              </Text>
            )}
            
            <View style={styles.badgesContainer}>
              {isInTransit && (
                <View style={[styles.badge, { backgroundColor: "#3498DB" }]}>
                  <Ionicons name="flash" size={10} color="#FFF" />
                  <Text style={styles.badgeText}>EM TRÂNSITO</Text>
                </View>
              )}
              {isAccepted && !isInTransit && (
                <View style={[styles.badge, { backgroundColor: (isTripStarted && isCurrentAcceptedTrip) ? "#2ECC71" : "#F39C12" }]}>
                  <Text style={styles.badgeText}>
                    {isTripStarted && isCurrentAcceptedTrip ? "INICIADA" : "ACEITE"}
                  </Text>
                </View>
              )}
              {isAccepted && isSharingLocation && (
                <View style={[styles.badge, { backgroundColor: "#9B59B6" }]}>
                  <Ionicons name="location" size={10} color="#FFF" />
                  <Text style={styles.badgeText}>PARTILHANDO</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {isAccepted && item.passengerPhone && (
          <TouchableOpacity 
            style={styles.callButton}
            onPress={() => {
              const phoneStr = typeof item.passengerPhone === 'string' ? item.passengerPhone.replace(/\D/g, '') : '';
              if (phoneStr) Linking.openURL(`tel:${phoneStr}`).catch(() => {});
            }}
          >
            <Ionicons name="call" size={18} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.separator} />

      {/* Main Content Row: Route details on Left, Action on Right */}
      <View style={styles.contentRow}>
        
        {/* Route & Details (Takes up remaining space) */}
        <View style={styles.routeSection}>
          <View style={styles.locationItem}>
            <View style={styles.iconBoxPrimary}>
              <Ionicons name="location" size={14} color={COLORS.primary} />
            </View>
            <Text style={styles.locationText} numberOfLines={2}>{item.pickup}</Text>
          </View>
          
          <View style={styles.dashedLine} />
          
          <View style={styles.locationItem}>
            <View style={styles.iconBoxDanger}>
              <Ionicons name="flag" size={14} color="#E74C3C" />
            </View>
            <Text style={styles.locationText} numberOfLines={2}>{item.destination}</Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statChip}>
              <Ionicons name="speedometer-outline" size={14} color="#8E44AD" />
              <Text style={styles.statText} numberOfLines={1}>{item.distance}</Text>
            </View>
            <View style={styles.statChip}>
              <Ionicons name="time-outline" size={14} color="#D35400" />
              <Text style={styles.statText} numberOfLines={1}>{item.time}</Text>
            </View>
            {!!item.reward && (
              <View style={[styles.statChip, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="cash" size={14} color="#059669" />
                <Text style={[styles.statText, { color: '#059669' }]} numberOfLines={1}>
                  {item.reward.replace('MZN ', 'MT ')}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Footer Actions */}
      <View style={styles.footerActions}>
        {!isAccepted ? (
          <TouchableOpacity
            style={[styles.acceptBtn, (isAccepting || hasAcceptedTrip || isInTransit) && styles.disabledBtn]}
            onPress={() => acceptTrip(item.id, item.originalData?.goodType !== undefined)}
            disabled={isAccepting || hasAcceptedTrip || isInTransit}
          >
            {/* Progress bar background */}
            {!(hasAcceptedTrip || isInTransit) && (
              <View style={[styles.progressBar, { width: `${progressWidth}%` }]} />
            )}
            
            {isAccepting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', zIndex: 1 }}>
                <Ionicons
                  name={hasAcceptedTrip || isInTransit ? "time" : "timer-outline"}
                  size={20}
                  color="#FFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.acceptBtnText}>
                  {hasAcceptedTrip || isInTransit ? "Ocupado" : `Aceitar (${timeLeft}s)`}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          !isTripStarted || !isCurrentAcceptedTrip ? (
            <View style={styles.footerRow}>
              <TouchableOpacity
                style={[styles.footerBtnStart, (isStarting || isCanceling) && styles.disabledBtn]}
                onPress={() => startTrip(item)}
                disabled={isStarting || isCanceling || isInTransit}
              >
                {isStarting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="play-circle" size={18} color="#FFF" />
                    <Text style={styles.footerBtnText}>
                      {isInTransit ? "Em Andamento" : "Iniciar"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.footerBtnCancel, (isStarting || isCanceling) && styles.disabledBtn]}
                onPress={() => cancelTrip(item.id)}
                disabled={isStarting || isCanceling || isInTransit}
              >
                {isCanceling ? (
                  <ActivityIndicator size="small" color="#E74C3C" />
                ) : (
                  <>
                    <Ionicons name="close-circle" size={18} color="#E74C3C" />
                    <Text style={styles.footerBtnCancelText}>Cancelar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.footerBtnNav}
              onPress={() => onViewRoute(item)}
            >
              <Ionicons name="map" size={18} color="#FFF" />
            </TouchableOpacity>
          )
        )}
      </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    marginBottom: 20,
    // Premium shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    padding: 0, // Removed padding here, moved to inner
  },
  cardAcceptedOuter: {
    shadowColor: "#9333EA",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 14,
    borderWidth: 0,
  },
  cardAcceptedInner: {
    backgroundColor: '#FDF4FF',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#C084FC',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(127, 0, 255, 0.1)",
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarAccepted: {
    backgroundColor: COLORS.primary,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  passengerName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  serviceMotive: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 6,
    fontStyle: 'italic',
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  callButton: {
    backgroundColor: '#10B981',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginBottom: 16,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
  },
  routeSection: {
    flex: 1,
    paddingRight: 12,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconBoxPrimary: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(127, 0, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -2,
    marginRight: 12,
  },
  iconBoxDanger: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -2,
    marginRight: 12,
  },
  locationText: {
    flex: 1,
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
    fontWeight: "500",
  },
  dashedLine: {
    width: 2,
    height: 16,
    backgroundColor: '#E5E7EB',
    marginLeft: 11,
    marginVertical: 4,
    borderStyle: 'dashed',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 8,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flexShrink: 1,
  },
  statText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
    marginLeft: 6,
    flexShrink: 1,
  },
  actionRight: {
    width: 85,
    justifyContent: 'center',
  },
  acceptBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 0,
  },
  acceptBtnText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  footerActions: {
    marginTop: 20,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  footerBtnStart: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  footerBtnCancel: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#FEE2E2",
  },
  footerBtnNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  footerBtnText: {
    color: "#FFF",
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 15,
  },
  footerBtnCancelText: {
    color: "#EF4444",
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 15,
  },
});

export default TripCard;
