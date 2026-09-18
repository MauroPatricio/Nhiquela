import { showMessage } from 'react-native-flash-message';
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
  Switch,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// @ts-ignore
import { PieChart } from 'react-native-svg-charts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../styles/colors';
import { useAuth } from '../context/AuthContext';
import api, { API_BASE_URL } from '../api/apiConfig';
import { getProviderSubcategories } from '../services/deliveryService';

type Props = {
  navigation: any;
};

export default function ProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();

  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoAccept, setAutoAccept] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [driverStats, setDriverStats] = useState({ totalTrips: 0, rating: 4.8 });
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transportTypeName, setTransportTypeName] = useState<string | null>(null);

  // ✅ ESTADOS DA VIATURA E FROTA (SUPORTE A MULTI-VIATURA & VIATURA EM USO)
  const [assignedVehicle, setAssignedVehicle] = useState<any>(null);
  const [vehiclesList, setVehiclesList] = useState<any[]>([]);
  const [selectedVehicleIndex, setSelectedVehicleIndex] = useState<number>(0);
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
  const [showVehicleDeleteModal, setShowVehicleDeleteModal] = useState(false);
  const [showMinVehicleWarningModal, setShowMinVehicleWarningModal] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<any>(null);
  const [isAddingNewVehicle, setIsAddingNewVehicle] = useState(false);
  const [showVehicleEditModal, setShowVehicleEditModal] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [deletingVehicle, setDeletingVehicle] = useState(false);
  const [editVehicleForm, setEditVehicleForm] = useState({
    plateNumber: '',
    brand: '',
    model: '',
    year: '2022',
    type: 'Ligeiro',
    capacityKg: '500',
    currentOdometer: '0',
    status: 'Operacional',
    assignedDriverName: '',
  });

  // Carregar ID da viatura em uso ao iniciar
  useEffect(() => {
    AsyncStorage.getItem('@nhiquela_active_vehicle_id').then((savedId) => {
      if (savedId) setActiveVehicleId(savedId);
    });
  }, []);

  const fetchAssignedVehicle = async () => {
    if (user?.isDeliveryMan) {
      try {
        const res = await api.get('/fleet/driver/assigned-vehicle');
        if (res.data) {
          let list: any[] = [];
          if (Array.isArray(res.data)) {
            list = res.data;
          } else if (res.data.vehicles && Array.isArray(res.data.vehicles)) {
            list = res.data.vehicles;
          } else if (res.data.vehicle) {
            list = [res.data.vehicle];
          } else {
            list = [res.data];
          }
          setVehiclesList(list);

          if (list.length > 0) {
            let activeId = activeVehicleId;
            if (!activeId) {
              const savedId = await AsyncStorage.getItem('@nhiquela_active_vehicle_id');
              activeId = savedId || list[0]._id;
              if (activeId) {
                setActiveVehicleId(activeId);
                await AsyncStorage.setItem('@nhiquela_active_vehicle_id', activeId);
              }
            }
            // Encontra o índice da viatura ativa ou usa a primeira
            const activeIndex = list.findIndex((v) => v._id === activeId);
            const validIndex = activeIndex >= 0 ? activeIndex : 0;
            setSelectedVehicleIndex(validIndex);
            setAssignedVehicle(list[validIndex]);
            if (list[validIndex]?._id) {
              setActiveVehicleId(list[validIndex]._id);
              await AsyncStorage.setItem('@nhiquela_active_vehicle_id', list[validIndex]._id);
            }
          }
        }
      } catch (err) {
        // Fallback silencioso se ainda não existir registo na frota
      }
    }
  };

  const handleSelectVehicle = (index: number) => {
    setSelectedVehicleIndex(index);
    if (vehiclesList[index]) {
      setAssignedVehicle(vehiclesList[index]);
    }
  };

  const handleSetActiveVehicle = async (vehicleId: string) => {
    try {
      setActiveVehicleId(vehicleId);
      await AsyncStorage.setItem('@nhiquela_active_vehicle_id', vehicleId);
      const targetIndex = vehiclesList.findIndex((v) => v._id === vehicleId);
      if (targetIndex >= 0) {
        setSelectedVehicleIndex(targetIndex);
        setAssignedVehicle(vehiclesList[targetIndex]);
      }
      const plate = vehiclesList.find((v) => v._id === vehicleId)?.plateNumber || '';
      showMessage({
        message: `Viatura ${plate} selecionada como Viatura em Uso!`,
        type: 'success',
        icon: 'success',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteVehicle = (vehicle: any) => {
    if (vehiclesList.length <= 1) {
      setShowMinVehicleWarningModal(true);
      return;
    }
    setVehicleToDelete(vehicle);
    setShowVehicleDeleteModal(true);
  };

  const confirmDeleteVehicle = async () => {
    if (!vehicleToDelete?._id) return;
    const targetId = vehicleToDelete._id;
    try {
      setDeletingVehicle(true);
      await api.delete(`/fleet/vehicles/${targetId}`);
      showMessage({ message: 'Viatura removida com sucesso!', type: 'success' });

      // Se a viatura removida era a viatura ativa, redefine para a primeira restante
      if (activeVehicleId === targetId) {
        const remaining = vehiclesList.filter((v) => v._id !== targetId);
        if (remaining.length > 0) {
          setActiveVehicleId(remaining[0]._id);
          await AsyncStorage.setItem('@nhiquela_active_vehicle_id', remaining[0]._id);
        }
      }
      setShowVehicleDeleteModal(false);
      setVehicleToDelete(null);
      await fetchAssignedVehicle();
    } catch (err: any) {
      showMessage({
        message: err.response?.data?.message || 'Erro ao remover viatura',
        type: 'danger',
      });
    } finally {
      setDeletingVehicle(false);
    }
  };

  const handleOpenVehicleEdit = (isNew: boolean = false) => {
    setIsAddingNewVehicle(isNew);
    if (!isNew && assignedVehicle) {
      setEditVehicleForm({
        plateNumber: assignedVehicle.plateNumber || user?.deliveryman?.transport_registration || '',
        brand: assignedVehicle.brand || '',
        model: assignedVehicle.model || transportTypeName || 'Veículo',
        year: String(assignedVehicle.year || '2022'),
        type: assignedVehicle.type || 'Ligeiro',
        capacityKg: String(assignedVehicle.capacityKg || '500'),
        currentOdometer: String(assignedVehicle.currentOdometer || '0'),
        status: assignedVehicle.status || 'Operacional',
        assignedDriverName: assignedVehicle.assignedDriver?.name || user?.name || '',
      });
    } else {
      setEditVehicleForm({
        plateNumber: '',
        brand: '',
        model: transportTypeName || '',
        year: '2022',
        type: 'Ligeiro',
        capacityKg: '500',
        currentOdometer: '0',
        status: 'Operacional',
        assignedDriverName: user?.name || '',
      });
    }
    setShowVehicleEditModal(true);
  };

  const handleSaveVehicleData = async () => {
    if (!editVehicleForm.plateNumber.trim()) {
      return showMessage({ message: 'Por favor preencha a matrícula da viatura.', type: 'danger' });
    }
    try {
      setSavingVehicle(true);
      if (!isAddingNewVehicle && assignedVehicle?._id) {
        await api.put(`/fleet/vehicles/${assignedVehicle._id}`, {
          plateNumber: editVehicleForm.plateNumber,
          brand: editVehicleForm.brand,
          model: editVehicleForm.model,
          year: Number(editVehicleForm.year) || 2022,
          type: editVehicleForm.type,
          capacityKg: Number(editVehicleForm.capacityKg) || 0,
          currentOdometer: Number(editVehicleForm.currentOdometer) || 0,
          status: editVehicleForm.status,
        });
        showMessage({ message: 'Viatura atualizada com sucesso!', type: 'success' });
      } else {
        const res = await api.post('/fleet/vehicles', {
          plateNumber: editVehicleForm.plateNumber,
          brand: editVehicleForm.brand || 'Marca',
          model: editVehicleForm.model || 'Modelo',
          year: Number(editVehicleForm.year) || 2022,
          type: editVehicleForm.type || 'Ligeiro',
          capacityKg: Number(editVehicleForm.capacityKg) || 500,
          currentOdometer: Number(editVehicleForm.currentOdometer) || 0,
          status: editVehicleForm.status || 'Operacional',
          assignedDriver: user?._id,
        });
        if (res.data?._id) {
          setActiveVehicleId(res.data._id);
          await AsyncStorage.setItem('@nhiquela_active_vehicle_id', res.data._id);
        }
        showMessage({ message: 'Nova viatura adicionada à sua frota!', type: 'success' });
      }
      setShowVehicleEditModal(false);
      await fetchAssignedVehicle();
    } catch (err: any) {
      showMessage({ message: err.response?.data?.message || 'Erro ao guardar dados da viatura', type: 'danger' });
    } finally {
      setSavingVehicle(false);
    }
  };

  // ✅ HELPER PARA IMAGENS
  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:image')) return path;
    const baseUrl = API_BASE_URL.replace('/api', '');
    return path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
  };

  const getMemberSince = () => {
    // Tenta usar a data de Aprovação, se Não houver usa a criação
    const dateSource = user?.deliveryman?.approvedAt || user?.deliveryman?.updatedAt || (user as any)?.createdAt || (user as any)?.created_at || (user as any)?.date;
    if (dateSource) {
      const date = new Date(dateSource);
      if (!isNaN(date.getTime())) {
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      }
    }
    
    // Extrai a data de registro a partir do _id (ObjectId do MongoDB)
    const userId = user?._id || (user as any)?.id;
    if (userId && typeof userId === 'string' && userId.length === 24) {
      const timestamp = parseInt(userId.substring(0, 8), 16) * 1000;
      if (!isNaN(timestamp)) {
        const date = new Date(timestamp);
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      }
    }

    return '2024';
  };

  const transportTypeData = user?.deliveryman?.transport_type;
  const transportTypeNameFromUser = transportTypeData && typeof transportTypeData === 'object' ? (transportTypeData as any).name : null;

  const userData = {
    name: user?.name || 'Motorista',
    email: user?.email || 'email@exemplo.com',
    phone: user?.phoneNumber ? `+258 ${user.phoneNumber}` : '+258 84 000 0000',
    level: user?.isDeliveryMan ? 'Motorista' : 'Passageiro',
    memberSince: getMemberSince(),
    totalTrips: user?.deliveryman?.totalTrips || 0,
    totalRatings: user?.deliveryman?.totalRatings || 0,
    rating: (() => {
      const val = user?.deliveryman?.averageRating ?? user?.deliveryman?.rating;
      const num = Number(val);
      return (isNaN(num) || num === 0) ? "5.0" : num.toFixed(1);
    })(),
    acceptanceRate: '100%',
    totalEarnings: user?.deliveryman?.totalEarnings ? `${Number(user.deliveryman.totalEarnings).toFixed(2)} MT` : '0.00 MT',
    vehicle: transportTypeName || transportTypeNameFromUser || (typeof transportTypeData === 'string' ? transportTypeData : 'Veículo Não registado'),
    licensePlate: user?.deliveryman?.transport_registration || 'Não definida',
    vehicleColor: user?.deliveryman?.transport_color || 'Não definida',
  };

  useEffect(() => {
    const fetchTransportTypeName = async () => {
      const typeId = user?.deliveryman?.transport_type && typeof user.deliveryman.transport_type === 'object' 
        ? (user.deliveryman.transport_type as any)._id || (user.deliveryman.transport_type as any).id
        : user?.deliveryman?.transport_type;

      if (!typeId) return;
      try {
        const subcategories = await getProviderSubcategories();
        const found = subcategories.find((sub: any) => sub._id === typeId || sub.id === typeId);
        if (found) {
          setTransportTypeName(found.name);
        }
      } catch (err) {
        // silently fallback
      }
    };
    fetchTransportTypeName();
    fetchAssignedVehicle();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200, // Acelerado para remover sensação de carregamento lento
      useNativeDriver: true,
    }).start();

    loadUserPreferences();
  }, []);

  const loadUserPreferences = async () => {
    try {
      const preferences = await AsyncStorage.getItem('userPreferences');
      if (preferences) {
        const { notifications: notif, darkMode: dark, autoAccept: auto } = JSON.parse(preferences);
        setNotifications(notif);
        setDarkMode(dark);
        setAutoAccept(auto);
      }
    } catch (error) {
      console.error('Erro ao carregar preferências:', error);
    }
  };

  const savePreferences = async () => {
    try {
      const preferences = { notifications, darkMode, autoAccept };
      await AsyncStorage.setItem('userPreferences', JSON.stringify(preferences));
      showMessage({
        message: '✅ Sucesso',
        description: 'Preferências salvas com sucesso!',
        type: 'success',
        icon: 'auto',
        duration: 3000,
      });
    } catch (error) {
      showMessage({
        message: '❌ Erro',
        description: 'Não foi possível salvar as preferências.',
        type: 'danger',
        icon: 'auto',
        duration: 3000,
      });
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const confirmDeleteAccount = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      const parsed = storedUserData ? JSON.parse(storedUserData) : null;
      if (!parsed || !parsed.token) {
        showMessage({ message: 'Erro de autenticação', type: 'danger' });
        return;
      }
      
      await api.delete('/users/profile', {
        headers: { authorization: `Bearer ${parsed.token}` }
      });
      
      setShowDeleteModal(false);
      showMessage({ message: 'A sua conta foi eliminada com sucesso.', type: 'success' });
      await logout();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Erro ao eliminar conta:', error);
      showMessage({ message: 'Erro ao eliminar a conta. Tente novamente.', type: 'danger' });
    }
  };

  // ✅ FUNÇÃO PARA OBTER FOTO DO PERFIL
  const getProfileImageSource = (): { uri: string } => {
    const deliverymanPhoto = user?.deliveryman?.photo;
    const userPhoto = user?.photo;

    let imageUri = deliverymanPhoto || userPhoto;

    if (!imageUri) {
      return { uri: 'https://via.placeholder.com/150/007bff/ffffff?text=DR' };
    }

    // ✅ LIDAR COM BASE64 OU URL
    if (typeof imageUri === 'string' || imageUri instanceof String) {
      const uriStr = String(imageUri);
      if (uriStr.startsWith('data:image') || uriStr.startsWith('http')) {
        return { uri: uriStr };
      }
      if (uriStr.startsWith('/')) {
        return { uri: getImageUrl(uriStr) };
      }
      if (uriStr.length > 100 && !uriStr.startsWith('data:') && !uriStr.startsWith('http')) {
        return { uri: `data:image/jpeg;base64,${uriStr}` };
      }
      // Se não for nada do acima, assume-se que é um caminho relativo
      return { uri: getImageUrl(uriStr) };
    }

    return { uri: 'https://via.placeholder.com/150/007bff/ffffff?text=DR' };
  };

  const StatCard = ({ title, value, icon, color }: any) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );

  const MenuItem = ({ icon, title, subtitle, onPress, isSwitch, value, onValueChange }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} disabled={isSwitch}>
      <View style={styles.menuLeft}>
        <View style={styles.menuIcon}>
          <Ionicons name={icon} size={22} color={COLORS.primary} />
        </View>
        <View style={styles.menuText}>
          <Text style={styles.menuTitle}>{title}</Text>
          {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {isSwitch ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#767577', true: COLORS.primary + '80' }}
          thumbColor={value ? COLORS.primary : '#f4f3f4'}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#666" />
      )}
    </TouchableOpacity>
  );

  const imageSource = getProfileImageSource();

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient colors={COLORS.gradientDark} style={styles.headerGradient}>
        <View style={styles.topHeader}>
          <Text style={styles.screenTitle}>Meu Perfil</Text>
        </View>

        {/* Header do Perfil */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image
              source={imageSource}
              style={styles.avatar}
              onError={(error) => console.log('❌ Erro ao carregar imagem:', error)}
            />
            <View style={styles.premiumBadge}>
              <Ionicons
                name={user?.isDeliveryMan ? 'car-sport' : 'diamond'}
                size={16}
                color={user?.isDeliveryMan ? COLORS.success : '#FFD700'}
              />
            </View>
          </View>

          <View style={styles.profileInfo}>
            <Text style={[styles.userName, { color: '#FFF' }]}>{userData.name}</Text>
            <View
              style={[
                styles.levelBadge,
                {
                  backgroundColor: user?.isDeliveryMan
                    ? 'rgba(76, 217, 100, 0.2)'
                    : 'rgba(255, 215, 0, 0.2)',
                },
              ]}
            >
              <Ionicons
                name={user?.isDeliveryMan ? 'car-sport' : 'star'}
                size={14}
                color={user?.isDeliveryMan ? COLORS.success : '#FFD700'}
              />
              <Text
                style={[
                  styles.levelText,
                  { color: user?.isDeliveryMan ? COLORS.success : '#FFD700' },
                ]}
              >
                {userData.level}
              </Text>
            </View>

            {/* 🔥 MOSTRAR SALDO (CARTEIRA) NO TOPO COM DADOS GLOBAIS */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 4, backgroundColor: 'rgba(39, 174, 96, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' }}>
              <Ionicons name="wallet" size={16} color={COLORS.success} style={{ marginRight: 6 }} />
              <Text style={{ color: COLORS.success, fontSize: 16, fontWeight: 'bold' }}>
                Saldo: {user?.deliveryman?.balance || 'MT 0.00'}
              </Text>
            </View>

            <Text style={[styles.userEmail, { color: 'rgba(255,255,255,0.8)' }]}>{userData.email}</Text>
            <Text style={[styles.userPhone, { color: 'rgba(255,255,255,0.8)' }]}>{userData.phone}</Text>
            <Text style={[styles.userSince, { color: 'rgba(255,255,255,0.6)' }]}>Membro desde: {userData.memberSince}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150, flexGrow: 1 }}
      >



        {/* Estatísticas */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Estatísticas</Text>
          <View style={styles.statsGrid}>

            <StatCard
              title="Viagens"
              value={userData.totalTrips}
              icon="car-outline"
              color={COLORS.primary}
            />
            <StatCard
              title="Avaliação"
              value={userData.rating}
              icon="star-outline"
              color="#FFB800"
            />
            {user?.isDeliveryMan && (
              <StatCard
                title="Ganhos Totais"
                value={userData.totalEarnings}
                icon="wallet-outline"
                color="#27AE60"
              />
            )}
            {!user?.isDeliveryMan && (
              <StatCard
                title="Nível"
                value={userData.level}
                icon="trophy-outline"
                color="#27AE60"
              />
            )}
            <StatCard
              title="Membro Desde"
              value={userData.memberSince}
              icon="calendar-outline"
              color="#34C759"
            />
          </View>
        </View>

        {/* ✅ DADOS DA VIATURA E GESTÃO OPERACIONAL - APENAS PARA MOTORISTAS */}
        {user?.isDeliveryMan && (
          <View style={styles.vehicleSection}>
            <Text style={styles.sectionTitle}>Gestão e Dados da Viatura</Text>

            {/* 🚗 CARD 1: DADOS COMPLETOS DA VIATURA (PREMIUM DESIGN) */}
            <View style={styles.premiumVehicleCard}>
              {/* Header Banner */}
              <View style={styles.premiumCardHeader}>
                <View style={styles.headerLeftBox}>
                  <View style={styles.vehicleIconCircle}>
                    <Ionicons name="car-sport" size={22} color="#FFF" />
                  </View>
                  <View>
                    <Text style={styles.premiumCardTitle}>Dados da Viatura</Text>
                    <Text style={styles.premiumCardSub}>
                      {vehiclesList.length > 1 ? `${vehiclesList.length} Viaturas Registadas` : 'Ficha Técnica Operacional'}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={styles.premiumEditBtn}
                    onPress={() => handleOpenVehicleEdit(false)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="create-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.premiumEditBtnText}>Editar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.premiumTrashBtn,
                      vehiclesList.length <= 1 && { opacity: 0.5 },
                    ]}
                    onPress={() => handleDeleteVehicle(assignedVehicle)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                    <Text style={styles.premiumTrashBtnText}>Remover</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 🚗 SELETOR DE MULTI-VIATURAS (1 OU MAIS VIATURAS) */}
              <View style={styles.multiVehicleSelectorContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
                  {vehiclesList.map((v, idx) => {
                    const isSelected = (assignedVehicle?._id ? assignedVehicle._id === v._id : selectedVehicleIndex === idx);
                    const isActiveVehicle = v._id === activeVehicleId;
                    return (
                      <TouchableOpacity
                        key={v._id || idx}
                        activeOpacity={0.8}
                        style={[
                          styles.vehicleTabChip,
                          isSelected && styles.vehicleTabChipActive,
                          isActiveVehicle && { borderColor: '#10B981' },
                        ]}
                        onPress={() => handleSelectVehicle(idx)}
                      >
                        <Ionicons 
                          name="car-sport" 
                          size={14} 
                          color={isSelected ? '#FFF' : '#64748B'} 
                        />
                        <Text style={[styles.vehicleTabText, isSelected && styles.vehicleTabTextActive]}>
                          {v.plateNumber || `Viatura ${idx + 1}`}
                        </Text>
                        {isActiveVehicle && (
                          <View style={styles.activeUseChipBadge}>
                            <Text style={styles.activeUseChipBadgeText}>EM USO</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}

                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.addVehicleChip}
                    onPress={() => handleOpenVehicleEdit(true)}
                  >
                    <Ionicons name="add-circle-outline" size={16} color="#0D9488" />
                    <Text style={styles.addVehicleChipText}>+ Adicionar Viatura</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              {/* 🎯 VIATURA EM USO STATUS BANNER / ACTION */}
              {assignedVehicle?._id === activeVehicleId ? (
                <View style={styles.activeVehicleBanner}>
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  <Text style={styles.activeVehicleBannerText}>Viatura Principal em Uso Ativo</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.setActiveVehicleBtn}
                  onPress={() => handleSetActiveVehicle(assignedVehicle?._id)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="radio-button-on" size={18} color="#FFF" />
                  <Text style={styles.setActiveVehicleBtnText}>Definir Como Viatura em Uso</Text>
                </TouchableOpacity>
              )}

              {/* License Plate & Hero Showcase */}
              <View style={styles.heroShowcaseBox}>
                <View style={styles.realPlateBadge}>
                  <View style={styles.realPlateCountryStrip}>
                    <Text style={styles.realPlateCountryText}>MZ</Text>
                  </View>
                  <Text style={styles.realPlateNumberText}>
                    {assignedVehicle?.plateNumber || userData.licensePlate}
                  </Text>
                </View>

                <View style={[styles.premiumStatusBadge, { backgroundColor: (assignedVehicle?.status === 'Operacional' || !assignedVehicle) ? '#DCFCE7' : '#FEF3C7' }]}>
                  <View style={[styles.statusDot, { backgroundColor: (assignedVehicle?.status === 'Operacional' || !assignedVehicle) ? '#16A34A' : '#D97706' }]} />
                  <Text style={[styles.premiumStatusText, { color: (assignedVehicle?.status === 'Operacional' || !assignedVehicle) ? '#15803D' : '#B45309' }]}>
                    {assignedVehicle?.status || 'Operacional'}
                  </Text>
                </View>
              </View>

              {/* Technical Specifications Grid */}
              <View style={styles.specGrid}>
                {/* Item 1: Marca / Modelo */}
                <View style={styles.specCardItem}>
                  <View style={styles.specIconBadge}>
                    <Ionicons name="car-outline" size={16} color="#7F00FF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.specMetaLabel}>MARCA / MODELO</Text>
                    <Text style={styles.specMetaValue} numberOfLines={1}>
                      {assignedVehicle ? `${assignedVehicle.brand || ''} ${assignedVehicle.model || ''}`.trim() : userData.vehicle}
                    </Text>
                  </View>
                </View>

                {/* Item 2: Ano / Categoria */}
                <View style={styles.specCardItem}>
                  <View style={styles.specIconBadge}>
                    <Ionicons name="calendar-outline" size={16} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.specMetaLabel}>ANO / CATEGORIA</Text>
                    <Text style={styles.specMetaValue}>
                      {assignedVehicle ? `${assignedVehicle.year || '2022'} • ${assignedVehicle.type || 'Ligeiro'}` : '2022 • Ligeiro'}
                    </Text>
                  </View>
                </View>

                {/* Item 3: Capacidade */}
                <View style={styles.specCardItem}>
                  <View style={styles.specIconBadge}>
                    <Ionicons name="scale-outline" size={16} color="#D97706" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.specMetaLabel}>CAPACIDADE DE CARGA</Text>
                    <Text style={styles.specMetaValue}>
                      {assignedVehicle?.capacityKg ? `${assignedVehicle.capacityKg} kg` : '500 kg'}
                    </Text>
                  </View>
                </View>

                {/* Item 4: Odómetro Actual */}
                <View style={[styles.specCardItem, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                  <View style={[styles.specIconBadge, { backgroundColor: '#DCFCE7' }]}>
                    <Ionicons name="speedometer-outline" size={16} color="#059669" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.specMetaLabel, { color: '#166534' }]}>QUILOMETRAGEM ACTUAL</Text>
                    <Text style={[styles.specMetaValue, { color: '#15803D', fontWeight: '900' }]}>
                      {assignedVehicle?.currentOdometer ? `${assignedVehicle.currentOdometer.toLocaleString()} km` : '0 km'}
                    </Text>
                  </View>
                </View>

                {/* Item 5: Motorista Responsável */}
                <View style={[styles.specCardItem, { width: '100%' }]}>
                  <View style={styles.specIconBadge}>
                    <Ionicons name="person-circle-outline" size={18} color="#475569" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.specMetaLabel}>MOTORISTA RESPONSÁVEL</Text>
                    <Text style={styles.specMetaValue}>
                      {assignedVehicle?.assignedDriver?.name || user?.name || 'Motorista Registado'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Button: Ver Documentos */}
              <TouchableOpacity
                style={styles.premiumDocsBtn}
                onPress={() => setShowDocsModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="document-text" size={18} color="#FFF" />
                <Text style={styles.premiumDocsBtnText}>Ver Documentos do Veículo</Text>
                <Ionicons name="chevron-forward" size={18} color="#FFF" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            </View>

            {/* ⚙️ CARD 2: GESTÃO OPERACIONAL */}
            <TouchableOpacity
              style={styles.operationalManagementCard}
              onPress={() => navigation.navigate('FleetDriver')}
              activeOpacity={0.85}
            >
              <View style={styles.operationalCardHeader}>
                <View style={styles.opIconContainer}>
                  <Ionicons name="construct" size={24} color="#FFF" />
                </View>
                <View style={styles.opHeaderTexts}>
                  <Text style={styles.opCardTitle}>Gestão Operacional</Text>
                  <Text style={styles.opCardSubtitle}>Manutenção, Abastecimento e Anomalias</Text>
                </View>
                <View style={styles.opChevronWrap}>
                  <Ionicons name="chevron-forward" size={18} color="#FFF" />
                </View>
              </View>

              <View style={styles.opDivider} />

              <View style={styles.opFeaturesList}>
                <View style={styles.opFeatureItem}>
                  <Ionicons name="build" size={13} color="#38BDF8" />
                  <Text style={styles.opFeatureText}>Planos de Manutenção</Text>
                </View>
                <View style={styles.opFeatureItem}>
                  <Ionicons name="water" size={13} color="#34D399" />
                  <Text style={styles.opFeatureText}>Gestão de Combustível</Text>
                </View>
                <View style={styles.opFeatureItem}>
                  <Ionicons name="warning" size={13} color="#FBBF24" />
                  <Text style={styles.opFeatureText}>Alertas de Anomalias</Text>
                </View>
              </View>
            </TouchableOpacity>

              {/* ✅ STATUS DO REGISTO DO MOTORISTA */}
              {user?.deliveryman?.register_conformance && (
                <View style={styles.modernRegistrationStatus}>
                  <Ionicons
                    name={
                      user.deliveryman.register_conformance === 'CONFORMANCE'
                        ? 'shield-checkmark'
                        : user.deliveryman.register_conformance === 'INCONFORMANCE'
                        ? 'shield-half'
                        : 'time'
                    }
                    size={16}
                    color={
                      user.deliveryman.register_conformance === 'CONFORMANCE'
                        ? COLORS.success
                        : user.deliveryman.register_conformance === 'INCONFORMANCE'
                        ? COLORS.error
                        : COLORS.warning
                    }
                  />
                  <Text
                    style={[
                      styles.modernRegistrationText,
                      {
                        color:
                          user.deliveryman.register_conformance === 'CONFORMANCE'
                            ? COLORS.success
                            : user.deliveryman.register_conformance === 'INCONFORMANCE'
                            ? COLORS.error
                            : COLORS.warning,
                      },
                    ]}
                  >
                    {user.deliveryman.register_conformance === 'CONFORMANCE'
                      ? 'Disponível'
                      : user.deliveryman.register_conformance === 'INCONFORMANCE'
                      ? 'Rejeitado'
                      : 'Em Análise'}
                  </Text>
                </View>
              )}
            </View>
        )}

        <View style={styles.menuSection}>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="person-outline"
              title="Editar Perfil"
              subtitle="Alterar informações pessoais"
              onPress={() => navigation.navigate('EditProfile', { user })}
            />
            <MenuItem
              icon="wallet-outline"
              title="Carteira & Ganhos"
              subtitle="Ver histórico e saldo"
              onPress={() => navigation.navigate('Wallet')}
            />
            <MenuItem
              icon="shield-checkmark-outline"
              title="Privacidade e Segurança"
              onPress={() =>
                showMessage({
                  message: 'Em Breve',
                  description: 'Funcionalidade disponível na próxima atualização.',
                  type: 'info',
                  icon: 'auto',
                })
              }
            />
            <MenuItem
              icon="help-circle-outline"
              title="Ajuda e Suporte"
              onPress={() =>
                showMessage({
                  message: 'Em Breve',
                  description: 'Funcionalidade disponível na próxima atualização.',
                  type: 'info',
                  icon: 'auto',
                })
              }
            />
          </View>

          <View style={styles.menuGroup}>
            <MenuItem icon="save-outline" title="Salvar Preferências" onPress={savePreferences} />
          </View>
        </View>

        {/* Botão de Logout */}
        <TouchableOpacity 
          style={[styles.logoutButton, { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }]} 
          onPress={() => setShowDeleteModal(true)}
        >
          <Ionicons name="trash-outline" size={24} color="#DC2626" />
          <Text style={[styles.logoutText, { color: '#DC2626' }]}>Apagar Conta</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.logoutButton, { marginTop: 15 }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.versionText}>Versão 1.0.0</Text>
        </View>
      </ScrollView>

      {/* ✅ MODAL DE DELETAR CONTA */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.logoutModalOverlay}>
          <View style={styles.logoutModalContainer}>
            <View style={[styles.logoutModalIconContainer, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="warning" size={32} color="#DC2626" />
            </View>
            <Text style={styles.logoutModalTitle}>Apagar Conta?</Text>
            <Text style={styles.logoutModalText}>
              Atenção: Esta ação é irreversível. O seu saldo e histórico serão eliminados permanentemente.
            </Text>
            <View style={styles.logoutModalButtons}>
              <TouchableOpacity
                style={[styles.logoutModalBtn, styles.logoutModalBtnCancel]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.logoutModalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.logoutModalBtn, { backgroundColor: '#DC2626' }]}
                onPress={confirmDeleteAccount}
              >
                <Text style={styles.logoutModalBtnConfirmText}>Apagar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🚗 MODAL PREMIUM DE REMOVER VIATURA */}
      <Modal 
        visible={showVehicleDeleteModal} 
        transparent 
        animationType="fade" 
        onRequestClose={() => setShowVehicleDeleteModal(false)}
      >
        <View style={styles.logoutModalOverlay}>
          <View style={styles.vDeleteModalContainer}>
            <View style={styles.vDeleteIconCircle}>
              <Ionicons name="trash-bin-outline" size={32} color="#EF4444" />
            </View>

            <Text style={styles.vDeleteModalTitle}>Remover Viatura da Frota?</Text>
            <Text style={styles.vDeleteModalSubtitle}>
              Tem certeza que deseja remover a viatura da sua frota de motorista? Esta ação irá desafetar o veículo do seu perfil.
            </Text>

            {/* License Badge Preview */}
            {vehicleToDelete && (
              <View style={styles.vDeletePlateBadgePreview}>
                <View style={styles.realPlateCountryStrip}>
                  <Text style={styles.realPlateCountryText}>MZ</Text>
                </View>
                <Text style={styles.vDeletePlateNumberText}>
                  {vehicleToDelete.plateNumber}
                </Text>
                <Text style={styles.vDeletePlateModelText}>
                  ({vehicleToDelete.brand || ''} {vehicleToDelete.model || ''})
                </Text>
              </View>
            )}

            <View style={styles.logoutModalButtons}>
              <TouchableOpacity
                style={[styles.logoutModalBtn, styles.logoutModalBtnCancel]}
                onPress={() => setShowVehicleDeleteModal(false)}
                disabled={deletingVehicle}
              >
                <Text style={styles.logoutModalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.logoutModalBtn, { backgroundColor: '#EF4444' }]}
                onPress={confirmDeleteVehicle}
                disabled={deletingVehicle}
              >
                {deletingVehicle ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="trash" size={16} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.logoutModalBtnConfirmText}>Sim, Remover</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ⚠️ MODAL PREMIUM DE AVISO: MÍNIMO 1 VIATURA */}
      <Modal 
        visible={showMinVehicleWarningModal} 
        transparent 
        animationType="fade" 
        onRequestClose={() => setShowMinVehicleWarningModal(false)}
      >
        <View style={styles.logoutModalOverlay}>
          <View style={styles.vDeleteModalContainer}>
            <View style={[styles.vDeleteIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="shield-alert-outline" size={32} color="#D97706" />
            </View>

            <Text style={styles.vDeleteModalTitle}>Mínimo de 1 Viatura</Text>
            <Text style={styles.vDeleteModalSubtitle}>
              O seu perfil de motorista necessita de ter pelo menos uma viatura em uso associada para continuar a receber serviços.
            </Text>

            <View style={styles.vMinVehicleNoticeBox}>
              <Ionicons name="information-circle" size={18} color="#D97706" />
              <Text style={styles.vMinVehicleNoticeText}>
                Registe primeiro uma nova viatura antes de remover esta.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.vMinVehicleCloseBtn}
              onPress={() => setShowMinVehicleWarningModal(false)}
            >
              <Text style={styles.vMinVehicleCloseBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ✅ MODAL DE DOCUMENTOS */}
      <Modal
        visible={showDocsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDocsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Meus Documentos</Text>
            <TouchableOpacity onPress={() => setShowDocsModal(false)} style={styles.closeModalBtn}>
              <Ionicons name="close" size={28} color="#1A1A1A" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {user?.deliveryman?.license_front && (
              <View style={styles.docItem}>
                <Text style={styles.docTitle}>Carta de Condução (Frente)</Text>
                <Image
                  source={{ uri: getImageUrl(user.deliveryman.license_front) }}
                  style={styles.docImage}
                  resizeMode="contain"
                />
              </View>
            )}
            {user?.deliveryman?.license_back && (
              <View style={styles.docItem}>
                <Text style={styles.docTitle}>Carta de Condução (Verso)</Text>
                <Image
                  source={{ uri: getImageUrl(user.deliveryman.license_back) }}
                  style={styles.docImage}
                  resizeMode="contain"
                />
              </View>
            )}
            {user?.deliveryman?.vihicle_logbook && (
              <View style={styles.docItem}>
                <Text style={styles.docTitle}>Livrete do Veículo</Text>
                <Image
                  source={{ uri: getImageUrl(user.deliveryman.vihicle_logbook) }}
                  style={styles.docImage}
                  resizeMode="contain"
                />
              </View>
            )}
            {user?.deliveryman?.vihicle_inspection && (
              <View style={styles.docItem}>
                <Text style={styles.docTitle}>Inspeção</Text>
                <Image
                  source={{ uri: getImageUrl(user.deliveryman.vihicle_inspection) }}
                  style={styles.docImage}
                  resizeMode="contain"
                />
              </View>
            )}
            {user?.deliveryman?.vihicle_Insurance && (
              <View style={styles.docItem}>
                <Text style={styles.docTitle}>Seguro</Text>
                <Image
                  source={{ uri: getImageUrl(user.deliveryman.vihicle_Insurance) }}
                  style={styles.docImage}
                  resizeMode="contain"
                />
              </View>
            )}
            {user?.deliveryman?.document_front && (
              <View style={styles.docItem}>
                <Text style={styles.docTitle}>Documento de Identificação (Frente)</Text>
                <Image
                  source={{ uri: getImageUrl(user.deliveryman.document_front) }}
                  style={styles.docImage}
                  resizeMode="contain"
                />
              </View>
            )}
            {user?.deliveryman?.document_back && (
              <View style={styles.docItem}>
                <Text style={styles.docTitle}>Documento de Identificação (Verso)</Text>
                <Image
                  source={{ uri: getImageUrl(user.deliveryman.document_back) }}
                  style={styles.docImage}
                  resizeMode="contain"
                />
              </View>
            )}
            {user?.deliveryman?.Proof_of_Address && (
              <View style={styles.docItem}>
                <Text style={styles.docTitle}>Comprovativo de Morada</Text>
                <Image
                  source={{ uri: getImageUrl(user.deliveryman.Proof_of_Address) }}
                  style={styles.docImage}
                  resizeMode="contain"
                />
              </View>
            )}
            {user?.deliveryman?.vihicle_picture && (
              <View style={styles.docItem}>
                <Text style={styles.docTitle}>Foto Lateral da Viatura</Text>
                <Image
                  source={{ uri: getImageUrl(user.deliveryman.vihicle_picture) }}
                  style={styles.docImage}
                  resizeMode="contain"
                />
              </View>
            )}
            {user?.deliveryman?.vihicle_picture_front && (
              <View style={styles.docItem}>
                <Text style={styles.docTitle}>Foto da Viatura (Frente C/ Matrícula)</Text>
                <Image
                  source={{ uri: getImageUrl(user.deliveryman.vihicle_picture_front) }}
                  style={styles.docImage}
                  resizeMode="contain"
                />
              </View>
            )}
            {user?.deliveryman?.vihicle_picture_back && (
              <View style={styles.docItem}>
                <Text style={styles.docTitle}>Foto da Viatura (Trás C/ Matrícula)</Text>
                <Image
                  source={{ uri: getImageUrl(user.deliveryman.vihicle_picture_back) }}
                  style={styles.docImage}
                  resizeMode="contain"
                />
              </View>
            )}

            {!user?.deliveryman?.license_front && !user?.deliveryman?.vihicle_picture && (
              <View style={{ alignItems: 'center', marginTop: 50 }}>
                <Ionicons name="document-text-outline" size={60} color="#ccc" />
                <Text style={{ color: '#999', marginTop: 10 }}>Nenhum documento encontrado.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* 🔥 MODAL DE LOGOUT PREMIUM */}
      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={styles.logoutModalOverlay}>
          <View style={styles.logoutModalContainer}>
            <View style={styles.logoutModalIconContainer}>
              <Ionicons name="log-out-outline" size={40} color="#E74C3C" />
            </View>
            <Text style={styles.logoutModalTitle}>Sair da Conta</Text>
            <Text style={styles.logoutModalText}>
              Tem certeza que deseja terminar a sessão atual? Deixará de receber pedidos de viagem até voltar a entrar.
            </Text>
            
            <View style={styles.logoutModalButtons}>
              <TouchableOpacity 
                style={[styles.logoutModalBtn, styles.logoutModalBtnCancel]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.logoutModalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.logoutModalBtn, styles.logoutModalBtnConfirm]}
                onPress={confirmLogout}
              >
                <Text style={styles.logoutModalBtnConfirmText}>Sim, Sair</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Modal Editar / Inserir Dados Completos da Viatura */}
      <Modal 
        visible={showVehicleEditModal} 
        transparent 
        animationType="slide" 
        onRequestClose={() => setShowVehicleEditModal(false)}
      >
        <View style={styles.vSheetOverlay}>
          <TouchableOpacity 
            style={styles.vSheetBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowVehicleEditModal(false)} 
          />
          <View style={styles.vSheetContainer}>
            {/* Sheet Handle */}
            <View style={styles.vSheetHandle} />

            {/* Header */}
            <View style={styles.vSheetHeader}>
              <View style={styles.vSheetHeaderTitleRow}>
                <View style={styles.vSheetIconBadge}>
                  <Ionicons name="car-sport" size={22} color="#0D9488" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vSheetTitle}>
                    {isAddingNewVehicle ? 'Adicionar Nova Viatura' : 'Editar Dados da Viatura'}
                  </Text>
                  <Text style={styles.vSheetSubtitle}>
                    {isAddingNewVehicle ? 'Registe uma nova viatura na sua frota de motorista' : 'Atualize as especificações e o estado técnico'}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.vSheetCloseBtn} 
                  onPress={() => setShowVehicleEditModal(false)}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Scrollable Form Content */}
            <ScrollView 
              style={styles.vSheetScroll} 
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {/* License Plate Field */}
              <View style={styles.vFieldGroup}>
                <Text style={styles.vFieldLabel}>MATRÍCULA DA VIATURA *</Text>
                <View style={styles.vPlateInputWrapper}>
                  <View style={styles.vPlateEmblem}>
                    <Ionicons name="card-outline" size={16} color="#0F172A" />
                    <Text style={styles.vPlateCountry}>MZ</Text>
                  </View>
                  <TextInput
                    style={styles.vPlateInputText}
                    value={editVehicleForm.plateNumber}
                    onChangeText={(val) => setEditVehicleForm({ ...editVehicleForm, plateNumber: val.toUpperCase() })}
                    placeholder="ABC-123-MC"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              {/* Marca & Modelo */}
              <View style={styles.vRowTwo}>
                <View style={[styles.vFieldGroup, { flex: 1 }]}>
                  <Text style={styles.vFieldLabel}>MARCA</Text>
                  <View style={styles.vInputWrapper}>
                    <Ionicons name="car-outline" size={18} color="#64748B" style={styles.vInputIcon} />
                    <TextInput
                      style={styles.vInputText}
                      value={editVehicleForm.brand}
                      onChangeText={(val) => setEditVehicleForm({ ...editVehicleForm, brand: val })}
                      placeholder="ex: Toyota"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
                <View style={[styles.vFieldGroup, { flex: 1 }]}>
                  <Text style={styles.vFieldLabel}>MODELO</Text>
                  <View style={styles.vInputWrapper}>
                    <Ionicons name="construct-outline" size={18} color="#64748B" style={styles.vInputIcon} />
                    <TextInput
                      style={styles.vInputText}
                      value={editVehicleForm.model}
                      onChangeText={(val) => setEditVehicleForm({ ...editVehicleForm, model: val })}
                      placeholder="ex: Hilux"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
              </View>

              {/* Ano & Tipo */}
              <View style={styles.vRowTwo}>
                <View style={[styles.vFieldGroup, { flex: 1 }]}>
                  <Text style={styles.vFieldLabel}>ANO</Text>
                  <View style={styles.vInputWrapper}>
                    <Ionicons name="calendar-outline" size={18} color="#64748B" style={styles.vInputIcon} />
                    <TextInput
                      style={styles.vInputText}
                      keyboardType="numeric"
                      value={editVehicleForm.year}
                      onChangeText={(val) => setEditVehicleForm({ ...editVehicleForm, year: val })}
                      placeholder="2022"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
                <View style={[styles.vFieldGroup, { flex: 1 }]}>
                  <Text style={styles.vFieldLabel}>TIPO DE VIATURA</Text>
                  <View style={styles.vInputWrapper}>
                    <Ionicons name="options-outline" size={18} color="#64748B" style={styles.vInputIcon} />
                    <TextInput
                      style={styles.vInputText}
                      value={editVehicleForm.type}
                      onChangeText={(val) => setEditVehicleForm({ ...editVehicleForm, type: val })}
                      placeholder="Ligeiro / Pesado"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
              </View>

              {/* Capacidade (Kg) & Quilometragem (Km) */}
              <View style={styles.vRowTwo}>
                <View style={[styles.vFieldGroup, { flex: 1 }]}>
                  <Text style={styles.vFieldLabel}>CAPACIDADE (KG)</Text>
                  <View style={styles.vInputWrapper}>
                    <Ionicons name="cube-outline" size={18} color="#64748B" style={styles.vInputIcon} />
                    <TextInput
                      style={styles.vInputText}
                      keyboardType="numeric"
                      value={editVehicleForm.capacityKg}
                      onChangeText={(val) => setEditVehicleForm({ ...editVehicleForm, capacityKg: val })}
                      placeholder="500"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
                <View style={[styles.vFieldGroup, { flex: 1 }]}>
                  <Text style={styles.vFieldLabel}>ODÓMETRO (KM)</Text>
                  <View style={styles.vInputWrapper}>
                    <Ionicons name="speedometer-outline" size={18} color="#64748B" style={styles.vInputIcon} />
                    <TextInput
                      style={styles.vInputText}
                      keyboardType="numeric"
                      value={editVehicleForm.currentOdometer}
                      onChangeText={(val) => setEditVehicleForm({ ...editVehicleForm, currentOdometer: val })}
                      placeholder="50000"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
              </View>

              {/* Estado Operacional Chips */}
              <View style={styles.vFieldGroup}>
                <Text style={styles.vFieldLabel}>ESTADO OPERACIONAL</Text>
                <View style={styles.vStatusSelectorRow}>
                  {[
                    { label: 'Operacional', color: '#10B981' },
                    { label: 'Em Manutenção', color: '#F59E0B' },
                    { label: 'Inativo', color: '#EF4444' },
                  ].map((item) => {
                    const active = editVehicleForm.status === item.label;
                    return (
                      <TouchableOpacity
                        key={item.label}
                        activeOpacity={0.8}
                        style={[
                          styles.vStatusChip,
                          active && { backgroundColor: item.color, borderColor: item.color },
                        ]}
                        onPress={() => setEditVehicleForm({ ...editVehicleForm, status: item.label })}
                      >
                        <View
                          style={[
                            styles.vStatusDot,
                            { backgroundColor: active ? '#FFF' : item.color },
                          ]}
                        />
                        <Text
                          style={[
                            styles.vStatusChipText,
                            active && { color: '#FFF', fontWeight: '800' },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Motorista Responsável (Locked) */}
              <View style={styles.vFieldGroup}>
                <Text style={styles.vFieldLabel}>MOTORISTA RESPONSÁVEL</Text>
                <View style={[styles.vInputWrapper, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
                  <Ionicons name="lock-closed" size={18} color="#94A3B8" style={styles.vInputIcon} />
                  <TextInput
                    style={[styles.vInputText, { color: '#64748B', fontWeight: '600' }]}
                    editable={false}
                    value={editVehicleForm.assignedDriverName || user?.name || ''}
                  />
                  <View style={styles.vLockBadge}>
                    <Text style={styles.vLockBadgeText}>Atribuído</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Footer Action Button */}
            <View style={styles.vSheetFooter}>
              <TouchableOpacity
                style={styles.vSaveBtn}
                onPress={handleSaveVehicleData}
                disabled={savingVehicle}
                activeOpacity={0.85}
              >
                {savingVehicle ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.vSaveBtnText}>Guardar Alterações</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50, // Mesma cor do Home
  },
  headerGradient: {
    paddingTop: 40,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 10,
    elevation: 5,
    shadowColor: '#9D4EDD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  topHeader: {
    paddingHorizontal: 24,
    paddingBottom: 10,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
  },
  profileHeader: {
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  premiumBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  scoreChartContainer: {
    backgroundColor: '#1E1E24',
    padding: 20,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  chartWrapper: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartPercentageText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFF',
  },
  chartSubtitleText: {
    fontSize: 14,
    color: '#AAA',
    marginTop: 4,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userSince: {
    fontSize: 12,
    color: '#999',
  },
  statsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '47%',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  // 🔥 ESTILOS PARA O MODAL DE LOGOUT PREMIUM
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutModalContainer: {
    backgroundColor: '#FFFFFF',
    width: '88%',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
  },
  logoutModalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoutModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  logoutModalText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  logoutModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  logoutModalBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutModalBtnCancel: {
    backgroundColor: '#F1F5F9',
  },
  logoutModalBtnCancelText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '700',
  },
  logoutModalBtnConfirm: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  logoutModalBtnConfirmText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  vehicleSection: {
    padding: 16,
  },
  modernVehicleCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  vehicleImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(30, 60, 114, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modernVehicleInfo: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  modernVehicleModel: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  licensePlateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  licensePlateHeader: {
    backgroundColor: '#0033A0',
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  licensePlateCountry: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  licensePlateText: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
    paddingHorizontal: 16,
    color: '#000',
  },
  colorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  colorText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  modernRegistrationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#F9FAFC',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    width: '100%',
  },
  modernRegistrationText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modernDocsButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modernDocsText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  menuSection: {
    padding: 16,
  },
  menuGroup: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(127, 0, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F0',
    marginHorizontal: 24,
    marginVertical: 16,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFE0E0',
    shadowColor: '#FF4757',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E63946',
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
    padding: 20,
  },
  versionText: {
    fontSize: 12,
    color: '#999',
  },
  viewDocsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(127, 0, 255, 0.08)',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    justifyContent: 'center',
  },
  viewDocsText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  closeModalBtn: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
    paddingBottom: 40,
  },
  docItem: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  docTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  docImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  odometerContainer: {
    backgroundColor: '#1E1E2C',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  odometerTitle: {
    color: '#A0A0B0',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  odometerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F0F1A',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333344',
  },
  odometerDigitBox: {
    backgroundColor: '#2A2A3C',
    width: 36,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 6,
    borderTopWidth: 1,
    borderTopColor: '#44445A',
    borderBottomWidth: 2,
    borderBottomColor: '#11111A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  odometerDigit: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  odometerUnit: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  odometerSubtitle: {
    color: '#888899',
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
  },
  // ESTILOS DE VIATURA E GESTÃO OPERACIONAL (ULTRA-PREMIUM DESIGN)
  premiumVehicleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  premiumCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeftBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  vehicleIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primary || '#7F00FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary || '#7F00FF',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  premiumCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  premiumCardSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  premiumEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
  },
  premiumEditBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary || '#7F00FF',
  },
  heroShowcaseBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  realPlateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDE047',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 6,
    overflow: 'hidden',
    paddingRight: 10,
  },
  realPlateCountryStrip: {
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 6,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  realPlateCountryText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },
  realPlateNumberText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginLeft: 8,
    fontFamily: 'monospace',
  },
  premiumStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  premiumStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  specCardItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  specIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
  },
  specMetaLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  specMetaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  premiumDocsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
  },
  premiumDocsBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  operationalManagementCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  operationalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  opIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0D9488',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  opHeaderTexts: {
    flex: 1,
    marginLeft: 12,
  },
  opCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  opCardSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
  },
  opChevronWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  opDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 12,
  },
  opFeaturesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  opFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  opFeatureText: {
    fontSize: 11,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  statusOptionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  statusOptionBtnActive: {
    backgroundColor: '#0D9488',
  },
  statusOptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  statusOptionTextActive: {
    color: '#FFF',
  },
  saveVehicleBtn: {
    backgroundColor: '#0D9488',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  saveVehicleBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },

  /* 🔥 ULTRA-PREMIUM BOTTOM SHEET STYLES FOR VEHICLE EDIT */
  vSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  vSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  vSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: '88%',
    elevation: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  vSheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  vSheetHeader: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 14,
  },
  vSheetHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vSheetIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  vSheetSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  vSheetCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  vSheetScroll: {
    maxHeight: 460,
  },
  vFieldGroup: {
    marginBottom: 14,
  },
  vFieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  vPlateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  vPlateEmblem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
    gap: 4,
  },
  vPlateCountry: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
  },
  vPlateInputText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 1.5,
  },
  vRowTwo: {
    flexDirection: 'row',
    gap: 12,
  },
  vInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  vInputIcon: {
    marginRight: 8,
  },
  vInputText: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  vStatusSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  vStatusChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  vStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  vStatusChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  vLockBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vLockBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  vSheetFooter: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  vSaveBtn: {
    backgroundColor: '#0D9488',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  vSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  /* 🚗 MULTI-VEHICLE SELECTOR BAR STYLES */
  multiVehicleSelectorContainer: {
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  vehicleTabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  vehicleTabChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  vehicleTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  vehicleTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  activeDotBadge: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginLeft: 2,
  },
  addVehicleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
  },
  addVehicleChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0D9488',
  },
  premiumTrashBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  premiumTrashBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  activeUseChipBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 2,
  },
  activeUseChipBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  activeVehicleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 8,
    marginBottom: 12,
  },
  activeVehicleBannerText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  setActiveVehicleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 8,
    marginBottom: 12,
    elevation: 2,
  },
  setActiveVehicleBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* 🚗 STYLES PARA MODAIS PREMIUM DE ELIMINAÇÃO E AVISO */
  vDeleteModalContainer: {
    width: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  vDeleteIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  vDeleteModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  vDeleteModalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  vDeletePlateBadgePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  vDeletePlateNumberText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 1,
  },
  vDeletePlateModelText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  vMinVehicleNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
    width: '100%',
  },
  vMinVehicleNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#B45309',
    fontWeight: '600',
  },
  vMinVehicleCloseBtn: {
    backgroundColor: '#0F172A',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  vMinVehicleCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});




