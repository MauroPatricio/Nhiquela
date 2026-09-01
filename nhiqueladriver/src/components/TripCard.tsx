import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Dimensions, Image, Animated, Modal, TextInput, Alert, ScrollView, Vibration, KeyboardAvoidingView, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../api/apiConfig";

const getImageUrl = (path?: string) => {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('data:image')) return path;
  const baseUrl = API_BASE_URL.replace('/api', '');
  return path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
};
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from '@react-navigation/native';
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
  onStartNegotiation?: (id: string) => void;
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
  onExpire,
  onStartNegotiation
}: Props) {
  const navigation = useNavigation<any>();
  const isCurrentAcceptedTrip = acceptedTrip?.id === item.id;
  const isAccepted = item.isAcceptedByDeliveryman || isCurrentAcceptedTrip;
  const isAccepting = acceptingTripId === item.id;
  const isStarting = startingTripId === item.id;
  const isCanceling = cancelingTripId === item.id;
  const hasAcceptedTrip = acceptedTrip !== null;
  const isInTransit = item.stepStatus === 5 || item.stepStatus === 6;
  const rawImage = item.passengerImage || item.originalData?.user?.profileImage || item.originalData?.user?.photo;
  const imageUrl = getImageUrl(rawImage);
  const passengerName = item.passenger || item.originalData?.user?.name || 'Cliente';

  const itemAny = item as any;
  const negotiationState = itemAny.negotiationState || item.originalData?.negotiationState;
  const [showNegotiateModal, setShowNegotiateModal] = useState(false);
  const [proposedPrice, setProposedPrice] = useState('');
  const [proposalNote, setProposalNote] = useState('');
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ uri: string; label: string } | null>(null);

  useEffect(() => {
    if (showNegotiateModal) {
      Vibration.cancel();
      if (onStartNegotiation) {
        onStartNegotiation(item.id || item.originalData?._id);
      }
    }
  }, [showNegotiateModal, item.id, onStartNegotiation]);

  const negotiationHistory = itemAny.negotiationHistory || item.originalData?.negotiationHistory || [];
  const maxRounds = itemAny.maxNegotiationRounds || item.originalData?.maxNegotiationRounds || 3;
  const currentRounds = itemAny.negotiationRoundCount || item.originalData?.negotiationRoundCount || negotiationHistory.length;
  const remainingProposals = Math.max(0, maxRounds - currentRounds);
  const hasProposals = negotiationHistory && negotiationHistory.length > 0;
  const isNegotiationAllowed = itemAny.isNegotiationAllowed !== undefined 
    ? Boolean(itemAny.isNegotiationAllowed) 
    : (item.originalData?.isNegotiationAllowed !== undefined ? Boolean(item.originalData?.isNegotiationAllowed) : true);

  const [driverName, setDriverName] = useState('Motorista');

  useEffect(() => {
    async function loadDriverInfo() {
      try {
        const userStr = (await AsyncStorage.getItem('@app:user')) || (await AsyncStorage.getItem('userData'));
        if (userStr) {
          const u = JSON.parse(userStr);
          if (u?.name && u.name.trim() !== '' && u.name !== 'Motorista') {
            setDriverName(u.name);
          }
        }
      } catch (e) {}
    }
    loadDriverInfo();
  }, []);

  const getCachedToken = async () => {
    return (await AsyncStorage.getItem('authToken')) || (await AsyncStorage.getItem('token')) || '';
  };

  const handleStartNegotiation = async () => {
    try {
      const token = await getCachedToken();
      const tripId = item.id || item.originalData?._id;
      if (tripId) {
        fetch(`${API_BASE_URL}/request-service/${tripId}/negotiate/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }).catch(err => console.log('Erro ao notificar início da negociação:', err));
      }
    } catch (e) {
      console.log('Erro ao iniciar negociação:', e);
    }
  };

  const handleSendDriverProposal = async () => {
    if (!proposedPrice || isNaN(Number(proposedPrice)) || Number(proposedPrice) <= 0) {
      Alert.alert('Valor Inválido', 'Introduza um valor numérico válido para a sua proposta.');
      return;
    }

    try {
      setIsSubmittingProposal(true);
      const token = await getCachedToken();
      const tripId = item.id || item.originalData?._id;

      const response = await fetch(`${API_BASE_URL}/request-service/${tripId}/negotiate/propose`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: Number(proposedPrice),
          note: proposalNote ? proposalNote.trim() : 'Reajuste de valor pelo motorista',
          proposedBy: 'PROVIDER'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao enviar proposta.');
      }

      Alert.alert('Proposta Enviada!', 'A sua proposta de preço foi enviada ao cliente com sucesso.');
      setShowNegotiateModal(false);
      setProposalNote('');
    } catch (err: any) {
      console.log('Erro ao enviar proposta:', err);
      Alert.alert('Erro', err.message || 'Não foi possível enviar a proposta.');
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  const [timeLeft, setTimeLeft] = useState(50);

  useEffect(() => {
    if (isAccepted || hasAcceptedTrip || isInTransit || showNegotiateModal || (negotiationState && negotiationState !== 'NONE') || hasProposals) return;
    
    if (timeLeft <= 0) {
      if (onExpire) onExpire(item.id);
      return;
    }
    
    const timerId = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    
    return () => clearInterval(timerId);
  }, [timeLeft, isAccepted, hasAcceptedTrip, isInTransit, showNegotiateModal, negotiationState, hasProposals, item.id, onExpire]);

  const progressWidth = (timeLeft / 50) * 100;

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
          <View style={styles.avatar}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.avatarImage} />
            ) : (
              <Ionicons
                name="person"
                size={22}
                color={COLORS.primary}
              />
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.passengerName} numberOfLines={1}>
              {passengerName}
            </Text>
            {item.serviceName && (
              <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }} numberOfLines={1}>
                Serviço: {item.serviceName}
              </Text>
            )}
            {item.serviceMotive && (
              <Text style={styles.serviceMotive} numberOfLines={1}>
                Motivo: {item.serviceMotive}
              </Text>
            )}
            
            <View style={styles.badgesContainer}>
              {negotiationState && negotiationState !== 'NONE' && !isAccepted && (
                <View style={[styles.badge, { backgroundColor: "#7C3AED" }]}>
                  <Ionicons name="swap-horizontal" size={10} color="#FFF" style={{ marginRight: 2 }} />
                  <Text style={styles.badgeText}>EM NEGOCIAÇÃO</Text>
                </View>
              )}
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
              {item.isScheduled && (
                <View style={[styles.badge, { backgroundColor: "#F59E0B" }]}>
                  <Ionicons name="calendar" size={10} color="#FFF" />
                  <Text style={styles.badgeText}>AGENDADO</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {isAccepted && item.passengerPhone && item.passengerPhone !== "Não disponvel" && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity 
              style={styles.callButton}
              onPress={() => {
                const phoneStr = typeof item.passengerPhone === 'string' ? item.passengerPhone.replace(/\D/g, '') : '';
                if (phoneStr) Linking.openURL(`tel:${phoneStr}`).catch(() => {});
              }}
            >
              <Ionicons name="call" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
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
                  {item.reward.replace('MZN ', '').replace('MT ', '')} MT
                </Text>
              </View>
            )}
          </View>

          {/* Data/hora de agendamento */}
          {item.isScheduled && item.scheduledAt && (
            <View style={[styles.statChip, { backgroundColor: '#FEF3C7', marginTop: 8, flexDirection: 'row', alignSelf: 'flex-start' }]}>
              <Ionicons name="calendar-outline" size={14} color="#D97706" />
              <Text style={[styles.statText, { color: '#D97706', marginLeft: 6 }]}>
                {new Date(item.scheduledAt).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Footer Actions */}
      <View style={styles.footerActions}>
        {!isAccepted ? (
          <View style={{ flexDirection: 'row', width: '100%', gap: 10 }}>
            {isNegotiationAllowed && (
              <TouchableOpacity
                style={{
                  flex: 1,
                  height: 52,
                  borderRadius: 14,
                  backgroundColor: '#7C3AED',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'row',
                  shadowColor: '#7C3AED',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.3,
                  shadowRadius: 5,
                  elevation: 4
                }}
                onPress={() => {
                  Vibration.cancel();
                  if (onStartNegotiation) {
                    onStartNegotiation(item.id || item.originalData?._id);
                  }
                  const initialPrice = item.reward ? item.reward.replace(/[^0-9.]/g, '') : '';
                  setProposedPrice(initialPrice);
                  setShowNegotiateModal(true);
                  handleStartNegotiation();
                }}
                disabled={isAccepting || hasAcceptedTrip || isInTransit}
              >
                <Ionicons name="swap-horizontal" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>Negociar</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.acceptBtn, 
                isNegotiationAllowed ? { flex: 1.5 } : { width: '100%' },
                (isAccepting || hasAcceptedTrip || isInTransit) && styles.disabledBtn
              ]}
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
                    {hasAcceptedTrip || isInTransit ? "Ocupado" : (negotiationState && negotiationState !== 'NONE' ? "Aceitar" : `Aceitar (${timeLeft}s)`)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
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
      {/* 🤝 MODAL PREMIUM DE NEGOCIAÇÃO DO MOTORISTA */}
      <Modal visible={showNegotiateModal} transparent animationType="slide" onRequestClose={() => setShowNegotiateModal(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 16 }}
        >
          <View style={{ width: '100%', maxHeight: '92%', backgroundColor: '#FFFFFF', borderRadius: 28, overflow: 'hidden', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 12 }}>
            
            {/* Header com Dados Reais do Cliente e Motorista */}
            <LinearGradient colors={['#7C3AED', '#6D28D9']} style={{ padding: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: '#E9D5FF' }} />
                  ) : (
                    <View style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: '#E9D5FF', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="person" size={24} color="#7C3AED" />
                    </View>
                  )}
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }} numberOfLines={1}>
                      {passengerName}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, flexWrap: 'wrap', gap: 6 }}>
                      <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                        <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Em Negociação</Text>
                      </View>
                      <View style={{ backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                        <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>
                          {remainingProposals} propostas restantes
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => setShowNegotiateModal(false)}
                >
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Nome do Motorista */}
              <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' }}>
                <Text style={{ color: '#E9D5FF', fontSize: 13, fontWeight: '600' }}>
                  Motorista: <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{driverName}</Text>
                </Text>
              </View>
            </LinearGradient>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ flexGrow: 1 }}
            >
              {/* Origem, Destino e Distância em km */}
              <View style={{ padding: 14, backgroundColor: '#FAF5FF', borderBottomWidth: 1, borderBottomColor: '#F3E8FF' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Ionicons name="location" size={14} color="#7C3AED" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 12, color: '#4B5563', flex: 1, fontWeight: '500' }} numberOfLines={1}>
                    Origem: <Text style={{ color: '#1F2937', fontWeight: '700' }}>{item.pickup}</Text>
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Ionicons name="flag" size={14} color="#E74C3C" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 12, color: '#4B5563', flex: 1, fontWeight: '500' }} numberOfLines={1}>
                    Destino: <Text style={{ color: '#1F2937', fontWeight: '700' }}>{item.destination}</Text>
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#F3E8FF' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDE9FE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                    <Ionicons name="speedometer-outline" size={14} color="#7C3AED" style={{ marginRight: 5 }} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#6D28D9' }}>
                      Distância: <Text style={{ fontWeight: '800' }}>{item.distance || 'N/A'}</Text>
                    </Text>
                  </View>

                  <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>
                    Preço Inicial: <Text style={{ color: '#7C3AED', fontWeight: '800' }}>{item.reward || 'N/A'}</Text>
                  </Text>
                </View>
              </View>

              {/* Stream / Chat de Propostas com CSS Ultra-Premium */}
              <View style={{ padding: 16, backgroundColor: '#FAF5FF' }}>
                {hasProposals ? (
                  negotiationHistory.map((proposal: any, idx: number) => {
                    const isFromDriver = proposal.proposedBy === 'PROVIDER' || proposal.proposedBy === 'DRIVER';
                    const senderName = isFromDriver ? driverName : passengerName;
                    const roleLabel = isFromDriver ? 'Motorista' : 'Cliente';

                    return (
                      <View
                        key={idx}
                        style={{
                          alignSelf: isFromDriver ? 'flex-end' : 'flex-start',
                          backgroundColor: isFromDriver ? '#7C3AED' : '#FFFFFF',
                          padding: 14,
                          borderRadius: 20,
                          borderBottomRightRadius: isFromDriver ? 4 : 20,
                          borderBottomLeftRadius: isFromDriver ? 20 : 4,
                          maxWidth: '88%',
                          marginBottom: 12,
                          borderWidth: 1,
                          borderColor: isFromDriver ? '#6D28D9' : '#E9D5FF',
                          shadowColor: '#7C3AED',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: isFromDriver ? 0.25 : 0.08,
                          shadowRadius: 10,
                          elevation: 4
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: isFromDriver ? '#F3E8FF' : '#7C3AED' }}>
                            {senderName} ({roleLabel})
                          </Text>
                          <View style={{
                            backgroundColor: proposal.status === 'ACCEPTED' ? '#DCFCE7' : proposal.status === 'REJECTED' ? '#FEE2E2' : (isFromDriver ? 'rgba(255, 255, 255, 0.25)' : '#F3E8FF'),
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 10,
                            flexDirection: 'row',
                            alignItems: 'center'
                          }}>
                            <Ionicons
                              name={proposal.status === 'ACCEPTED' ? "checkmark-circle" : proposal.status === 'REJECTED' ? "close-circle" : "paper-plane"}
                              size={11}
                              color={proposal.status === 'ACCEPTED' ? '#166534' : proposal.status === 'REJECTED' ? '#991B1B' : (isFromDriver ? '#FFFFFF' : '#6B21A8')}
                              style={{ marginRight: 4 }}
                            />
                            <Text style={{ fontSize: 9, fontWeight: '900', color: proposal.status === 'ACCEPTED' ? '#166534' : proposal.status === 'REJECTED' ? '#991B1B' : (isFromDriver ? '#FFFFFF' : '#6B21A8') }}>
                              {proposal.status === 'ACCEPTED' ? 'ACEITE' : proposal.status === 'REJECTED' ? 'REJEITADO' : 'PROPOSTA ENVIADA'}
                            </Text>
                          </View>
                        </View>

                        <Text style={{ fontSize: 17, fontWeight: '900', color: isFromDriver ? '#FFFFFF' : '#1E1B4B' }}>
                          Proposta: <Text style={{ color: isFromDriver ? '#FDE047' : '#7C3AED' }}>{proposal.amount} MT</Text>
                        </Text>

                        {proposal.note ? (
                          <View style={{ marginTop: 6, backgroundColor: isFromDriver ? 'rgba(255, 255, 255, 0.15)' : '#F3E8FF', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: isFromDriver ? 'rgba(255, 255, 255, 0.25)' : '#E9D5FF' }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: isFromDriver ? '#F3E8FF' : '#4C1D95' }}>
                              Motivo do Reajuste:
                            </Text>
                            <Text style={{ fontSize: 12, color: isFromDriver ? '#FFFFFF' : '#1E1B4B', fontStyle: 'italic', marginTop: 2 }}>
                              "{proposal.note}"
                            </Text>
                          </View>
                        ) : null}

                        <Text style={{ fontSize: 9, color: isFromDriver ? '#E9D5FF' : '#9CA3AF', marginTop: 6, alignSelf: 'flex-end', fontWeight: '600' }}>
                          {new Date(proposal.timestamp || Date.now()).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    );
                  })
                ) : (
                  <View style={{ padding: 16, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="chatbubbles-outline" size={32} color="#A78BFA" style={{ marginBottom: 6 }} />
                    <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', fontWeight: '600', lineHeight: 18 }}>
                      Ainda não existem propostas enviadas. Introduza a sua proposta de valor abaixo.
                    </Text>
                  </View>
                )}
              </View>

              {/* Formulário de Envio de Proposta com Suporte a Teclado */}
              <View style={{ padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#F3E8FF' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6 }}>
                  Sua Proposta de Preço (MT):
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 14, borderWidth: 1.5, borderColor: '#DDD6FE', paddingHorizontal: 14, height: 48, marginBottom: 12 }}>
                  <TextInput
                    style={{ flex: 1, fontSize: 16, fontWeight: '700', color: '#1E1B4B' }}
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={proposedPrice}
                    onChangeText={setProposedPrice}
                  />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#7C3AED' }}>MT</Text>
                </View>

                <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6 }}>
                  Motivo do Reajuste de Preço:
                </Text>
                <View style={{ backgroundColor: '#F9FAFB', borderRadius: 14, borderWidth: 1.5, borderColor: '#DDD6FE', paddingHorizontal: 14, paddingVertical: 8, marginBottom: 14 }}>
                  <TextInput
                    style={{ fontSize: 13, color: '#1E1B4B', minHeight: 44, textAlignVertical: 'top' }}
                    placeholder="Ex: Trânsito, chuva, bagagem pesada..."
                    placeholderTextColor="#9CA3AF"
                    value={proposalNote}
                    onChangeText={setProposalNote}
                    multiline
                  />
                </View>

                {/* Botão Enviar Proposta com CSS Ultra-Premium */}
                <TouchableOpacity
                  style={{
                    width: '100%',
                    height: 52,
                    borderRadius: 16,
                    backgroundColor: '#7C3AED',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'row',
                    shadowColor: '#7C3AED',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.35,
                    shadowRadius: 8,
                    elevation: 5
                  }}
                  onPress={handleSendDriverProposal}
                  disabled={isSubmittingProposal}
                >
                  {isSubmittingProposal ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="paper-plane" size={18} color="#FFF" style={{ marginRight: 8 }} />
                      <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>Enviar Proposta</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>

          </View>
        </KeyboardAvoidingView>
      </Modal>
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
