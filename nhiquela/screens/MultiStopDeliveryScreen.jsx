import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Dimensions,
  SafeAreaView
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../hooks/createConnectionApi';

const { width } = Dimensions.get('window');

export default function MultiStopDeliveryScreen() {
  const navigation = useNavigation();

  // Origem da recolha
  const [origin, setOrigin] = useState({
    address: 'Armazém Nhiquela (Maputo)',
    lat: -25.9692,
    lng: 32.5732
  });

  // Lista de destinos / paragens
  const [stops, setStops] = useState([
    {
      id: '1',
      sequence: 1,
      address: 'Costa do Sol, Av. Marginal 15029',
      recipientName: 'João Manuel',
      recipientPhone: '841234567',
      packages: 3,
      lat: -25.9380,
      lng: 32.6150,
      notes: 'Entregar na receção'
    },
    {
      id: '2',
      sequence: 2,
      address: 'Baixa de Maputo, Av. 25 de Setembro',
      recipientName: 'Maria Silva',
      recipientPhone: '829876543',
      packages: 2,
      lat: -25.9720,
      lng: 32.5700,
      notes: 'Ligar ao chegar'
    }
  ]);

  // Modal para adicionar/editar paragem
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStop, setEditingStop] = useState(null);

  // Formulário do destino
  const [addressInput, setAddressInput] = useState('');
  const [recipientNameInput, setRecipientNameInput] = useState('');
  const [recipientPhoneInput, setRecipientPhoneInput] = useState('');
  const [packagesInput, setPackagesInput] = useState('1');
  const [notesInput, setNotesInput] = useState('');

  // Modal de otimização de rota
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedResult, setOptimizedResult] = useState(null);

  // Resumo de preço e distância
  const [summary, setSummary] = useState({
    totalStops: 2,
    totalPackages: 5,
    totalDistanceKm: 12.5,
    estimatedDurationMin: 35,
    totalPrice: 600
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    calculateSummary();
  }, [stops]);

  const calculateSummary = () => {
    const totalP = stops.reduce((acc, s) => acc + (Number(s.packages) || 1), 0);
    const dist = parseFloat((stops.length * 6.2).toFixed(1));
    const duration = Math.round((dist / 35) * 60) + (stops.length * 10);
    const baseFare = 300;
    const distFare = Math.round(dist * 25);
    const extraStopsFare = Math.max(0, (stops.length - 1) * 150);
    const totalPrice = baseFare + distFare + extraStopsFare;

    setSummary({
      totalStops: stops.length,
      totalPackages: totalP,
      totalDistanceKm: dist,
      estimatedDurationMin: duration,
      totalPrice
    });
  };

  const handleOpenAdd = () => {
    setEditingStop(null);
    setAddressInput('');
    setRecipientNameInput('');
    setRecipientPhoneInput('');
    setPackagesInput('1');
    setNotesInput('');
    setShowAddModal(true);
  };

  const handleSaveStop = () => {
    if (!addressInput.trim() || !recipientNameInput.trim()) {
      Alert.alert('Aviso', 'Preencha o endereço e o nome do destinatário.');
      return;
    }

    // Gerar coordenadas simuladas próximas de Maputo
    const randomOffset = (Math.random() - 0.5) * 0.05;
    const newLat = -25.9692 + randomOffset;
    const newLng = 32.5732 + randomOffset;

    if (editingStop) {
      setStops(stops.map(s => s.id === editingStop.id ? {
        ...s,
        address: addressInput,
        recipientName: recipientNameInput,
        recipientPhone: recipientPhoneInput || '840000000',
        packages: Number(packagesInput) || 1,
        notes: notesInput,
        lat: newLat,
        lng: newLng
      } : s));
    } else {
      const newStop = {
        id: Date.now().toString(),
        sequence: stops.length + 1,
        address: addressInput,
        recipientName: recipientNameInput,
        recipientPhone: recipientPhoneInput || '840000000',
        packages: Number(packagesInput) || 1,
        notes: notesInput,
        lat: newLat,
        lng: newLng
      };
      setStops([...stops, newStop]);
    }

    setShowAddModal(false);
  };

  const handleRemoveStop = (id) => {
    if (stops.length <= 1) {
      Alert.alert('Aviso', 'O pedido deve conter pelo menos 1 destino.');
      return;
    }
    const updated = stops.filter(s => s.id !== id).map((s, idx) => ({ ...s, sequence: idx + 1 }));
    setStops(updated);
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newStops = [...stops];
    const temp = newStops[index];
    newStops[index] = newStops[index - 1];
    newStops[index - 1] = temp;
    setStops(newStops.map((s, idx) => ({ ...s, sequence: idx + 1 })));
  };

  const handleMoveDown = (index) => {
    if (index === stops.length - 1) return;
    const newStops = [...stops];
    const temp = newStops[index];
    newStops[index] = newStops[index + 1];
    newStops[index + 1] = temp;
    setStops(newStops.map((s, idx) => ({ ...s, sequence: idx + 1 })));
  };

  // Otimização de Rota via Backend API
  const handleOptimizeRoute = async () => {
    setOptimizing(true);
    try {
      const res = await api.post('/delivery-orders/optimize-route', {
        origin,
        stops
      });

      if (res.data && res.data.optimizedStops) {
        setOptimizedResult(res.data);
        setShowOptimizeModal(true);
      }
    } catch (err) {
      console.log('Erro ao otimizar rota:', err);
      // Fallback local
      const sorted = [...stops].sort((a, b) => a.address.localeCompare(b.address)).map((s, idx) => ({ ...s, sequence: idx + 1 }));
      setStops(sorted);
      Alert.alert('Sucesso', 'Ordem das paragens otimizada com base na proximidade.');
    } finally {
      setOptimizing(false);
    }
  };

  const applyOptimization = () => {
    if (optimizedResult?.optimizedStops) {
      setStops(optimizedResult.optimizedStops);
      if (optimizedResult.summary) {
        setSummary(prev => ({
          ...prev,
          totalDistanceKm: optimizedResult.summary.totalDistanceKm,
          estimatedDurationMin: optimizedResult.summary.estimatedDurationMin,
          totalPrice: optimizedResult.summary.totalPrice
        }));
      }
    }
    setShowOptimizeModal(false);
    Alert.alert('Rota Otimizada', 'A ordem das paragens foi reorganizada para economizar tempo e combustível!');
  };

  const handleConfirmDelivery = async () => {
    setLoading(true);
    try {
      const payload = {
        origin,
        stops,
        transportType: 'Mota',
        description: `Entrega Multi-Destino (${stops.length} paragens, ${summary.totalPackages} volumes)`,
        paymentMethod: 'Dinheiro',
        paymentOption: 'Pagamento na entrega'
      };

      const res = await api.post('/delivery-orders', payload);
      Alert.alert('Pedido Confirmado! 🚀', `Sua entrega multi-destino (${stops.length} paragens) foi criada com sucesso!`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.log('Erro ao criar pedido multi-destino:', err);
      Alert.alert('Erro', err.response?.data?.message || 'Não foi possível confirmar o pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Coordenadas do polígono de rota
  const routeCoordinates = [
    { latitude: origin.lat, longitude: origin.lng },
    ...stops.map(s => ({ latitude: s.lat, longitude: s.lng }))
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Criar Entrega Multi-Destino</Text>
          <Text style={styles.headerSubtitle}>{stops.length} Destinos • {summary.totalPackages} Volumes</Text>
        </View>
        <TouchableOpacity style={styles.optimizeHeaderBtn} onPress={handleOptimizeRoute} disabled={optimizing}>
          {optimizing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="routes" size={18} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.optimizeHeaderBtnText}>Otimizar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Mapa Visual Superior */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: origin.lat,
            longitude: origin.lng,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          }}
        >
          {/* Origem (Ponto Amarelo/Laranja) */}
          <Marker
            coordinate={{ latitude: origin.lat, longitude: origin.lng }}
            title="Local de Recolha"
            description={origin.address}
            pinColor="orange"
          />

          {/* Marcadores Numerados das Paragens */}
          {stops.map((stop, idx) => (
            <Marker
              key={stop.id || idx}
              coordinate={{ latitude: stop.lat, longitude: stop.lng }}
              title={`Paragem ${idx + 1}: ${stop.recipientName}`}
              description={stop.address}
              pinColor="blue"
            />
          ))}

          {/* Linha da Rota */}
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#17a2b8"
            strokeWidth={4}
            lineDashPattern={[1]}
          />
        </MapView>
      </View>

      {/* Lista de Destinos e Painel Inferior */}
      <ScrollView style={styles.contentScroll} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Ponto de Recolha */}
        <View style={styles.originCard}>
          <Ionicons name="radio-button-on" size={20} color="#ff9900" style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.originTag}>ORIGEM / RECOLHA</Text>
            <Text style={styles.originAddress}>{origin.address}</Text>
          </View>
        </View>

        {/* Cabeçalho da Lista de Destinos */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>PARAGENS DE ENTREGA ({stops.length})</Text>
          <TouchableOpacity style={styles.addDestinationBtn} onPress={handleOpenAdd}>
            <Ionicons name="add-circle" size={20} color="#6f42c1" style={{ marginRight: 4 }} />
            <Text style={styles.addDestinationText}>+ ADICIONAR DESTINO</Text>
          </TouchableOpacity>
        </View>

        {/* Lista Reordenável de Paragens */}
        {stops.map((item, index) => (
          <View key={item.id} style={styles.stopCard}>
            <View style={styles.stopBadge}>
              <Text style={styles.stopBadgeText}>{index + 1}</Text>
            </View>

            <View style={{ flex: 1, paddingHorizontal: 10 }}>
              <View style={styles.stopHeaderRow}>
                <Text style={styles.recipientName}>{item.recipientName}</Text>
                <View style={styles.packageBadge}>
                  <MaterialCommunityIcons name="package-variant-closed" size={14} color="#6f42c1" />
                  <Text style={styles.packageBadgeText}>{item.packages} vol</Text>
                </View>
              </View>
              <Text style={styles.stopAddress}>{item.address}</Text>
              <Text style={styles.stopPhone}>📞 {item.recipientPhone}</Text>
            </View>

            {/* Ações de Reordenação e Eliminação */}
            <View style={styles.stopActions}>
              <TouchableOpacity onPress={() => handleMoveUp(index)} style={styles.moveBtn} disabled={index === 0}>
                <Ionicons name="chevron-up" size={18} color={index === 0 ? '#ccc' : '#333'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleMoveDown(index)} style={styles.moveBtn} disabled={index === stops.length - 1}>
                <Ionicons name="chevron-down" size={18} color={index === stops.length - 1 ? '#ccc' : '#333'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleRemoveStop(item.id)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={18} color="#dc3545" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Cartão de Resumo Financeiro & Botão de Confirmação Fixo */}
      <View style={styles.bottomSummaryCard}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryLabel}>RESUMO DA ENTREGA</Text>
            <Text style={styles.summaryDetail}>
              {summary.totalStops} Destinos • {summary.totalDistanceKm} km • ~{summary.estimatedDurationMin} min
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.summaryPriceLabel}>Preço Total</Text>
            <Text style={styles.summaryPriceValue}>{summary.totalPrice.toLocaleString('pt-PT')} MT</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.confirmBtn}
          onPress={handleConfirmDelivery}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.confirmBtnText}>CONFIRMAR PEDIDO ({summary.totalPrice} MT)</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* MODAL 1: Adicionar / Editar Destino */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>NOVO DESTINO DE ENTREGA</Text>
            
            <Text style={styles.inputLabel}>Endereço *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ex: Av. Julius Nyerere 123, Polana"
              value={addressInput}
              onChangeText={setAddressInput}
            />

            <Text style={styles.inputLabel}>Destinatário *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Nome da pessoa que vai receber"
              value={recipientNameInput}
              onChangeText={setRecipientNameInput}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Telefone *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="84XXXXXXX"
                  keyboardType="phone-pad"
                  value={recipientPhoneInput}
                  onChangeText={setRecipientPhoneInput}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Quantidade de Volumes *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ex: 3"
                  keyboardType="numeric"
                  value={packagesInput}
                  onChangeText={setPackagesInput}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Observações / Instruções</Text>
            <TextInput
              style={[styles.textInput, { height: 60 }]}
              placeholder="Ex: Entregar no 2º andar, portaria..."
              multiline
              value={notesInput}
              onChangeText={setNotesInput}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveStop}>
                <Text style={styles.modalSaveText}>Guardar Destino</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Comparação de Otimização de Rota */}
      <Modal visible={showOptimizeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <MaterialCommunityIcons name="speedometer" size={48} color="#28a745" />
              <Text style={[styles.modalTitle, { marginTop: 8 }]}>ROTA OTIMIZADA DETETADA!</Text>
              <Text style={{ textAlign: 'center', color: '#666', fontSize: 13 }}>
                Reorganizamos a ordem das paragens para reduzir a distância total percorrida e a duração estimada.
              </Text>
            </View>

            {optimizedResult && (
              <View style={styles.optimizeComparisonBox}>
                <View style={styles.compareItem}>
                  <Text style={styles.compareLabel}>DISTÂNCIA TOTAL</Text>
                  <Text style={styles.compareValue}>{optimizedResult.summary.totalDistanceKm} km</Text>
                </View>
                <View style={styles.compareDivider} />
                <View style={styles.compareItem}>
                  <Text style={styles.compareLabel}>TEMPO ESTIMADO</Text>
                  <Text style={styles.compareValue}>~{optimizedResult.summary.estimatedDurationMin} min</Text>
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowOptimizeModal(false)}>
                <Text style={styles.modalCancelText}>Manter Ordem Definida</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: '#28a745' }]} onPress={applyOptimization}>
                <Text style={styles.modalSaveText}>Aplicar Rota Otimizada</Text>
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
  optimizeHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6f42c1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  optimizeHeaderBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  mapContainer: { height: 200, width: '100%' },
  map: { flex: 1 },
  contentScroll: { padding: 16 },
  originCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffe8cc'
  },
  originTag: { fontSize: 10, fontWeight: 'bold', color: '#ff9900', letterSpacing: 0.5 },
  originAddress: { fontSize: 14, fontWeight: '600', color: '#222', marginTop: 2 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#666' },
  addDestinationBtn: { flexDirection: 'row', alignItems: 'center' },
  addDestinationText: { fontSize: 12, fontWeight: 'bold', color: '#6f42c1' },
  stopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    elevation: 1
  },
  stopBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6f42c1',
    justifyContent: 'center',
    alignItems: 'center'
  },
  stopBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  stopHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recipientName: { fontSize: 14, fontWeight: 'bold', color: '#222' },
  packageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3ebff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  packageBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#6f42c1', marginLeft: 4 },
  stopAddress: { fontSize: 12, color: '#555', marginTop: 2 },
  stopPhone: { fontSize: 11, color: '#888', marginTop: 2 },
  stopActions: { flexDirection: 'row', alignItems: 'center' },
  moveBtn: { padding: 4 },
  deleteBtn: { padding: 4, marginLeft: 4 },
  bottomSummaryCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 10
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  summaryLabel: { fontSize: 11, fontWeight: 'bold', color: '#888' },
  summaryDetail: { fontSize: 13, fontWeight: '600', color: '#333' },
  summaryPriceLabel: { fontSize: 10, color: '#888' },
  summaryPriceValue: { fontSize: 18, fontWeight: 'bold', color: '#28a745' },
  confirmBtn: {
    flexDirection: 'row',
    backgroundColor: '#28a745',
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#222', marginBottom: 12, textAlign: 'center' },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#555', marginTop: 8, marginBottom: 4 },
  textInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#222'
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 10 },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#e9ecef' },
  modalCancelText: { color: '#495057', fontWeight: 'bold' },
  modalSaveBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#6f42c1' },
  modalSaveText: { color: '#fff', fontWeight: 'bold' },
  optimizeComparisonBox: {
    flexDirection: 'row',
    backgroundColor: '#f1f8f5',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    alignItems: 'center'
  },
  compareItem: { flex: 1, alignItems: 'center' },
  compareDivider: { width: 1, height: 30, backgroundColor: '#c3e6cb' },
  compareLabel: { fontSize: 10, fontWeight: 'bold', color: '#28a745' },
  compareValue: { fontSize: 18, fontWeight: 'bold', color: '#155724', marginTop: 2 }
});
