import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Linking,
  Dimensions,
  SafeAreaView
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../api/apiConfig';

const { width } = Dimensions.get('window');

export default function MultiStopTripScreen({ route, navigation }: any) {
  const tripData = route?.params?.trip || {
    _id: 'trip123',
    code: '#NQ-2026-00851',
    deliveryPrice: 1650,
    deliveryStops: [
      {
        _id: 's1',
        sequence: 1,
        address: 'Costa do Sol, Av. Marginal 15029',
        recipientName: 'João Manuel',
        recipientPhone: '841234567',
        packages: 3,
        latitude: -25.9380,
        longitude: 32.6150,
        status: 'DELIVERED',
        proofOfDelivery: { otp: '1234', otpVerified: true }
      },
      {
        _id: 's2',
        sequence: 2,
        address: 'Baixa de Maputo, Av. 25 de Setembro',
        recipientName: 'Maria Silva',
        recipientPhone: '829876543',
        packages: 2,
        latitude: -25.9720,
        longitude: 32.5700,
        status: 'DELIVERED',
        proofOfDelivery: { otp: '5678', otpVerified: true }
      },
      {
        _id: 's3',
        sequence: 3,
        address: 'Matola Gare, Rua da Mozal 7927',
        recipientName: 'Carlos Tembe',
        recipientPhone: '845551234',
        packages: 5,
        latitude: -25.9620,
        longitude: 32.4600,
        status: 'PENDING',
        proofOfDelivery: { otp: '9988' }
      },
      {
        _id: 's4',
        sequence: 4,
        address: 'Marracuene, Vila Sede',
        recipientName: 'Ana Paula',
        recipientPhone: '871112233',
        packages: 1,
        latitude: -25.7333,
        longitude: 32.6833,
        status: 'PENDING',
        proofOfDelivery: { otp: '4455' }
      }
    ]
  };

  const [trip, setTrip] = useState<any>(tripData);
  const [loading, setLoading] = useState(false);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);

  // Paragem ativa atual — declarado ANTES do useEffect para estar disponível nele
  const stops = trip.deliveryStops || [];
  const activeStopIndex = stops.findIndex((s: any) => s.status === 'PENDING' || s.status === 'ARRIVING' || s.status === 'ARRIVED');
  const activeStop = activeStopIndex !== -1 ? stops[activeStopIndex] : stops[stops.length - 1];

  // Buscar rota via OSRM — com fallback à API pública e depois linha recta
  useEffect(() => {
    if (stops.length < 2) {
      // Só 1 paragem: mostrar apenas o ponto no mapa
      const pts = stops
        .filter((s: any) => s.latitude && s.longitude)
        .map((s: any) => ({ latitude: Number(s.latitude), longitude: Number(s.longitude) }));
      if (pts.length > 0) setRouteCoords(pts);
      return;
    }

    const fetchRouteSegment = async (fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<any[]> => {
      // Tentativa 1: Backend próprio
      try {
        const res = await api.get(`/routing/route?originLat=${fromLat}&originLng=${fromLng}&destLat=${toLat}&destLng=${toLng}`);
        const coords = res.data?.coordinates;
        if (Array.isArray(coords) && coords.length > 0) {
          return coords.map((c: any) => ({
            latitude: Number(Array.isArray(c) ? c[1] : (c.lat ?? c.latitude)),
            longitude: Number(Array.isArray(c) ? c[0] : (c.lng ?? c.longitude)),
          }));
        }
      } catch (e1) {
        console.warn('[MultiStop] Backend routing failed, trying public OSRM...', e1);
      }

      // Tentativa 2: OSRM público demo
      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
        const response = await fetch(osrmUrl);
        const data = await response.json();
        if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates?.length > 0) {
          return data.routes[0].geometry.coordinates.map((c: any) => ({
            latitude: Number(c[1]),
            longitude: Number(c[0]),
          }));
        }
      } catch (e2) {
        console.warn('[MultiStop] Public OSRM also failed:', e2);
      }

      // Fallback final: linha recta entre os 2 pontos
      return [
        { latitude: fromLat, longitude: fromLng },
        { latitude: toLat, longitude: toLng },
      ];
    };

    const fetchAllRoutes = async () => {
      const allCoords: any[] = [];
      for (let i = 0; i < stops.length - 1; i++) {
        const from = stops[i];
        const to = stops[i + 1];
        const fromLat = Number(from.latitude ?? from.lat);
        const fromLng = Number(from.longitude ?? from.lng);
        const toLat = Number(to.latitude ?? to.lat);
        const toLng = Number(to.longitude ?? to.lng);
        if (!fromLat || !fromLng || !toLat || !toLng) continue;
        const segment = await fetchRouteSegment(fromLat, fromLng, toLat, toLng);
        allCoords.push(...segment);
      }

      if (allCoords.length > 0) {
        console.log(`[MultiStop] Rota traçada com ${allCoords.length} pontos.`);
        setRouteCoords(allCoords);
      } else {
        // Fallback absoluto: pontos das paragens em linha recta
        const fallback = stops
          .filter((s: any) => (s.latitude || s.lat) && (s.longitude || s.lng))
          .map((s: any) => ({ latitude: Number(s.latitude ?? s.lat), longitude: Number(s.longitude ?? s.lng) }));
        console.warn('[MultiStop] Usando fallback de linha recta:', fallback.length, 'pontos');
        setRouteCoords(fallback);
      }
    };

    fetchAllRoutes();
  }, [trip._id, stops.length]);

  // Modais de Ação
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showFailModal, setShowFailModal] = useState(false);

  const [otpInput, setOtpInput] = useState('');
  const [failReason, setFailReason] = useState('Cliente ausente');
  const [failNotes, setFailNotes] = useState('');

  // Abrir GPS Externo (Google Maps / Waze)
  const handleOpenNavigation = (stop: any) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}`;
    Linking.openURL(url).catch(() => Alert.alert('Erro', 'Não foi possível abrir o Google Maps.'));
  };

  // Motorista notifica chegada à paragem
  const handleArriveAtStop = async () => {
    setLoading(true);
    try {
      await api.post(`/delivery-orders/${trip._id}/stops/${activeStop._id}/arrive`);
      const updatedStops = stops.map((s: any) => s._id === activeStop._id ? { ...s, status: 'ARRIVED' } : s);
      setTrip({ ...trip, deliveryStops: updatedStops });
      Alert.alert('Chegada Notificada', `O cliente ${activeStop.recipientName} foi notificado da sua chegada!`);
    } catch (err: any) {
      console.log('Erro ao notificar chegada:', err);
      // Fallback local
      const updatedStops = stops.map((s: any) => s._id === activeStop._id ? { ...s, status: 'ARRIVED' } : s);
      setTrip({ ...trip, deliveryStops: updatedStops });
    } finally {
      setLoading(false);
    }
  };

  // Confirmar Entrega da Paragem
  const handleConfirmDelivery = async () => {
    if (activeStop?.proofOfDelivery?.otp && otpInput.trim() !== activeStop.proofOfDelivery.otp) {
      Alert.alert('Código Incorreto', 'O código OTP introduzido não corresponde ao do cliente.');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/delivery-orders/${trip._id}/stops/${activeStop._id}/deliver`, {
        otp: otpInput,
        latitude: activeStop.latitude,
        longitude: activeStop.longitude
      });

      const updatedStops = stops.map((s: any) => s._id === activeStop._id ? { ...s, status: 'DELIVERED', deliveredAt: new Date() } : s);
      setTrip({ ...trip, deliveryStops: updatedStops });
      setShowConfirmModal(false);
      setOtpInput('');

      const allDone = updatedStops.every((s: any) => s.status === 'DELIVERED' || s.status === 'FAILED');
      if (allDone) {
        Alert.alert('Viagem Concluída! 🎉', 'Todas as paragens foram concluídas com sucesso!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Paragem Concluída! ✓', 'Avançando para o próximo destino.');
      }
    } catch (err: any) {
      console.log('Erro ao confirmar entrega:', err);
      const updatedStops = stops.map((s: any) => s._id === activeStop._id ? { ...s, status: 'DELIVERED', deliveredAt: new Date() } : s);
      setTrip({ ...trip, deliveryStops: updatedStops });
      setShowConfirmModal(false);
    } finally {
      setLoading(false);
    }
  };

  // Registrar Falha / Ocorrência
  const handleRegisterFailure = async () => {
    setLoading(true);
    try {
      await api.post(`/delivery-orders/${trip._id}/stops/${activeStop._id}/fail`, {
        failureReason: failReason,
        failureNotes: failNotes
      });

      const updatedStops = stops.map((s: any) => s._id === activeStop._id ? { ...s, status: 'FAILED', failureReason: failReason } : s);
      setTrip({ ...trip, deliveryStops: updatedStops });
      setShowFailModal(false);
      Alert.alert('Ocorrência Registada', 'A central de operações foi notificada sobre a falha nesta paragem.');
    } catch (err: any) {
      console.log('Erro ao registar falha:', err);
      const updatedStops = stops.map((s: any) => s._id === activeStop._id ? { ...s, status: 'FAILED', failureReason: failReason } : s);
      setTrip({ ...trip, deliveryStops: updatedStops });
      setShowFailModal(false);
    } finally {
      setLoading(false);
    }
  };

  // Coordenadas para a rota
  const routeCoordinates = stops.map((s: any) => ({ latitude: s.latitude, longitude: s.longitude }));
  const completedCount = stops.filter((s: any) => s.status === 'DELIVERED').length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>VIAGEM {trip.code}</Text>
          <Text style={styles.headerSubtitle}>{completedCount} de {stops.length} Paragens Concluídas</Text>
        </View>
        <View style={styles.totalPriceBadge}>
          <Text style={styles.totalPriceText}>{trip.deliveryPrice} MT</Text>
        </View>
      </View>

      {/* Mapa Superior com Paragens Numeradas */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: activeStop?.latitude || -25.9692,
            longitude: activeStop?.longitude || 32.5732,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
        >
          {stops.map((stop: any, idx: number) => (
            <Marker
              key={stop._id || idx}
              coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
              title={`Paragem ${stop.sequence}: ${stop.recipientName}`}
              description={stop.address}
              pinColor={stop.status === 'DELIVERED' ? 'green' : (stop._id === activeStop?._id ? 'blue' : 'red')}
            />
          ))}

          {routeCoords.length > 0 ? (
            <>
              {/* Sombra lilás */}
              <Polyline
                coordinates={routeCoords}
                strokeWidth={8}
                strokeColor="rgba(107,33,168,0.18)"
                zIndex={1}
              />
              {/* Rota lilás principal */}
              <Polyline
                coordinates={routeCoords}
                strokeWidth={5}
                strokeColor="#A855F7"
                zIndex={2}
              />
            </>
          ) : (
            <Polyline
              coordinates={stops.map((s: any) => ({ latitude: s.latitude, longitude: s.longitude }))}
              strokeWidth={3}
              strokeColor="#A855F7"
            />
          )}
        </MapView>
      </View>

      {/* Painel do Próximo Destino e Timeline das Paragens */}
      <ScrollView style={styles.contentScroll} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* CARTÃO EM DESTAQUE DO PRÓXIMO DESTINO */}
        {activeStop && activeStop.status !== 'DELIVERED' && (
          <View style={styles.activeStopCard}>
            <View style={styles.activeTagRow}>
              <View style={styles.nextBadge}>
                <Ionicons name="location" size={14} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.nextBadgeText}>PRÓXIMO DESTINO #{activeStop.sequence}</Text>
              </View>
              <Text style={styles.packagesCountText}>{activeStop.packages} volumes</Text>
            </View>

            <Text style={styles.activeRecipientName}>{activeStop.recipientName}</Text>
            <Text style={styles.activeAddress}>{activeStop.address}</Text>

            <View style={styles.activePhoneRow}>
              <Ionicons name="call" size={16} color="#007bff" />
              <Text style={styles.activePhoneText}>{activeStop.recipientPhone}</Text>
            </View>

            {/* AÇÕES DA PARAGEM */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity style={styles.navBtn} onPress={() => handleOpenNavigation(activeStop)}>
                <Ionicons name="navigate" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>IR PARA DESTINO</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.deliverBtn} onPress={() => setShowConfirmModal(true)}>
                <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>ENTREGAR</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.failBtn} onPress={() => setShowFailModal(true)}>
              <Ionicons name="alert-circle" size={16} color="#dc3545" style={{ marginRight: 4 }} />
              <Text style={styles.failBtnText}>REGISTAR OCORRÊNCIA / FALHA</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TIMELINE COMPLETA DAS PARAGENS DA VIAGEM */}
        <Text style={styles.timelineTitle}>ITINERÁRIO DAS PARAGENS</Text>

        {stops.map((stop: any, idx: number) => {
          const isDone = stop.status === 'DELIVERED';
          const isFailed = stop.status === 'FAILED';
          const isActive = stop._id === activeStop?._id;

          return (
            <View key={stop._id || idx} style={[styles.timelineItem, isActive && styles.timelineItemActive]}>
              <View style={[
                styles.timelineIconCircle,
                isDone && { backgroundColor: '#28a745' },
                isFailed && { backgroundColor: '#dc3545' },
                isActive && { backgroundColor: '#007bff' }
              ]}>
                {isDone ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : isFailed ? (
                  <Ionicons name="close" size={16} color="#fff" />
                ) : (
                  <Text style={styles.timelineSeqText}>{stop.sequence}</Text>
                )}
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.timelineRecipient}>{stop.recipientName}</Text>
                  <Text style={[
                    styles.timelineStatusText,
                    isDone && { color: '#28a745' },
                    isFailed && { color: '#dc3545' },
                    isActive && { color: '#007bff' }
                  ]}>
                    {isDone ? 'ENTREGUE ✓' : isFailed ? 'OCORRÊNCIA ⚠️' : (isActive ? 'PRÓXIMO 🚚' : 'PENDENTE')}
                  </Text>
                </View>
                <Text style={styles.timelineAddress}>{stop.address}</Text>
                <Text style={styles.timelineMeta}>{stop.packages} vol • 📞 {stop.recipientPhone}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* MODAL 1: Confirmar Entrega (OTP) */}
      <Modal visible={showConfirmModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Ionicons name="checkmark-circle" size={48} color="#28a745" style={{ alignSelf: 'center' }} />
            <Text style={styles.modalTitle}>CONFIRMAR ENTREGA #{activeStop?.sequence}</Text>
            <Text style={{ textAlign: 'center', color: '#666', marginBottom: 16 }}>
              Destinatário: <Text style={{ fontWeight: 'bold' }}>{activeStop?.recipientName}</Text>
            </Text>

            {activeStop?.proofOfDelivery?.otp && (
              <View style={styles.otpBox}>
                <Text style={styles.otpLabel}>CÓDIGO OTP DO CLIENTE</Text>
                <TextInput
                  style={styles.otpInput}
                  placeholder="Introduza o OTP de 4 dígitos"
                  keyboardType="numeric"
                  maxLength={4}
                  value={otpInput}
                  onChangeText={setOtpInput}
                />
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setShowConfirmModal(false)}>
                <Text style={styles.cancelModalText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveModalBtn} onPress={handleConfirmDelivery} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveModalText}>CONFIRMAR</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Registar Ocorrência */}
      <Modal visible={showFailModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Ionicons name="warning" size={44} color="#dc3545" style={{ alignSelf: 'center' }} />
            <Text style={styles.modalTitle}>REGISTAR OCORRÊNCIA</Text>

            <Text style={styles.inputLabel}>Selecione o Motivo *</Text>
            {['Cliente ausente', 'Endereço incorreto', 'Cliente recusou a mercadoria', 'Contacto indisponível'].map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[styles.reasonOption, failReason === reason && styles.reasonOptionSelected]}
                onPress={() => setFailReason(reason)}
              >
                <Text style={[styles.reasonOptionText, failReason === reason && { color: '#007bff', fontWeight: 'bold' }]}>
                  {failReason === reason ? '● ' : '○ '} {reason}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.inputLabel}>Observações Adicionais</Text>
            <TextInput
              style={[styles.textInput, { height: 60 }]}
              placeholder="Descreva a ocorrência..."
              multiline
              value={failNotes}
              onChangeText={setFailNotes}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setShowFailModal(false)}>
                <Text style={styles.cancelModalText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveModalBtn, { backgroundColor: '#dc3545' }]} onPress={handleRegisterFailure} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveModalText}>REGISTAR FALHA</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  headerSubtitle: { fontSize: 12, color: '#666' },
  totalPriceBadge: { backgroundColor: '#28a745', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  totalPriceText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  mapContainer: { height: 210, width: '100%' },
  map: { flex: 1 },
  contentScroll: { padding: 16 },
  activeStopCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#007bff',
    elevation: 3
  },
  activeTagRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  nextBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007bff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  nextBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  packagesCountText: { fontSize: 12, fontWeight: 'bold', color: '#6f42c1' },
  activeRecipientName: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  activeAddress: { fontSize: 13, color: '#555', marginTop: 2 },
  activePhoneRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  activePhoneText: { fontSize: 14, fontWeight: '600', color: '#007bff', marginLeft: 6 },
  actionButtonsRow: { flexDirection: 'row', marginTop: 14, gap: 10 },
  navBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#007bff', paddingVertical: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  deliverBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#28a745', paddingVertical: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  failBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, paddingVertical: 8 },
  failBtnText: { color: '#dc3545', fontWeight: 'bold', fontSize: 12 },
  timelineTitle: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 12, letterSpacing: 0.5 },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee'
  },
  timelineItemActive: { borderColor: '#007bff', borderWidth: 2 },
  timelineIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#6c757d', justifyContent: 'center', alignItems: 'center' },
  timelineSeqText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  timelineRecipient: { fontSize: 14, fontWeight: 'bold', color: '#222' },
  timelineStatusText: { fontSize: 11, fontWeight: 'bold', color: '#6c757d' },
  timelineAddress: { fontSize: 12, color: '#555', marginTop: 2 },
  timelineMeta: { fontSize: 11, color: '#888', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#222', marginTop: 10, textAlign: 'center' },
  otpBox: { backgroundColor: '#f8f9fa', padding: 14, borderRadius: 10, marginTop: 12, alignItems: 'center' },
  otpLabel: { fontSize: 11, fontWeight: 'bold', color: '#666', marginBottom: 6 },
  otpInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, fontSize: 20, fontWeight: 'bold', textAlign: 'center', width: 160 },
  inputLabel: { fontSize: 12, fontWeight: 'bold', color: '#555', marginTop: 12, marginBottom: 6 },
  reasonOption: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#f8f9fa', marginBottom: 6 },
  reasonOptionSelected: { backgroundColor: '#e7f1ff', borderWidth: 1, borderColor: '#007bff' },
  reasonOptionText: { fontSize: 13, color: '#333' },
  textInput: { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#222' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 10 },
  cancelModalBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#e9ecef' },
  cancelModalText: { color: '#495057', fontWeight: 'bold' },
  saveModalBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#28a745' },
  saveModalText: { color: '#fff', fontWeight: 'bold' }
});
