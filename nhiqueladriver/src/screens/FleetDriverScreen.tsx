// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  Image,
  Alert,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { showMessage } from 'react-native-flash-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../styles/colors';
import { useAuth } from '../context/AuthContext';
import api from '../api/apiConfig';

type Props = {
  navigation: any;
};

// Categorias de manutenção requeridas
const MAINTENANCE_CATEGORIES = [
  { id: 'troca_oleo', title: 'Troca de Óleo', icon: 'water' },
  { id: 'filtros', title: 'Filtros (Ar/Combustível/Óleo)', icon: 'filter' },
  { id: 'pneus', title: 'Pneus e Alinhamento', icon: 'disc' },
  { id: 'travoes', title: 'Pastilhas e Travões', icon: 'hardware-chip' },
  { id: 'bateria', title: 'Bateria e Sistema Elétrico', icon: 'flash' },
  { id: 'revisao', title: 'Revisão Geral', icon: 'build' },
  { id: 'inspeccao', title: 'Inspecção Periódica', icon: 'shield-checkmark' },
  { id: 'seguro', title: 'Seguro Automóvel', icon: 'document-text' },
  { id: 'outros', title: 'Outros Serviços', icon: 'cog' },
];

export default function FleetDriverScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState<any>(null);
  const [vehiclesList, setVehiclesList] = useState<any[]>([]);
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Navegação por Abas: 'fuel' | 'maintenance' | 'anomalies'
  const [activeTab, setActiveTab] = useState<'fuel' | 'maintenance' | 'anomalies'>('fuel');

  // Listas de Dados
  const [fuelLogs, setFuelLogs] = useState<any[]>([]);
  const [maintenancePlans, setMaintenancePlans] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);

  // Modais
  const [showOdometerModal, setShowOdometerModal] = useState(false);
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [showFuelDetailModal, setShowFuelDetailModal] = useState(false);
  const [selectedFuelLog, setSelectedFuelLog] = useState<any>(null);
  const [showMaintDetailModal, setShowMaintDetailModal] = useState(false);
  const [selectedMaintPlan, setSelectedMaintPlan] = useState<any>(null);
  const [showAnomalyDetailModal, setShowAnomalyDetailModal] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const formatDateTime = (dateString?: string | Date) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} • ${hours}:${minutes}`;
  };

  const getAnomalyTypeLabel = (type?: string) => {
    switch (type) {
      case 'ODOMETER_INCONSISTENT':
        return 'Quilometragem Regressiva Detetada';
      case 'FUEL_CAPACITY_EXCEEDED':
        return 'Litros Acima da Capacidade do Tanque';
      case 'FUEL_HIGH_CONSUMPTION':
      case 'HIGH_CONSUMPTION':
        return 'Consumo Atípico / Fora do Padrão';
      case 'FUEL_DUPLICATE_SUSPECT':
      case 'DUPLICATE_FUEL_LOG':
        return 'Abastecimento Duplicado ou Suspeito';
      case 'MAINTENANCE_OVERDUE':
        return 'Manutenção Vencida';
      case 'MAINTENANCE_DUE_SOON_KM':
        return 'Manutenção Próxima por Quilometragem';
      case 'MAINTENANCE_DUE_SOON_DATE':
        return 'Manutenção Próxima por Data Limite';
      default:
        return 'Alerta Operacional da Frota';
    }
  };

  const getSeverityBadge = (severity?: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return { label: 'CRÍTICA', bg: '#FEE2E2', color: '#991B1B' };
      case 'HIGH':
        return { label: 'ALTA', bg: '#FFEDD5', color: '#C2410C' };
      case 'LOW':
        return { label: 'BAIXA', bg: '#F1F5F9', color: '#475569' };
      case 'MEDIUM':
      default:
        return { label: 'MÉDIA', bg: '#FEF3C7', color: '#B45309' };
    }
  };

  // Formulário Odómetro
  const [odometerValue, setOdometerValue] = useState('');
  const [odometerNotes, setOdometerNotes] = useState('');

  // Formulário Combustível
  const [gasStation, setGasStation] = useState('Total Moçambique');
  const [fuelOdometer, setFuelOdometer] = useState('');
  const [liters, setLiters] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('85');
  const [totalCost, setTotalCost] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [fuelNotes, setFuelNotes] = useState('');

  // Formulário Manutenção
  const [maintCategory, setMaintCategory] = useState('troca_oleo');
  const [maintTitle, setMaintTitle] = useState('Troca de Óleo');
  const [maintIntervalKm, setMaintIntervalKm] = useState('10000');
  const [maintIntervalDays, setMaintIntervalDays] = useState('180');
  const [maintCost, setMaintCost] = useState('');
  const [maintProvider, setMaintProvider] = useState('');
  const [maintNotes, setMaintNotes] = useState('');

  const fetchAssignedVehicle = async () => {
    try {
      setLoading(true);
      let targetVehicle: any = null;
      let list: any[] = [];

      try {
        const res = await api.get('/fleet/driver/assigned-vehicle');
        if (res.data) {
          if (Array.isArray(res.data)) {
            list = res.data;
          } else if (res.data.vehicles && Array.isArray(res.data.vehicles)) {
            list = res.data.vehicles;
          } else if (res.data.vehicle) {
            list = [res.data.vehicle];
          } else if (typeof res.data === 'object') {
            list = [res.data];
          }
        }
      } catch (apiErr) {
        console.log('Sem veículo atribuído retornado pela API fleet:', apiErr);
      }

      // Se não encontrou veículo de frota, mas o motorista tem viatura cadastrada no perfil
      if (list.length === 0 && user?.deliveryman?.transport_registration) {
        try {
          const autoRes = await api.post('/fleet/vehicles', {
            plateNumber: user.deliveryman.transport_registration,
            brand: user.deliveryman.transport_color || 'Viatura',
            model: user.deliveryman.transport_type || 'Geral',
            year: 2022,
            type: 'Ligeiro',
            capacityKg: 500,
            currentOdometer: 0,
            status: 'Operacional',
            assignedDriver: user._id,
          });
          if (autoRes.data?._id) {
            list = [autoRes.data];
            await AsyncStorage.setItem('@nhiquela_active_vehicle_id', autoRes.data._id);
          }
        } catch (autoErr) {
          console.log('Tentativa de auto-criação de viatura:', autoErr);
        }
      }

      setVehiclesList(list);

      if (list.length > 0) {
        const savedActiveId = await AsyncStorage.getItem('@nhiquela_active_vehicle_id');
        const found = list.find((v) => v && v._id === savedActiveId);
        targetVehicle = found || list[0];
        if (targetVehicle?._id) {
          setActiveVehicleId(targetVehicle._id);
          await AsyncStorage.setItem('@nhiquela_active_vehicle_id', targetVehicle._id);
        }
      }

      setVehicle(targetVehicle);
      if (targetVehicle && targetVehicle._id) {
        setOdometerValue(String(targetVehicle.currentOdometer || '0'));
        setFuelOdometer(String(targetVehicle.currentOdometer || '0'));
        fetchOperationalData(targetVehicle._id);
      }
    } catch (err: any) {
      console.log('Erro ao processar veículo atribuído:', err.message);
      setVehicle(null);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAssignedVehicle();
    }, [])
  );

  const handleSwitchActiveVehicle = async (v: any) => {
    if (!v?._id) return;
    setVehicle(v);
    setActiveVehicleId(v._id);
    await AsyncStorage.setItem('@nhiquela_active_vehicle_id', v._id);
    setOdometerValue(String(v.currentOdometer || '0'));
    setFuelOdometer(String(v.currentOdometer || '0'));
    fetchOperationalData(v._id);
    showMessage({
      message: `Viatura ${v.plateNumber} definida como Viatura em Uso!`,
      type: 'success',
    });
  };

  const fetchOperationalData = async (vehicleId: string) => {
    try {
      setLoadingLists(true);
      const [fuelRes, maintRes, alertsRes] = await Promise.all([
        api.get(`/fleet/fuel?vehicleId=${vehicleId}`).catch(() => ({ data: [] })),
        api.get(`/fleet/maintenance?vehicleId=${vehicleId}`).catch(() => ({ data: [] })),
        api.get('/fleet/alerts').catch(() => ({ data: [] })),
      ]);

      setFuelLogs(fuelRes.data || []);
      setMaintenancePlans(maintRes.data || []);
      // Filtrar alertas do veículo
      const vAlerts = (alertsRes.data || []).filter((a: any) => a.vehicle?._id === vehicleId || a.vehicle === vehicleId);
      setAlerts(vAlerts);
    } catch (err) {
      console.error('Erro ao carregar dados operacionais:', err);
    } finally {
      setLoadingLists(false);
    }
  };

  useEffect(() => {
    fetchAssignedVehicle();
  }, []);

  const calcKmDriven = () => {
    const curOd = Number(String(fuelOdometer).replace(',', '.'));
    const prevOd = Number(vehicle?.currentOdometer || 0);
    return curOd > prevOd ? curOd - prevOd : 0;
  };

  const calcKmL = () => {
    const km = calcKmDriven();
    const l = parseFloat(String(liters).replace(',', '.'));
    return (km > 0 && l > 0) ? (km / l).toFixed(2) : '0.00';
  };

  const calcL100km = () => {
    const km = calcKmDriven();
    const l = parseFloat(String(liters).replace(',', '.'));
    return (km > 0 && l > 0) ? ((l * 100) / km).toFixed(2) : '0.00';
  };

  const calcCostKm = () => {
    const km = calcKmDriven();
    const cost = parseFloat(String(totalCost).replace(',', '.'));
    return (km > 0 && cost > 0) ? (cost / km).toFixed(2) : '0.00';
  };

  const handleLitersChange = (val: string) => {
    setLiters(val);
    const l = parseFloat(String(val).replace(',', '.'));
    const p = parseFloat(String(pricePerLiter).replace(',', '.'));
    if (!isNaN(l) && !isNaN(p) && l > 0 && p > 0) {
      setTotalCost((l * p).toFixed(2));
    }
  };

  const handlePriceChange = (val: string) => {
    setPricePerLiter(val);
    const l = parseFloat(String(liters).replace(',', '.'));
    const p = parseFloat(String(val).replace(',', '.'));
    if (!isNaN(l) && !isNaN(p) && l > 0 && p > 0) {
      setTotalCost((l * p).toFixed(2));
    }
  };

  const handleTotalCostChange = (val: string) => {
    setTotalCost(val);
    const cost = parseFloat(String(val).replace(',', '.'));
    const p = parseFloat(String(pricePerLiter).replace(',', '.'));
    if (!isNaN(cost) && !isNaN(p) && p > 0) {
      setLiters((cost / p).toFixed(2));
    }
  };

  const handleOdometerSubmit = async () => {
    if (!vehicle?._id) {
      return showMessage({ message: 'Nenhuma viatura ativa associada encontrada.', type: 'danger' });
    }
    if (!odometerValue || isNaN(Number(odometerValue))) {
      return showMessage({ message: 'Por favor introduza uma quilometragem válida.', type: 'danger' });
    }
    try {
      setSubmitting(true);
      const res = await api.post('/fleet/odometer', {
        vehicleId: vehicle._id,
        odometer: Number(odometerValue),
        notes: odometerNotes,
      });

      if (res.data.isRegressive) {
        showMessage({
          message: 'Aviso: Leitura regressiva registada. Anomalia reportada!',
          type: 'warning',
        });
      } else {
        showMessage({ message: 'Odómetro atualizado com sucesso!', type: 'success' });
      }

      setShowOdometerModal(false);
      setOdometerNotes('');
      fetchAssignedVehicle();
    } catch (err: any) {
      showMessage({ message: err.response?.data?.message || 'Erro ao atualizar odómetro', type: 'danger' });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePickReceiptGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showMessage({ message: 'Permissão para aceder às fotos foi recusada.', type: 'danger' });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReceiptUri(result.assets[0].uri);
      }
    } catch (err: any) {
      console.log('Erro ao selecionar foto:', err);
      showMessage({ message: 'Erro ao selecionar imagem da galeria.', type: 'danger' });
    }
  };

  const handleTakeReceiptPhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showMessage({ message: 'Permissão para aceder à câmara foi recusada.', type: 'danger' });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReceiptUri(result.assets[0].uri);
      }
    } catch (err: any) {
      console.log('Erro ao tirar foto:', err);
      showMessage({ message: 'Erro ao abrir a câmara.', type: 'danger' });
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptUri(null);
    setReceiptUrl('');
  };

  const handleFuelSubmit = async () => {
    if (!vehicle?._id) {
      return showMessage({ message: 'Nenhuma viatura ativa associada encontrada.', type: 'danger' });
    }
    const cleanLiters = Number(String(liters).replace(',', '.'));
    const cleanPrice = Number(String(pricePerLiter).replace(',', '.'));
    const cleanOdometer = Number(String(fuelOdometer).replace(',', '.'));
    const cleanTotalCost = Number(String(totalCost).replace(',', '.')) || (cleanLiters * cleanPrice);

    if (!cleanOdometer || isNaN(cleanOdometer) || !cleanLiters || isNaN(cleanLiters) || !cleanPrice || isNaN(cleanPrice)) {
      return showMessage({ message: 'Preencha os campos obrigatórios do abastecimento.', type: 'danger' });
    }
    try {
      setSubmitting(true);
      let uploadedReceiptUrl = receiptUrl;

      if (receiptUri) {
        try {
          const formData = new FormData();
          const filename = receiptUri.split('/').pop() || `receipt_${Date.now()}.jpg`;
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : `image/jpeg`;

          formData.append('file', { uri: receiptUri, name: filename, type } as any);
          const uploadRes = await api.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          uploadedReceiptUrl =
            uploadRes.data?.secure_url ||
            uploadRes.data?.url ||
            uploadRes.data?.filePath ||
            uploadRes.data?.path ||
            uploadedReceiptUrl;
        } catch (uploadErr) {
          console.log('Erro ao fazer upload do comprovativo:', uploadErr);
        }
      }

      await api.post('/fleet/fuel', {
        vehicle: vehicle._id,
        gasStation: gasStation.trim() || 'Total Moçambique',
        odometer: cleanOdometer,
        liters: cleanLiters,
        pricePerLiter: cleanPrice,
        totalCost: cleanTotalCost,
        receiptUrl: uploadedReceiptUrl,
        notes: fuelNotes,
      });

      showMessage({ message: 'Abastecimento e métricas registadas com sucesso!', type: 'success' });
      setShowFuelModal(false);
      setLiters('');
      setTotalCost('');
      setReceiptUrl('');
      setReceiptUri(null);
      setFuelNotes('');
      fetchAssignedVehicle();
    } catch (err: any) {
      showMessage({ message: err.response?.data?.message || 'Erro ao registar abastecimento', type: 'danger' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMaintenanceSubmit = async () => {
    if (!vehicle?._id) {
      return showMessage({ message: 'Nenhuma viatura ativa associada encontrada.', type: 'danger' });
    }
    if (!maintTitle.trim()) {
      return showMessage({ message: 'Por favor preencha o título do serviço de manutenção.', type: 'danger' });
    }
    try {
      setSubmitting(true);
      const categoryObj = MAINTENANCE_CATEGORIES.find(
        (c) => c.id.toLowerCase() === String(maintCategory).toLowerCase()
      );
      await api.post('/fleet/maintenance', {
        vehicle: vehicle._id,
        serviceType: String(maintCategory).toLowerCase().replace('inspecao', 'inspeccao'),
        customTitle: maintTitle || categoryObj?.title,
        intervalKm: Number(maintIntervalKm) || 10000,
        intervalDays: Number(maintIntervalDays) || 180,
        lastMaintenanceKm: vehicle.currentOdometer || 0,
        costMzn: Number(maintCost) || 0,
        serviceProvider: maintProvider,
        notes: maintNotes,
      });

      showMessage({ message: 'Plano de manutenção criado com sucesso!', type: 'success' });
      setShowMaintModal(false);
      setMaintCost('');
      setMaintProvider('');
      setMaintNotes('');
      fetchOperationalData(vehicle._id);
    } catch (err: any) {
      showMessage({ message: err.response?.data?.message || 'Erro ao registar plano de manutenção', type: 'danger' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteMaintenance = async (planId: string) => {
    if (!vehicle?._id) return;
    try {
      await api.put(`/fleet/maintenance/${planId}`, { markCompleted: true });
      showMessage({ message: 'Manutenção marcada como concluída!', type: 'success' });
      setShowMaintDetailModal(false);
      fetchOperationalData(vehicle._id);
    } catch (err: any) {
      showMessage({ message: err.response?.data?.message || 'Erro ao atualizar manutenção', type: 'danger' });
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    if (!vehicle?._id) return;
    try {
      await api.put(`/fleet/alerts/${alertId}/resolve`, { status: 'RESOLVED' });
      showMessage({ message: 'Alerta de anomalia reconhecido!', type: 'success' });
      setShowAnomalyDetailModal(false);
      fetchOperationalData(vehicle._id);
    } catch (err: any) {
      showMessage({ message: err.response?.data?.message || 'Erro ao resolver alerta', type: 'danger' });
    }
  };

  // Cálculo das Médias de Consumo do Veículo
  const latestFuelLog = fuelLogs[0] || {};
  const avgKmL = latestFuelLog.calculatedKmL || (fuelLogs.length > 0 ? (fuelLogs.reduce((acc, curr) => acc + (curr.calculatedKmL || 0), 0) / fuelLogs.length).toFixed(2) : '0.00');
  const avgL100km = latestFuelLog.calculatedL100km || (fuelLogs.length > 0 ? (fuelLogs.reduce((acc, curr) => acc + (curr.calculatedL100km || 0), 0) / fuelLogs.length).toFixed(2) : '0.00');
  const avgCostKm = latestFuelLog.calculatedCostPerKm || (fuelLogs.length > 0 ? (fuelLogs.reduce((acc, curr) => acc + (curr.calculatedCostPerKm || 0), 0) / fuelLogs.length).toFixed(2) : '0.00');

  const getVehicleDisplaySubtitle = () => {
    if (!vehicle || typeof vehicle !== 'object') return 'Painel do Motorista';
    const parts = [];
    if (vehicle.plateNumber && vehicle.plateNumber !== 'undefined') {
      parts.push(vehicle.plateNumber);
    }
    const brandModel = [vehicle.brand, vehicle.model]
      .filter((x) => x && x !== 'undefined')
      .join(' ')
      .trim();
    if (brandModel) {
      parts.push(brandModel);
    }
    return parts.length > 0 ? parts.join(' • ') : 'Viatura Ativa';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Gestão Operacional</Text>
          <Text style={styles.headerSubtitle}>
            {getVehicleDisplaySubtitle()}
          </Text>
        </View>
      </View>

      {/* 🚗 SELETOR DE VIATURA EM USO (QUANDO O MOTORISTA TEM MAIS DE 1 VIATURA) */}
      {vehiclesList.length > 1 && (
        <View style={styles.vehicleSelectorBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {vehiclesList.map((v) => {
              const isActive = v._id === (vehicle?._id || activeVehicleId);
              return (
                <TouchableOpacity
                  key={v._id}
                  style={[styles.vehicleChip, isActive && styles.vehicleChipActive]}
                  onPress={() => handleSwitchActiveVehicle(v)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="car-sport" size={14} color={isActive ? '#FFF' : '#94A3B8'} />
                  <Text style={[styles.vehicleChipText, isActive && styles.vehicleChipTextActive]}>
                    {v.plateNumber || 'Viatura'}
                  </Text>
                  {isActive && (
                    <View style={styles.inUseBadge}>
                      <Text style={styles.inUseBadgeText}>EM USO</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'fuel' && styles.tabButtonActive]}
          onPress={() => setActiveTab('fuel')}
        >
          <Ionicons name="color-fill-outline" size={16} color={activeTab === 'fuel' ? '#FFF' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'fuel' && styles.tabTextActive]}>Combustível</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'maintenance' && styles.tabButtonActive]}
          onPress={() => setActiveTab('maintenance')}
        >
          <Ionicons name="build-outline" size={16} color={activeTab === 'maintenance' ? '#FFF' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'maintenance' && styles.tabTextActive]}>Manutenção</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'anomalies' && styles.tabButtonActive]}
          onPress={() => setActiveTab('anomalies')}
        >
          <Ionicons name="warning-outline" size={16} color={activeTab === 'anomalies' ? '#FFF' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'anomalies' && styles.tabTextActive]}>
            Anomalias {alerts.filter((a) => a.status === 'ACTIVE').length > 0 && `(${alerts.filter((a) => a.status === 'ACTIVE').length})`}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary || '#0D9488'} style={{ marginTop: 40 }} />
        ) : !vehicle ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={64} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Nenhum veículo atribuído</Text>
            <Text style={styles.emptySubtitle}>
              Vincule uma viatura através dos Dados Completos da Viatura no Perfil para aceder à Gestão Operacional.
            </Text>
          </View>
        ) : (
          <>
            {/* Quick Odómetro Bar */}
            <View style={styles.quickOdBar}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="speedometer" size={20} color="#0D9488" />
                <View>
                  <Text style={styles.odLabel}>Odómetro Actual</Text>
                  <Text style={styles.odValue}>{Number(vehicle?.currentOdometer || 0).toLocaleString()} km</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.odUpdateBtn}
                onPress={() => {
                  setOdometerValue(String(vehicle.currentOdometer || ''));
                  setShowOdometerModal(true);
                }}
              >
                <Text style={styles.odUpdateBtnText}>Atualizar</Text>
              </TouchableOpacity>
            </View>

            {/* TAB 1: COMBUSTÍVEL */}
            {activeTab === 'fuel' && (
              <View style={{ gap: 16 }}>
                {/* Metrics Cards Grid */}
                <Text style={styles.sectionHeaderTitle}>Métricas Calculadas de Consumo</Text>
                <View style={styles.metricsGrid}>
                  <View style={styles.metricCard}>
                    <Ionicons name="speedometer-outline" size={20} color="#0284C7" />
                    <Text style={styles.metricVal}>{latestFuelLog.calculatedKmDriven || 0} km</Text>
                    <Text style={styles.metricLbl}>Km Percorridos</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Ionicons name="leaf-outline" size={20} color="#059669" />
                    <Text style={styles.metricVal}>{avgKmL} km/L</Text>
                    <Text style={styles.metricLbl}>Média (Km / L)</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Ionicons name="color-fill-outline" size={20} color="#D97706" />
                    <Text style={styles.metricVal}>{avgL100km} L</Text>
                    <Text style={styles.metricLbl}>Litros / 100km</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Ionicons name="cash-outline" size={20} color="#7C3AED" />
                    <Text style={styles.metricVal}>{avgCostKm} MT</Text>
                    <Text style={styles.metricLbl}>Custo / Km</Text>
                  </View>
                </View>

                {/* Botão Novo Abastecimento */}
                <TouchableOpacity
                  style={styles.actionBtnPrimary}
                  onPress={() => {
                    setFuelOdometer(String(vehicle.currentOdometer || ''));
                    setShowFuelModal(true);
                  }}
                >
                  <FontAwesome5 name="gas-pump" size={18} color="#FFF" />
                  <Text style={styles.actionBtnPrimaryText}>Registar Novo Abastecimento</Text>
                </TouchableOpacity>

                {/* Histórico de Abastecimentos */}
                <Text style={styles.sectionHeaderTitle}>Histórico de Abastecimentos</Text>
                {fuelLogs.length === 0 ? (
                  <Text style={styles.emptyListText}>Nenhum abastecimento registado até ao momento.</Text>
                ) : (
                  fuelLogs.map((log) => (
                    <TouchableOpacity
                      key={log._id}
                      style={styles.logCard}
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelectedFuelLog(log);
                        setShowFuelDetailModal(true);
                      }}
                    >
                      <View style={styles.logHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <FontAwesome5 name="gas-pump" size={13} color="#0D9488" />
                          <Text style={styles.logTitle}>{log.gasStation}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="time-outline" size={13} color="#64748B" />
                          <Text style={styles.logDate}>{formatDateTime(log.createdAt || log.date)}</Text>
                        </View>
                      </View>
                      <View style={styles.logDetailsRow}>
                        <Text style={styles.logDetailText}>⛽ {log.liters} Litros @ {log.pricePerLiter} MT/L</Text>
                        <Text style={styles.logPrice}>{log.totalCost?.toFixed(2)} MT</Text>
                      </View>
                      <View style={styles.logBadgesRow}>
                        <View style={styles.logMetricBadge}>
                          <Text style={styles.logMetricText}>Odómetro: {log.odometer} km</Text>
                        </View>
                        {log.calculatedKmL > 0 && (
                          <View style={[styles.logMetricBadge, { backgroundColor: '#ECFDF5' }]}>
                            <Text style={[styles.logMetricText, { color: '#047857' }]}>
                              {log.calculatedKmL} km/L ({log.calculatedL100km} L/100km)
                            </Text>
                          </View>
                        )}
                        <View style={styles.seeDetailBadge}>
                          <Text style={styles.seeDetailBadgeText}>Ver Detalhes</Text>
                          <Ionicons name="chevron-forward" size={12} color="#0D9488" />
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* TAB 2: MANUTENÇÃO */}
            {activeTab === 'maintenance' && (
              <View style={{ gap: 16 }}>
                <TouchableOpacity
                  style={[styles.actionBtnPrimary, { backgroundColor: '#0284C7' }]}
                  onPress={() => setShowMaintModal(true)}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#FFF" />
                  <Text style={styles.actionBtnPrimaryText}>Criar Plano de Manutenção</Text>
                </TouchableOpacity>

                <Text style={styles.sectionHeaderTitle}>Planos de Manutenção por Categoria</Text>
                {maintenancePlans.length === 0 ? (
                  <Text style={styles.emptyListText}>Sem planos de manutenção ativos. Adicione um plano acima.</Text>
                ) : (
                  maintenancePlans.map((plan) => {
                    const cat = MAINTENANCE_CATEGORIES.find(
                      (c) => c.id.toLowerCase() === String(plan.serviceType || '').toLowerCase().replace('inspecao', 'inspeccao')
                    );
                    const currentKm = Number(vehicle?.currentOdometer || 0);
                    const nextKm = Number(plan.nextMaintenanceKm || 0);
                    const advanceKm = Number(plan.advanceNoticeKm || 500);

                    const isOverdue =
                      plan.status === 'VENCIDA' ||
                      plan.status === 'ATRASADO' ||
                      plan.status === 'ATRASADA' ||
                      (nextKm > 0 && currentKm >= nextKm);

                    const isSoon =
                      !isOverdue &&
                      (plan.status === 'PROXIMA' ||
                        plan.status === 'PROXIMO' ||
                        (nextKm > 0 && nextKm - currentKm <= advanceKm));

                    const isExec = plan.status === 'EM_EXECUCAO';
                    return (
                      <TouchableOpacity
                        key={plan._id}
                        style={styles.maintCard}
                        activeOpacity={0.7}
                        onPress={() => {
                          setSelectedMaintPlan(plan);
                          setShowMaintDetailModal(true);
                        }}
                      >
                        <View style={styles.maintHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 6 }}>
                            <Ionicons name={cat?.icon || 'build'} size={20} color="#0284C7" />
                            <Text style={styles.maintTitle} numberOfLines={1}>
                              {plan.customTitle || cat?.title}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor: isOverdue ? '#FEE2E2' : isSoon ? '#FEF3C7' : isExec ? '#DBEAFE' : '#D1FAE5',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusText,
                                {
                                  color: isOverdue ? '#991B1B' : isSoon ? '#92400E' : isExec ? '#1E40AF' : '#065F46',
                                },
                              ]}
                            >
                              {isOverdue ? 'VENCIDA' : isSoon ? 'PRÓXIMA' : isExec ? 'EM EXECUÇÃO' : 'EM DIA'}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.maintSub}>
                          Intervalo: {plan.intervalKm?.toLocaleString()} km ou {plan.intervalDays} dias
                        </Text>

                        <View style={styles.maintKmRow}>
                          <Text
                            style={[
                              styles.maintKmText,
                              isOverdue && { color: '#DC2626', fontWeight: 'bold' },
                            ]}
                          >
                            Próxima: {plan.nextMaintenanceKm?.toLocaleString()} km
                          </Text>
                          {plan.costMzn > 0 && <Text style={styles.maintCost}>{plan.costMzn} MT</Text>}
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                          <TouchableOpacity
                            style={[styles.completeMaintBtn, { flex: 1 }]}
                            onPress={() => handleCompleteMaintenance(plan._id)}
                          >
                            <Ionicons name="checkmark-done" size={16} color="#FFF" />
                            <Text style={styles.completeMaintBtnText}>Marcar Concluída</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.maintDetailBtn}
                            onPress={() => {
                              setSelectedMaintPlan(plan);
                              setShowMaintDetailModal(true);
                            }}
                          >
                            <Text style={styles.maintDetailBtnText}>Ver Detalhes</Text>
                            <Ionicons name="chevron-forward" size={13} color="#0284C7" />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            {/* TAB 3: ANOMALIAS */}
            {activeTab === 'anomalies' && (
              <View style={{ gap: 16 }}>
                <Text style={styles.sectionHeaderTitle}>Monitorização de Anomalias & Alertas</Text>
                {alerts.length === 0 ? (
                  <View style={styles.noAlertsBox}>
                    <Ionicons name="checkmark-circle-outline" size={48} color="#059669" />
                    <Text style={styles.noAlertsTitle}>Nenhuma anomalia detetada</Text>
                    <Text style={styles.noAlertsSub}>
                      O sistema monitoriza continuamente leituras de odómetro, capacidade do depósito e consumo fora do padrão.
                    </Text>
                  </View>
                ) : (
                  alerts.map((alt) => {
                    const isResolved = alt.status === 'RESOLVED';
                    const sev = getSeverityBadge(alt.severity);
                    return (
                      <TouchableOpacity
                        key={alt._id}
                        style={[
                          styles.alertCard,
                          { borderLeftColor: isResolved ? '#94A3B8' : alt.severity === 'CRITICAL' ? '#DC2626' : '#EF4444' },
                        ]}
                        activeOpacity={0.7}
                        onPress={() => {
                          setSelectedAnomaly(alt);
                          setShowAnomalyDetailModal(true);
                        }}
                      >
                        <View style={styles.alertHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 6 }}>
                            <Ionicons
                              name={isResolved ? 'checkmark-circle' : 'warning'}
                              size={20}
                              color={isResolved ? '#64748B' : alt.severity === 'CRITICAL' ? '#DC2626' : '#EA580C'}
                            />
                            <Text style={styles.alertTitle} numberOfLines={1}>
                              {alt.title || getAnomalyTypeLabel(alt.type)}
                            </Text>
                          </View>
                          <View style={[styles.statusBadge, { backgroundColor: sev.bg }]}>
                            <Text style={[styles.statusText, { color: sev.color }]}>{sev.label}</Text>
                          </View>
                        </View>

                        <Text style={styles.alertDesc} numberOfLines={2}>
                          {alt.message || alt.description}
                        </Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <Ionicons name="time-outline" size={12} color="#64748B" />
                          <Text style={styles.alertDate}>{formatDateTime(alt.createdAt)}</Text>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                          {!isResolved && (
                            <TouchableOpacity
                              style={[styles.resolveAlertBtn, { flex: 1 }]}
                              onPress={() => handleResolveAlert(alt._id)}
                            >
                              <Ionicons name="shield-checkmark-outline" size={14} color="#FFF" />
                              <Text style={styles.resolveAlertBtnText}>Reconhecer</Text>
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity
                            style={[
                              styles.maintDetailBtn,
                              {
                                borderColor: '#FED7AA',
                                backgroundColor: '#FFF7ED',
                                flex: isResolved ? 1 : 0,
                              },
                            ]}
                            onPress={() => {
                              setSelectedAnomaly(alt);
                              setShowAnomalyDetailModal(true);
                            }}
                          >
                            <Text style={[styles.maintDetailBtnText, { color: '#C2410C' }]}>Ver Detalhes</Text>
                            <Ionicons name="chevron-forward" size={13} color="#C2410C" />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Modal Detalhes do Abastecimento */}
      <Modal visible={showFuelDetailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FontAwesome5 name="gas-pump" size={16} color="#0D9488" />
                <Text style={styles.modalTitle}>Detalhes do Abastecimento</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFuelDetailModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedFuelLog && (
              <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
                {/* Hero / Preço & Posto */}
                <View style={styles.fuelDetailHero}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.fuelDetailGasStation}>{selectedFuelLog.gasStation || 'Posto de Combustível'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <Ionicons name="time-outline" size={13} color="#64748B" />
                      <Text style={styles.fuelDetailDateTime}>
                        {formatDateTime(selectedFuelLog.createdAt || selectedFuelLog.date)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.fuelDetailTotalCost}>
                    {Number(selectedFuelLog.totalCost || 0).toFixed(2)} MT
                  </Text>
                </View>

                {/* Métricas Principais */}
                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Dados do Registo</Text>
                <View style={styles.fuelDetailGrid}>
                  <View style={styles.fuelDetailGridItem}>
                    <Text style={styles.fuelDetailItemLabel}>Volume Abastecido</Text>
                    <Text style={styles.fuelDetailItemValue}>{selectedFuelLog.liters} Litros</Text>
                  </View>
                  <View style={styles.fuelDetailGridItem}>
                    <Text style={styles.fuelDetailItemLabel}>Preço por Litro</Text>
                    <Text style={styles.fuelDetailItemValue}>{selectedFuelLog.pricePerLiter} MT/L</Text>
                  </View>
                  <View style={styles.fuelDetailGridItem}>
                    <Text style={styles.fuelDetailItemLabel}>Odómetro no Registo</Text>
                    <Text style={styles.fuelDetailItemValue}>{Number(selectedFuelLog.odometer || 0).toLocaleString()} km</Text>
                  </View>
                  <View style={styles.fuelDetailGridItem}>
                    <Text style={styles.fuelDetailItemLabel}>Km Percorridos</Text>
                    <Text style={styles.fuelDetailItemValue}>{Number(selectedFuelLog.calculatedKmDriven || 0).toLocaleString()} km</Text>
                  </View>
                </View>

                {/* Indicadores de Eficiência */}
                {(Number(selectedFuelLog.calculatedKmL) > 0 || Number(selectedFuelLog.calculatedCostPerKm) > 0) && (
                  <>
                    <Text style={[styles.inputLabel, { marginTop: 12 }]}>Eficiência e Consumo</Text>
                    <View style={styles.fuelDetailEfficiencyBox}>
                      <View style={styles.fuelDetailEfficiencyRow}>
                        <Text style={styles.fuelDetailEffLabel}>Autonomia Média:</Text>
                        <Text style={styles.fuelDetailEffValue}>{selectedFuelLog.calculatedKmL} km/L</Text>
                      </View>
                      <View style={styles.fuelDetailEfficiencyRow}>
                        <Text style={styles.fuelDetailEffLabel}>Consumo Médio (100km):</Text>
                        <Text style={styles.fuelDetailEffValue}>{selectedFuelLog.calculatedL100km} L/100km</Text>
                      </View>
                      <View style={styles.fuelDetailEfficiencyRow}>
                        <Text style={styles.fuelDetailEffLabel}>Custo por Quilómetro:</Text>
                        <Text style={styles.fuelDetailEffValue}>{selectedFuelLog.calculatedCostPerKm} MT/km</Text>
                      </View>
                    </View>
                  </>
                )}

                {/* Observações */}
                {Boolean(selectedFuelLog.notes) && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.inputLabel}>Notas / Observações</Text>
                    <View style={styles.fuelDetailNotesBox}>
                      <Text style={styles.fuelDetailNotesText}>{selectedFuelLog.notes}</Text>
                    </View>
                  </View>
                )}

                {/* Comprovativo */}
                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Comprovativo / Recibo</Text>
                {selectedFuelLog.receiptUrl ? (
                  <View style={styles.fuelDetailReceiptBox}>
                    <Image
                      source={{ uri: selectedFuelLog.receiptUrl }}
                      style={styles.fuelDetailReceiptImage}
                      resizeMode="cover"
                    />
                    <View style={styles.fuelDetailReceiptBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#059669" />
                      <Text style={styles.fuelDetailReceiptBadgeText}>Comprovativo Anexado</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.fuelDetailNoReceiptBox}>
                    <Ionicons name="document-text-outline" size={22} color="#94A3B8" />
                    <Text style={styles.fuelDetailNoReceiptText}>Nenhum comprovativo fotográfico anexado.</Text>
                  </View>
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: '#64748B', marginTop: 14 }]}
              onPress={() => setShowFuelDetailModal(false)}
            >
              <Text style={styles.submitButtonText}>Fechar Detalhes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Atualizar Odómetro */}
      <Modal visible={showOdometerModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registar Leitura de Odómetro</Text>
              <TouchableOpacity onPress={() => setShowOdometerModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Nova Quilometragem (Km) *</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={odometerValue}
              onChangeText={setOdometerValue}
              placeholder="ex: 55000"
            />

            <Text style={styles.inputLabel}>Notas / Observações</Text>
            <TextInput
              style={[styles.input, { height: 70 }]}
              multiline
              value={odometerNotes}
              onChangeText={setOdometerNotes}
              placeholder="ex: Fim de turno"
            />

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleOdometerSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>Guardar Odómetro</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Registar Abastecimento (COM CÁLCULOS DILIGENTES) */}
      <Modal visible={showFuelModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registar Abastecimento</Text>
              <TouchableOpacity onPress={() => setShowFuelModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              <Text style={styles.inputLabel}>Posto de Combustível</Text>
              <TextInput
                style={styles.input}
                value={gasStation}
                onChangeText={setGasStation}
                placeholder="ex: Total, Petromoc, Engen"
              />

              <Text style={styles.inputLabel}>Odómetro no Abastecimento (Km) *</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={fuelOdometer}
                onChangeText={setFuelOdometer}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Litros *</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={liters}
                    onChangeText={handleLitersChange}
                    placeholder="40"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Preço/L (MZN) *</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={pricePerLiter}
                    onChangeText={handlePriceChange}
                    placeholder="85"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Custo Total (MZN)</Text>
              <TextInput
                style={[styles.input, { fontWeight: 'bold', color: '#059669' }]}
                keyboardType="numeric"
                value={totalCost}
                onChangeText={handleTotalCostChange}
                placeholder="0.00"
              />

              {/* LIVE METRICS PREVIEW INSIDE MODAL */}
              <View style={styles.previewBox}>
                <Text style={styles.previewTitle}>Cálculos Automáticos Estimados:</Text>
                <View style={styles.previewGrid}>
                  <Text style={styles.previewItem}>• Km Percorridos: {calcKmDriven()} km</Text>
                  <Text style={styles.previewItem}>• Consumo: {calcKmL()} km/L ({calcL100km()} L/100km)</Text>
                  <Text style={styles.previewItem}>• Custo / Km: {calcCostKm()} MT/km</Text>
                </View>
              </View>

              {/* COMPROVATIVO / UPLOAD */}
              <Text style={styles.inputLabel}>Comprovativo de Abastecimento (Foto / Recibo)</Text>
              {receiptUri ? (
                <View style={styles.receiptPreviewContainer}>
                  <Image source={{ uri: receiptUri }} style={styles.receiptThumb} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.receiptSuccessText} numberOfLines={1}>
                      Comprovativo anexado
                    </Text>
                    <Text style={styles.receiptSubText} numberOfLines={1}>
                      {receiptUri.split('/').pop()}
                    </Text>
                    <View style={styles.receiptActionButtons}>
                      <TouchableOpacity
                        style={styles.receiptSmallBtn}
                        onPress={handleTakeReceiptPhoto}
                      >
                        <Ionicons name="camera" size={13} color="#0D9488" />
                        <Text style={styles.receiptSmallBtnText}>Câmara</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.receiptSmallBtn}
                        onPress={handlePickReceiptGallery}
                      >
                        <Ionicons name="images" size={13} color="#0D9488" />
                        <Text style={styles.receiptSmallBtnText}>Galeria</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.receiptSmallBtn, { borderColor: '#FCA5A5' }]}
                        onPress={handleRemoveReceipt}
                      >
                        <Ionicons name="trash-outline" size={13} color="#EF4444" />
                        <Text style={[styles.receiptSmallBtnText, { color: '#EF4444' }]}>Remover</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.uploadOptionsContainer}>
                  <View style={styles.uploadButtonsRow}>
                    <TouchableOpacity
                      style={styles.uploadBtn}
                      onPress={handleTakeReceiptPhoto}
                    >
                      <Ionicons name="camera" size={20} color="#0D9488" />
                      <Text style={styles.uploadBtnText}>Tirar Foto</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.uploadBtn}
                      onPress={handlePickReceiptGallery}
                    >
                      <Ionicons name="images" size={20} color="#0D9488" />
                      <Text style={styles.uploadBtnText}>Galeria</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: '#0D9488' }]}
              onPress={handleFuelSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>Confirmar Abastecimento</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Criar Plano de Manutenção */}
      <Modal visible={showMaintModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Plano de Manutenção</Text>
              <TouchableOpacity onPress={() => setShowMaintModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              <Text style={styles.inputLabel}>Categoria de Manutenção *</Text>
              <View style={styles.categoryPicker}>
                {MAINTENANCE_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      maintCategory === cat.id && styles.categoryChipActive,
                    ]}
                    onPress={() => {
                      setMaintCategory(cat.id);
                      setMaintTitle(cat.title);
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        maintCategory === cat.id && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Título / Descrição *</Text>
              <TextInput
                style={styles.input}
                value={maintTitle}
                onChangeText={setMaintTitle}
                placeholder="ex: Troca de Óleo Synthesizer"
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Intervalo (Km)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={maintIntervalKm}
                    onChangeText={setMaintIntervalKm}
                    placeholder="10000"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Intervalo (Dias)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={maintIntervalDays}
                    onChangeText={setMaintIntervalDays}
                    placeholder="180"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Custo Estimado (MZN)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={maintCost}
                onChangeText={setMaintCost}
                placeholder="ex: 4500"
              />

              <Text style={styles.inputLabel}>Oficina / Prestador de Serviço</Text>
              <TextInput
                style={styles.input}
                value={maintProvider}
                onChangeText={setMaintProvider}
                placeholder="ex: AutoCenter Mavalane"
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: '#0284C7' }]}
              onPress={handleMaintenanceSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>Guardar Plano de Manutenção</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Detalhes do Plano de Manutenção */}
      <Modal visible={showMaintDetailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="build" size={20} color="#0284C7" />
                <Text style={styles.modalTitle}>Detalhes da Manutenção</Text>
              </View>
              <TouchableOpacity onPress={() => setShowMaintDetailModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedMaintPlan && (() => {
              const cat = MAINTENANCE_CATEGORIES.find(
                (c) => c.id.toLowerCase() === String(selectedMaintPlan.serviceType || '').toLowerCase().replace('inspecao', 'inspeccao')
              );
              const currentKm = Number(vehicle?.currentOdometer || 0);
              const nextKm = Number(selectedMaintPlan.nextMaintenanceKm || 0);
              const advanceKm = Number(selectedMaintPlan.advanceNoticeKm || 500);

              const isOverdue =
                selectedMaintPlan.status === 'VENCIDA' ||
                selectedMaintPlan.status === 'ATRASADO' ||
                selectedMaintPlan.status === 'ATRASADA' ||
                (nextKm > 0 && currentKm >= nextKm);

              const isSoon =
                !isOverdue &&
                (selectedMaintPlan.status === 'PROXIMA' ||
                  selectedMaintPlan.status === 'PROXIMO' ||
                  (nextKm > 0 && nextKm - currentKm <= advanceKm));

              const isExec = selectedMaintPlan.status === 'EM_EXECUCAO';
              return (
                <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
                  {/* Hero Card */}
                  <View style={styles.maintDetailHero}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.maintDetailTitle}>
                        {selectedMaintPlan.customTitle || cat?.title || 'Serviço de Manutenção'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <Ionicons name={cat?.icon || 'build'} size={14} color="#0284C7" />
                        <Text style={styles.maintDetailCategory}>{cat?.title || 'Manutenção'}</Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: isOverdue ? '#FEE2E2' : isSoon ? '#FEF3C7' : isExec ? '#DBEAFE' : '#D1FAE5',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: isOverdue ? '#991B1B' : isSoon ? '#92400E' : isExec ? '#1E40AF' : '#065F46',
                          },
                        ]}
                      >
                        {isOverdue ? 'VENCIDA' : isSoon ? 'PRÓXIMA' : isExec ? 'EM EXECUÇÃO' : 'EM DIA'}
                      </Text>
                    </View>
                  </View>

                  {/* Parâmetros do Plano */}
                  <Text style={[styles.inputLabel, { marginTop: 12 }]}>Parâmetros e Quilometragem</Text>
                  <View style={styles.fuelDetailGrid}>
                    <View style={styles.fuelDetailGridItem}>
                      <Text style={styles.fuelDetailItemLabel}>Intervalo em Km</Text>
                      <Text style={styles.fuelDetailItemValue}>
                        {Number(selectedMaintPlan.intervalKm || 0).toLocaleString()} km
                      </Text>
                    </View>
                    <View style={styles.fuelDetailGridItem}>
                      <Text style={styles.fuelDetailItemLabel}>Intervalo em Tempo</Text>
                      <Text style={styles.fuelDetailItemValue}>
                        {selectedMaintPlan.intervalDays || 180} dias
                      </Text>
                    </View>
                    <View style={styles.fuelDetailGridItem}>
                      <Text style={styles.fuelDetailItemLabel}>Última Execução</Text>
                      <Text style={styles.fuelDetailItemValue}>
                        {Number(selectedMaintPlan.lastMaintenanceKm || 0).toLocaleString()} km
                      </Text>
                    </View>
                    <View style={styles.fuelDetailGridItem}>
                      <Text style={styles.fuelDetailItemLabel}>Próxima Prevista</Text>
                      <Text style={[styles.fuelDetailItemValue, { color: isOverdue ? '#DC2626' : '#0284C7' }]}>
                        {Number(selectedMaintPlan.nextMaintenanceKm || 0).toLocaleString()} km
                      </Text>
                    </View>
                  </View>

                  {/* Datas */}
                  <View style={[styles.maintDetailDatesBox, { marginTop: 10 }]}>
                    <View style={styles.maintDetailDateRow}>
                      <Text style={styles.maintDetailDateLabel}>Data da Última Manutenção:</Text>
                      <Text style={styles.maintDetailDateValue}>
                        {formatDateTime(selectedMaintPlan.lastMaintenanceDate) || 'Não registada'}
                      </Text>
                    </View>
                    {selectedMaintPlan.nextMaintenanceDate && (
                      <View style={styles.maintDetailDateRow}>
                        <Text style={styles.maintDetailDateLabel}>Data Limite Estimada:</Text>
                        <Text style={styles.maintDetailDateValue}>
                          {formatDateTime(selectedMaintPlan.nextMaintenanceDate)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Prestador e Custo */}
                  <Text style={[styles.inputLabel, { marginTop: 12 }]}>Oficina e Custo Orçado</Text>
                  <View style={styles.fuelDetailGrid}>
                    <View style={[styles.fuelDetailGridItem, { width: '48%' }]}>
                      <Text style={styles.fuelDetailItemLabel}>Custo Previsto</Text>
                      <Text style={[styles.fuelDetailItemValue, { color: '#059669' }]}>
                        {selectedMaintPlan.costMzn > 0 ? `${Number(selectedMaintPlan.costMzn).toFixed(2)} MT` : 'A definir'}
                      </Text>
                    </View>
                    <View style={[styles.fuelDetailGridItem, { width: '48%' }]}>
                      <Text style={styles.fuelDetailItemLabel}>Prestador / Oficina</Text>
                      <Text style={styles.fuelDetailItemValue} numberOfLines={2}>
                        {selectedMaintPlan.serviceProvider || 'Oficina Geral'}
                      </Text>
                    </View>
                  </View>

                  {/* Avisos de Antecedência */}
                  <View style={[styles.maintNoticeBox, { marginTop: 10 }]}>
                    <Ionicons name="notifications-outline" size={16} color="#0284C7" />
                    <Text style={styles.maintNoticeText}>
                      Avisos de proximidade configurados a {selectedMaintPlan.advanceNoticeKm || 500} km ou {selectedMaintPlan.advanceNoticeDays || 7} dias de antecedência.
                    </Text>
                  </View>

                  {/* Observações */}
                  {Boolean(selectedMaintPlan.notes) && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={styles.inputLabel}>Instruções e Observações</Text>
                      <View style={styles.fuelDetailNotesBox}>
                        <Text style={styles.fuelDetailNotesText}>{selectedMaintPlan.notes}</Text>
                      </View>
                    </View>
                  )}
                </ScrollView>
              );
            })()}

            {selectedMaintPlan && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <TouchableOpacity
                  style={[styles.submitButton, { flex: 1, backgroundColor: '#059669', marginTop: 0 }]}
                  onPress={() => handleCompleteMaintenance(selectedMaintPlan._id)}
                >
                  <Text style={styles.submitButtonText}>Concluir</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, { flex: 1, backgroundColor: '#64748B', marginTop: 0 }]}
                  onPress={() => setShowMaintDetailModal(false)}
                >
                  <Text style={styles.submitButtonText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Detalhes da Anomalia / Alerta */}
      <Modal visible={showAnomalyDetailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="warning" size={20} color="#DC2626" />
                <Text style={styles.modalTitle}>Detalhes da Anomalia</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAnomalyDetailModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedAnomaly && (() => {
              const isResolved = selectedAnomaly.status === 'RESOLVED';
              const sev = getSeverityBadge(selectedAnomaly.severity);
              const meta = selectedAnomaly.metadata || {};
              return (
                <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
                  {/* Hero Card */}
                  <View style={[styles.anomalyDetailHero, { borderColor: isResolved ? '#CBD5E1' : '#FECACA' }]}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.anomalyDetailTitle}>
                        {selectedAnomaly.title || getAnomalyTypeLabel(selectedAnomaly.type)}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <Ionicons name="time-outline" size={13} color="#64748B" />
                        <Text style={styles.fuelDetailDateTime}>
                          {formatDateTime(selectedAnomaly.createdAt)}
                        </Text>
                      </View>
                    </View>
                    <View style={{ gap: 4, alignItems: 'flex-end' }}>
                      <View style={[styles.statusBadge, { backgroundColor: sev.bg }]}>
                        <Text style={[styles.statusText, { color: sev.color }]}>SEVERIDADE {sev.label}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: isResolved ? '#D1FAE5' : '#FEE2E2' },
                        ]}
                      >
                        <Text style={[styles.statusText, { color: isResolved ? '#065F46' : '#991B1B' }]}>
                          {isResolved ? 'RESOLVIDO' : 'PENDENTE'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Mensagem / Descrição */}
                  <Text style={[styles.inputLabel, { marginTop: 12 }]}>Diagnóstico do Alerta</Text>
                  <View style={styles.anomalyDetailMessageBox}>
                    <Text style={styles.anomalyDetailMessageText}>
                      {selectedAnomaly.message || selectedAnomaly.description || 'Nenhum detalhe adicional fornecido.'}
                    </Text>
                  </View>

                  {/* Metadados Técnicos / Detalhes de Leitura */}
                  {Object.keys(meta).length > 0 && (
                    <>
                      <Text style={[styles.inputLabel, { marginTop: 12 }]}>Métricas Técnicas da Ocorrência</Text>
                      <View style={styles.fuelDetailGrid}>
                        {meta.previousOdometer !== undefined && (
                          <View style={styles.fuelDetailGridItem}>
                            <Text style={styles.fuelDetailItemLabel}>Odómetro Anterior</Text>
                            <Text style={styles.fuelDetailItemValue}>
                              {Number(meta.previousOdometer).toLocaleString()} km
                            </Text>
                          </View>
                        )}
                        {meta.registeredOdometer !== undefined && (
                          <View style={styles.fuelDetailGridItem}>
                            <Text style={styles.fuelDetailItemLabel}>Odómetro Submetido</Text>
                            <Text style={[styles.fuelDetailItemValue, { color: '#DC2626' }]}>
                              {Number(meta.registeredOdometer).toLocaleString()} km
                            </Text>
                          </View>
                        )}
                        {meta.liters !== undefined && (
                          <View style={styles.fuelDetailGridItem}>
                            <Text style={styles.fuelDetailItemLabel}>Litros Registados</Text>
                            <Text style={[styles.fuelDetailItemValue, { color: '#DC2626' }]}>
                              {meta.liters} L
                            </Text>
                          </View>
                        )}
                        {meta.tankCapacity !== undefined && (
                          <View style={styles.fuelDetailGridItem}>
                            <Text style={styles.fuelDetailItemLabel}>Capacidade Máxima</Text>
                            <Text style={styles.fuelDetailItemValue}>
                              {meta.tankCapacity} L
                            </Text>
                          </View>
                        )}
                        {meta.calculatedKmL !== undefined && (
                          <View style={styles.fuelDetailGridItem}>
                            <Text style={styles.fuelDetailItemLabel}>Consumo Calculado</Text>
                            <Text style={styles.fuelDetailItemValue}>
                              {meta.calculatedKmL} km/L
                            </Text>
                          </View>
                        )}
                      </View>
                    </>
                  )}

                  {/* Histórico de Resolução */}
                  <Text style={[styles.inputLabel, { marginTop: 12 }]}>Estado da Resolução</Text>
                  <View style={styles.anomalyDetailStatusBox}>
                    <Ionicons
                      name={isResolved ? 'checkmark-circle' : 'alert-circle'}
                      size={20}
                      color={isResolved ? '#059669' : '#EA580C'}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.anomalyDetailStatusTitle, { color: isResolved ? '#065F46' : '#9A3412' }]}>
                        {isResolved ? 'Alerta Reconhecido e Resolvido' : 'Ação de Verificação Necessária'}
                      </Text>
                      <Text style={styles.anomalyDetailStatusDesc}>
                        {isResolved
                          ? `Resolvido em ${formatDateTime(selectedAnomaly.resolvedAt || selectedAnomaly.updatedAt)}`
                          : 'Verifique a leitura do odómetro ou os dados do abastecimento antes de continuar.'}
                      </Text>
                    </View>
                  </View>
                </ScrollView>
              );
            })()}

            {selectedAnomaly && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                {selectedAnomaly.status !== 'RESOLVED' && (
                  <TouchableOpacity
                    style={[styles.submitButton, { flex: 1, backgroundColor: '#059669', marginTop: 0 }]}
                    onPress={() => handleResolveAlert(selectedAnomaly._id)}
                  >
                    <Text style={styles.submitButtonText}>Reconhecer</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.submitButton, { flex: 1, backgroundColor: '#64748B', marginTop: 0 }]}
                  onPress={() => setShowAnomalyDetailModal(false)}
                >
                  <Text style={styles.submitButtonText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#0F172A',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  vehicleSelectorBar: {
    backgroundColor: '#0F172A',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  vehicleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  vehicleChipActive: {
    backgroundColor: '#0D9488',
    borderColor: '#14B8A6',
  },
  vehicleChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  vehicleChipTextActive: {
    color: '#FFFFFF',
  },
  inUseBadge: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 2,
  },
  inUseBadgeText: {
    color: '#34D399',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    paddingHorizontal: 15,
    paddingBottom: 12,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#0D9488',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
    paddingBottom: 140,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#334155',
    marginTop: 15,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 30,
  },
  quickOdBar: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  odLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  odValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  odUpdateBtn: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  odUpdateBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 8,
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  metricVal: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 6,
  },
  metricLbl: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    elevation: 3,
  },
  actionBtnPrimaryText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyListText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginVertical: 20,
  },
  logCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  logTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  logDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  logDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  logDetailText: {
    fontSize: 13,
    color: '#334155',
  },
  logPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  logBadgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  logMetricBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  logMetricText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  maintCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
  },
  maintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  maintTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  maintSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
  },
  maintKmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  maintKmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  maintCost: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#059669',
  },
  completeMaintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    marginTop: 6,
  },
  completeMaintBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noAlertsBox: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
  },
  noAlertsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 10,
  },
  noAlertsSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
  },
  alertCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    elevation: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  alertDesc: {
    fontSize: 13,
    color: '#334155',
    marginTop: 6,
  },
  alertDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  resolveAlertBtn: {
    backgroundColor: '#EF4444',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  resolveAlertBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  previewBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#047857',
  },
  previewGrid: {
    marginTop: 4,
    gap: 2,
  },
  previewItem: {
    fontSize: 11,
    color: '#065F46',
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryChipActive: {
    backgroundColor: '#0284C7',
  },
  categoryChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Estilos de Upload e Pré-visualização de Comprovativo
  uploadOptionsContainer: {
    marginBottom: 6,
  },
  uploadButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  uploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1.2,
    borderColor: '#99F6E4',
    borderStyle: 'dashed',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  uploadBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F766E',
  },
  receiptPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 6,
  },
  receiptThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  receiptPlaceholderThumb: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#CCFBF1',
  },
  receiptSuccessText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  receiptSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  receiptActionButtons: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  receiptSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  receiptSmallBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F766E',
  },
  seeDetailBadge: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  seeDetailBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },
  // Estilos do Modal de Detalhes de Abastecimento
  fuelDetailHero: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 4,
  },
  fuelDetailGasStation: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  fuelDetailDateTime: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  fuelDetailTotalCost: {
    fontSize: 18,
    fontWeight: '900',
    color: '#059669',
  },
  fuelDetailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fuelDetailGridItem: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fuelDetailItemLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 2,
  },
  fuelDetailItemValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  fuelDetailEfficiencyBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 6,
  },
  fuelDetailEfficiencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fuelDetailEffLabel: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '600',
  },
  fuelDetailEffValue: {
    fontSize: 12,
    color: '#047857',
    fontWeight: 'bold',
  },
  fuelDetailNotesBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#0D9488',
  },
  fuelDetailNotesText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  fuelDetailReceiptBox: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  fuelDetailReceiptImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#F1F5F9',
  },
  fuelDetailReceiptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ECFDF5',
  },
  fuelDetailReceiptBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  fuelDetailNoReceiptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fuelDetailNoReceiptText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  // Estilos de Detalhes de Manutenção
  maintDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 4,
  },
  maintDetailBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  maintDetailHero: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 4,
  },
  maintDetailTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  maintDetailCategory: {
    fontSize: 12,
    color: '#0284C7',
    fontWeight: '600',
  },
  maintDetailDatesBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  maintDetailDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  maintDetailDateLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  maintDetailDateValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  maintNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  maintNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#0369A1',
    lineHeight: 16,
  },
  // Estilos de Detalhes de Anomalia
  anomalyDetailHero: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 4,
  },
  anomalyDetailTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#991B1B',
  },
  anomalyDetailMessageBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  anomalyDetailMessageText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
    fontWeight: '500',
  },
  anomalyDetailStatusBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  anomalyDetailStatusTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  anomalyDetailStatusDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
});
