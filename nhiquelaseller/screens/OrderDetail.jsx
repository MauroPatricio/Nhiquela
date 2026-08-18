import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  Alert, Modal, TextInput, StatusBar, ActivityIndicator, Animated, Linking
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../hooks/createConnectionApi';
import { useToast } from 'react-native-toast-notifications';
import { sendOrderNotificationToUser } from '../utils/notificationUtils';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, RADIUS, SHADOWS, getStatusColor, getStatusBg } from '../constants/theme';

const InfoRow = ({ label, value, highlight }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, highlight && { color: COLORS.primaryLight, fontWeight: '700' }]}>
      {value || '—'}
    </Text>
  </View>
);

const getServiceIconInfo = (name) => {
  if (!name) return { icon: 'toolbox-outline', color: '#7F00FF', bg: '#F3E8FF' };
  const n = name.toLowerCase();
  let iconName = 'toolbox-outline';
  if (n.includes('reboque')) {
    iconName = 'tow-truck';
  } else if (n.includes('mudan')) {
    iconName = 'truck-outline';
  } else if (n.includes('box') || n.includes('carga') || n.includes('encomenda') || n.includes('entregas') || n.includes('entregar')) {
    iconName = 'package-variant-closed';
  } else if (n.includes('gás') || n.includes('gas')) {
    iconName = 'gas-cylinder';
  } else if (n.includes('deliver') || n.includes('mototaxi') || n.includes('mota')) {
    iconName = 'moped';
  }
  const iconColors = {
    'moped': { color: '#10B981', bg: '#D1FAE5' },
    'motorbike': { color: '#10B981', bg: '#D1FAE5' },
    'gas-cylinder': { color: '#0EA5E9', bg: '#E0F2FE' },
    'package-variant-closed': { color: '#A855F7', bg: '#F3E8FF' },
    'truck-outline': { color: '#D97706', bg: '#FEF3C7' },
    'tow-truck': { color: '#EF4444', bg: '#FEE2E2' },
    'dots-horizontal': { color: '#6B7280', bg: '#F3F4F6' },
    'toolbox-outline': { color: '#7F00FF', bg: '#F3E8FF' }
  };
  return { icon: iconName, ...(iconColors[iconName] || iconColors['toolbox-outline']) };
};

const OrderDetail = ({ navigation }) => {
  const toast = useToast();
  const [userData, setUserData] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const route = useRoute();
  const orderParam = route.params?.order || null;
  const orderIdParam = route.params?.orderId || orderParam?._id || null;

  const [currentOrder, setCurrentOrder] = useState(orderParam);
  const [userLogin, setUserLogin] = useState(false);
  const [subcategories, setSubcategories] = useState([]);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState(orderParam?.transportTypeId || null);
  const [viewProofModal, setViewProofModal] = useState(false);
  const [waitingForDriver, setWaitingForDriver] = useState(false);
  const [waitingCountdown, setWaitingCountdown] = useState(60);
  const pulseAnim = React.useRef(new Animated.Value(0)).current;

  const [availableDriversList, setAvailableDriversList] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [radius, setRadius] = useState(5);
  const [rejectedDriverIds, setRejectedDriverIds] = useState([]);
  const [selectedDriverForRequest, setSelectedDriverForRequest] = useState(null);

  const searchTimerRef = React.useRef(null);
  const pollIntervalRef = React.useRef(null);

  const fetchOrderDetails = async () => {
    if (!orderIdParam) return;
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      const token = storedUserData ? JSON.parse(storedUserData).token : '';
      if (!token) return;

      const { data } = await api.get(`/orders/${orderIdParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data) {
        setCurrentOrder(data);
        if (data.transportTypeId) {
          setSelectedTransport(data.transportTypeId);
        }
        fetchSubcategories(data);
        // Se o motorista aceitou, fecha o modal de busca/espera
        if (data.deliveryman && (data.deliveryman.id || data.deliveryman.name)) {
          setWaitingForDriver(false);
          setIsSearching(false);
          setAvailableDriversList([]);
        } else if (waitingForDriver && data.requestServiceId) {
          try {
            const reqRes = await api.get(`/request-service/${data.requestServiceId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const rs = reqRes.data;
            if (rs && (rs.status === 'Motorista indisponível' || rs.status === 'Rejeitado' || rs.status === 'Cancelado')) {
              if (selectedDriverForRequest) {
                setRejectedDriverIds(old => [...old, selectedDriverForRequest._id]);
              }
              setSelectedDriverForRequest(null);
              setWaitingForDriver(false);
              setIsSearching(true);
              toast.show('O motorista rejeitou a solicitação. Procurando outros...', { type: 'warning', placement: 'top' });
            }
          } catch (err) {
            console.log('Erro ao checar status do request service:', err);
          }
        }
      }
    } catch (error) {
      console.log('Error fetching order details:', error);
    }
  };

  useEffect(() => {
    if (!isSearching) return;

    const startPulse = () => {
      pulseAnim.setValue(0);
      Animated.loop(
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    };
    startPulse();

    const searchDrivers = async () => {
      try {
        if (!userData || !currentOrder) return;
        const sellerLoc = currentOrder.seller?.location || userData.seller?.location;
        const lat = sellerLoc?.lat;
        const lng = sellerLoc?.lng;

        if (!lat || !lng) {
          toast.show('Erro: Estabelecimento sem coordenadas GPS.', { type: 'danger', placement: 'top' });
          setIsSearching(false);
          return;
        }

        const response = await api.get('/drivers/available', {
          params: {
            lat,
            lng,
            radius,
            serviceId: selectedTransport,
          },
          headers: { Authorization: `Bearer ${userData.token}` }
        });

        let drivers = response.data?.drivers || response.data || [];
        drivers = drivers.filter(d => !rejectedDriverIds.includes(d._id));

        if (drivers.length > 0) {
          clearInterval(pollIntervalRef.current);
          clearTimeout(searchTimerRef.current);
          setIsSearching(false);
          setAvailableDriversList(drivers);
        }
      } catch (err) {
        console.log('Erro ao procurar motoristas:', err);
      }
    };

    searchDrivers();
    pollIntervalRef.current = setInterval(searchDrivers, 3000);

    searchTimerRef.current = setTimeout(() => {
      setRadius(r => r + 2);
    }, 60000);

    return () => {
      clearTimeout(searchTimerRef.current);
      clearInterval(pollIntervalRef.current);
    };
  }, [isSearching, radius, rejectedDriverIds]);

  const sendRequestToDriver = async (driver) => {
    setSelectedDriverForRequest(driver);
    setWaitingCountdown(60);
    setWaitingForDriver(true);
    setAvailableDriversList([]); // Fecha modal de lista

    try {
      if (!userData) return;
      const subcat = subcategories.find(s => s._id === selectedTransport);
      
      const payload = {
        targetDriverId: driver._id,
      };
      if (subcat) {
        payload.transportTypeId = subcat._id;
        payload.transportType = subcat.name;
      }

      const { data } = await api.put(`/orders/${currentOrder._id}/toDeliv`, payload, {
        headers: { Authorization: `Bearer ${userData.token}` }
      });
      setCurrentOrder(data.order);
      toast.show(`Solicitação enviada para ${driver.name}!`, { type: 'success', duration: 4000, placement: 'top' });
    } catch (err) {
      console.log('Erro ao enviar solicitação para o motorista:', err);
      toast.show('Erro ao enviar solicitação.', { type: 'danger', placement: 'top' });
      setWaitingForDriver(false);
      setIsSearching(true);
    }
  };

  useEffect(() => {
    if (waitingForDriver && waitingCountdown === 0) {
      if (selectedDriverForRequest) {
        setRejectedDriverIds(old => [...old, selectedDriverForRequest._id]);
      }
      setSelectedDriverForRequest(null);
      setWaitingForDriver(false);
      setIsSearching(true);
      toast.show('O motorista não respondeu. Procurando novos motoristas...', { type: 'warning', placement: 'top' });
    }
  }, [waitingForDriver, waitingCountdown]);

  const checkIfUserExist = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      const storedUserId = await AsyncStorage.getItem('id');
      if (storedUserData && storedUserId) {
        const parsedUserData = JSON.parse(storedUserData);
        if (parsedUserData._id === storedUserId) {
          setUserData(parsedUserData);
          setUserLogin(true);
        } else {
          navigation.navigate('Login');
        }
      } else {
        navigation.navigate('Login');
      }
    } catch (error) {
      navigation.navigate('Login');
    }
  };

  const fetchSubcategories = async (orderData) => {
    try {
      const activeOrder = orderData || currentOrder;
      const { data } = await api.get('/provider-subcategories');
      if (data && data.length > 0) {
        let filtered = data.filter(s => 
          s.isActive !== false && 
          s.providerTypeId?.classificationId?.name === 'SERVICE'
        );

        const orderVehicleId = activeOrder?.transportTypeId?._id || activeOrder?.transportTypeId;
        const orderVehicleName = activeOrder?.transportType;

        if (orderVehicleId || orderVehicleName) {
          filtered = filtered.filter(sub => {
            if (sub.vehicleTypes && sub.vehicleTypes.length > 0) {
              return sub.vehicleTypes.some(vt => {
                const vtId = vt._id || vt;
                if (orderVehicleId && vtId?.toString() === orderVehicleId.toString()) return true;
                if (orderVehicleName && vt.name?.toLowerCase() === orderVehicleName.toLowerCase()) return true;
                return false;
              });
            }
            if (orderVehicleName && sub.name?.toLowerCase()?.includes(orderVehicleName.toLowerCase())) return true;
            return false;
          });
        }

        setSubcategories(filtered);
        if (filtered.length > 0 && !selectedTransport) {
          setSelectedTransport(filtered[0]._id);
        }
      }
    } catch (e) {
      console.log('Error fetching subcategories', e);
    }
  };

  useEffect(() => { 
    checkIfUserExist(); 
    fetchSubcategories();
    fetchOrderDetails();
  }, [orderIdParam]);

  // Loop da animação de pulso do radar
  useEffect(() => {
    let anim;
    if (waitingForDriver) {
      pulseAnim.setValue(0);
      anim = Animated.loop(
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      anim.start();
    } else {
      pulseAnim.setValue(0);
    }
    return () => {
      if (anim) anim.stop();
    };
  }, [waitingForDriver]);

  // Contador de busca e Polling de actualização de estado
  useEffect(() => {
    let timer;
    let pollInterval;

    const isActiveStatus = (status) => {
      if (!status) return true;
      const s = status.toLowerCase();
      return s !== 'finalizado' && s !== 'entregue' && s !== 'cancelado' && s !== 'recusado';
    };

    const isOrderActive = currentOrder && isActiveStatus(currentOrder.status);

    if (waitingForDriver) {
      timer = setInterval(() => {
        setWaitingCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    if (isOrderActive || waitingForDriver) {
      pollInterval = setInterval(() => {
        fetchOrderDetails();
      }, 4000);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [waitingForDriver, currentOrder?.status]);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const withLoading = async (fn) => {
    setIsLoading(true);
    try { await fn(); }
    finally { setIsLoading(false); }
  };

  const acceptOrder = async (orderId) => withLoading(async () => {
    if (!userData) throw new Error('User is not logged in');
    const { data } = await api.put(`/orders/${orderId}/accept`, {}, { headers: { Authorization: `Bearer ${userData.token}` } });
    setCurrentOrder(data.order);
    await sendOrderNotificationToUser({
      userId: data.order.user._id, orderId: data.order._id,
      orderCode: data.order.code, title: 'Seu pedido foi aceito!',
      body: `O pedido nº ${data.order.code} foi aceito pelo fornecedor.`,
      status: 'Aceito',
    });
    toast.show('Pedido aceito! O cliente será notificado.', { type: 'success', duration: 4000, placement: 'top' });
  });

  const confirmAvailableToDeliv = () => {
    setShowTransportModal(true);
  };

  const availableToDelivOrder = async () => {
    setShowTransportModal(false);
    if (!userData) return;
    const subcat = subcategories.find(s => s._id === selectedTransport);
    if (!subcat) {
      toast.show('Selecione o tipo de transporte para continuar.', { type: 'warning', placement: 'top' });
      return;
    }
    setRadius(5);
    setRejectedDriverIds([]);
    setAvailableDriversList([]);
    setSelectedDriverForRequest(null);
    setIsSearching(true);
  };

  const orderInTransit = async (orderId) => withLoading(async () => {
    if (!userData) return;
    const { data } = await api.put(`/orders/${orderId}/intransit`, {}, { headers: { Authorization: `Bearer ${userData.token}` } });
    setCurrentOrder(data.order);
    await api.post('/notifications/send-to-user', {
      userId: data.order.user, title: 'Pedido a caminho!',
      body: `Seu pedido ${data.order.code} está a caminho.`,
      data: { orderId: data.order._id, type: 'order', status: 'A Caminho' },
    });
    toast.show('Pedido em trânsito! Cliente notificado.', { type: 'success', duration: 4000, placement: 'top' });
  });

  const cancelOrderPop = async (orderId) => {
    try {
      if (!userData) return;
      if (!message?.trim()) {
        toast.show('Indique o motivo do cancelamento.', { type: 'warning', placement: 'top' });
        return;
      }
      const { data } = await api.put(`/orders/${orderId}/cancel`, { message }, { headers: { Authorization: `Bearer ${userData.token}` } });
      setCurrentOrder(data.order);
      await api.post('/notifications/send-to-user', {
        userId: data.order.user, title: 'Pedido cancelado',
        body: `O seu pedido ${data.order.code} foi cancelado pelo fornecedor.`,
        data: { orderId: data.order._id, type: 'order', status: 'Cancelado' },
      });
      toast.show('Pedido cancelado. Cliente foi notificado.', { type: 'success', duration: 4000, placement: 'top' });
    } catch (error) {
      toast.show('Erro ao cancelar o pedido. Tente novamente.', { type: 'danger', duration: 4000, placement: 'top' });
    } finally {
      setModalVisible(false);
      setMessage('');
    }
  };

  const deleteOrderPop = (orderId) => {
    Alert.alert("Apagar Pedido", "Tem a certeza que deseja apagar este pedido?", [
      { text: "Cancelar" },
      { text: "Apagar", style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/orders/${orderId}`, { headers: { Authorization: `Bearer ${userData.token}` } });
          toast.show('Pedido removido com sucesso.', { type: 'success', placement: 'top' });
          navigation.goBack();
        } catch (err) {
          toast.show('Erro ao remover o pedido.', { type: 'danger', placement: 'top' });
        }
      }},
    ]);
  };

  if (!currentOrder) {
    return (
      <SafeAreaView style={[styles.container, { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const groupedItems = currentOrder.orderItems.reduce((acc, item) => {
    const itemId = item._id;
    const quantity = Number(item.quantity) || 0;
    if (acc[itemId]) {
      acc[itemId].quantity += quantity;
    } else {
      acc[itemId] = { ...item, quantity };
    }
    return acc;
  }, {});

  const groupedItemsArray = Object.values(groupedItems);
  const statusColor = getStatusColor(currentOrder.status);
  const statusBg = getStatusBg(currentOrder.status);

  const stepLabels = ['Pendente', 'Aceite', 'Disponível p/ entrega', 'Em trânsito', 'Entregue'];
  const currentStep = currentOrder.stepStatus || 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes do Pedido</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: COLORS.primaryGlow }]} onPress={() => navigation.navigate('OrderChat', { orderId: currentOrder._id })}>
            <Ionicons name="chatbubbles-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteOrderPop(currentOrder._id)}>
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>

        {/* Status Card */}
        <View style={[styles.statusCard, { borderColor: statusColor, backgroundColor: statusBg }]}>
          <View>
            <Text style={styles.statusLabel}>Estado do Pedido</Text>
            <Text style={[styles.statusValue, { color: statusColor }]}>{currentOrder.status}</Text>
          </View>
          <View style={[styles.statusIcon, { backgroundColor: statusColor + '30' }]}>
            <MaterialCommunityIcons name="package-variant" size={26} color={statusColor} />
          </View>
        </View>

        {/* Timeline */}
        {currentOrder.stepStatus < 8 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Progresso</Text>
            <View style={styles.timeline}>
              {stepLabels.map((label, idx) => {
                const done = idx <= (currentStep - 1);
                const active = idx === (currentStep - 1);
                return (
                  <View key={idx} style={styles.timelineStep}>
                    <View style={[styles.timelineDot, done && styles.timelineDotDone, active && styles.timelineDotActive]}>
                      {done && <Ionicons name="checkmark" size={10} color="#fff" />}
                    </View>
                    {idx < stepLabels.length - 1 && (
                      <View style={[styles.timelineLine, done && styles.timelineLineDone]} />
                    )}
                    <Text style={[styles.timelineLabel, done && { color: COLORS.text }, active && { color: COLORS.primary, fontWeight: '700' }]}>
                      {label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Info do Pedido */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informações do Pedido</Text>
          <InfoRow label="Código" value={`#${currentOrder.code}`} highlight />
          <InfoRow label="Método de pagamento" value={currentOrder.paymentMethod} />
          <InfoRow label="Pagamento efectuado" value={currentOrder.isPaid ? '✅ Sim' : '❌ Não'} />
          {currentOrder.isPaid && <InfoRow label="Data de pagamento" value={formatDate(currentOrder.paidAt)} />}
          <InfoRow label="Taxa de entrega" value={`${currentOrder.addressPrice} MT`} />
          <InfoRow label="Transporte Solicitado" value={currentOrder.transportType || 'N/A'} />
          <InfoRow label="Valor recebido" value={`${currentOrder.totalPrice} MT`} highlight />
          {currentOrder.stepStatus === 8 && currentOrder.canceledReason && (
            <InfoRow label="Motivo de cancelamento" value={currentOrder.canceledReason} />
          )}
        </View>

        {/* Comprovativo de Pagamento */}
        {currentOrder.paymentProof && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Comprovativo de Pagamento</Text>
            <View style={{ alignItems: 'center', marginTop: 10 }}>
              <TouchableOpacity 
                style={{ width: '100%', height: 200, borderRadius: SIZES.radius, overflow: 'hidden', position: 'relative', marginBottom: 8 }}
                onPress={() => setViewProofModal(true)}
                activeOpacity={0.9}
              >
                <Image 
                  source={{ uri: currentOrder.paymentProof }} 
                  style={{ width: '100%', height: '100%' }} 
                  resizeMode="cover"
                />
                <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="eye-outline" size={20} color="#fff" />
                </View>
              </TouchableOpacity>
              <Text style={{ marginTop: 8, color: COLORS.primary, fontWeight: 'bold' }}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} /> Cliente enviou comprovativo
              </Text>
            </View>
          </View>
        )}

        {/* Info do Cliente */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cliente</Text>
          <InfoRow label="Nome" value={currentOrder?.deliveryAddress?.fullName || currentOrder?.user?.name} />
          <InfoRow label="Contacto" value={currentOrder?.deliveryAddress?.phoneNumber || currentOrder?.user?.phoneNumber} />
          <InfoRow label="Endereço de entrega" value={currentOrder?.deliveryAddress?.address || currentOrder?.address} />
        </View>

        {/* Prestador de Serviço */}
        {currentOrder.deliveryman && (currentOrder.deliveryman.id || currentOrder.deliveryman.name) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Prestador de Serviço</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <Image 
                source={{ uri: currentOrder.deliveryman.photo || 'https://via.placeholder.com/60' }} 
                style={{ width: 50, height: 50, borderRadius: 25, marginRight: 12 }} 
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text }}>
                  {currentOrder.deliveryman.name}
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
                  {currentOrder.deliveryman.transport_type || 'Transporte'} • {currentOrder.deliveryman.transport_registration || 'Sem Matrícula'}
                </Text>
              </View>
              {currentOrder.deliveryman.phoneNumber && (
                <TouchableOpacity 
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primaryGlow, justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => {
                    const url = `tel:${currentOrder.deliveryman.phoneNumber}`;
                    Linking.openURL(url).catch(() => Alert.alert('Erro', 'Não foi possível efetuar a ligação'));
                  }}
                >
                  <Ionicons name="call" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Produtos */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Produtos ({groupedItemsArray.length})</Text>
          {groupedItemsArray.map(item => (
            <View key={item._id} style={styles.productRow}>
              <Image source={{ uri: item.image }} style={styles.productImage} />
              <View style={{ flex: 1 }}>
                <View style={styles.productTitleRow}>
                  <Text style={styles.productName}>{item.name}</Text>
                  {item.onSale && (
                    <View style={styles.saleBadge}><Text style={styles.saleBadgeText}>Promoção</Text></View>
                  )}
                </View>
                {item.brand && <Text style={styles.productMeta}>Marca: {item.brand}</Text>}
                {item.onSale ? (
                  <>
                    <Text style={[styles.productMeta, { textDecorationLine: 'line-through', color: COLORS.textMuted }]}>
                      {item.priceFromSeller} MT
                    </Text>
                    <Text style={[styles.productMeta, { color: COLORS.success, fontWeight: '700' }]}>
                      {item.discount} MT (com desconto)
                    </Text>
                  </>
                ) : (
                  <Text style={styles.productMeta}>Preço: {item.price} MT</Text>
                )}
                <Text style={[styles.productMeta, { color: COLORS.primaryLight, fontWeight: '600' }]}>
                  Qtd: {item.quantity} unid.
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Botões de Ação */}
        {currentOrder.status === 'Pendente' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={() => acceptOrder(currentOrder._id)}
              disabled={isLoading}
            >
              {isLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Aceitar</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => setModalVisible(true)}>
              <Ionicons name="close-circle-outline" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Rejeitar</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentOrder.status === 'Aceite' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={confirmAvailableToDeliv}
              disabled={isLoading}
            >
              {isLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Ionicons name="bag-check-outline" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Disponível p/ entrega</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => setModalVisible(true)}>
              <Ionicons name="close-circle-outline" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}

        {(currentOrder.status === 'Disponível para entrega' || currentOrder.status === 'Pronto') && (
          <View style={styles.actionRow}>
            {(!currentOrder.deliveryman || !currentOrder.deliveryman.name) && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: COLORS.primary, flex: 1 }]}
                onPress={confirmAvailableToDeliv}
                disabled={isLoading}
              >
                <Ionicons name="search-outline" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Pesquisar Motorista</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn, { flex: 1 }]}
              onPress={() => orderInTransit(currentOrder._id)}
              disabled={isLoading}
            >
              {isLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Ionicons name="car-outline" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Marcar Em Trânsito</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modal de cancelamento */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Motivo do Cancelamento</Text>
            <Text style={styles.modalSubtitle}>Este texto será enviado ao cliente.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Produto esgotado..."
              placeholderTextColor={COLORS.textMuted}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn, { flex: 1 }]}
                onPress={() => cancelOrderPop(currentOrder._id)}
              >
                <Text style={styles.actionBtnText}>Confirmar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { flex: 1, backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border }]}
                onPress={() => { setModalVisible(false); setMessage(''); }}
              >
                <Text style={[styles.actionBtnText, { color: COLORS.textSecondary }]}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal animationType="slide" transparent={true} visible={showTransportModal} onRequestClose={() => setShowTransportModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '85%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.modalTitle}>Confirmar Transporte</Text>
              <TouchableOpacity onPress={() => setShowTransportModal(false)}>
                <Ionicons name="close-circle" size={26} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              O cliente solicitou <Text style={{fontWeight:'bold'}}>{currentOrder.transportType || 'N/A'}</Text>. Selecione o tipo de serviço para a pesquisa de prestadores de entrega:
            </Text>

            <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 }}>
                {subcategories.map((s) => {
                  const isSelected = selectedTransport === s._id;
                  const iconInfo = getServiceIconInfo(s.name);
                  
                  return (
                    <TouchableOpacity
                      key={s._id}
                      style={{
                        width: '48%',
                        backgroundColor: isSelected ? COLORS.primaryGlow : COLORS.surface2,
                        borderColor: isSelected ? COLORS.primary : COLORS.borderLight,
                        borderWidth: 1.5,
                        borderRadius: 16,
                        padding: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 120,
                        shadowColor: isSelected ? COLORS.primary : 'transparent',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: isSelected ? 0.15 : 0,
                        shadowRadius: 6,
                        elevation: isSelected ? 4 : 0,
                      }}
                      onPress={() => setSelectedTransport(s._id)}
                    >
                      <View style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: iconInfo.bg,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: 10,
                      }}>
                        <MaterialCommunityIcons name={iconInfo.icon} size={28} color={iconInfo.color} />
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? COLORS.primary : COLORS.text, textAlign: 'center', marginBottom: 4 }} numberOfLines={1}>
                        {s.name}
                      </Text>
                      {s.description && (
                        <Text style={{ fontSize: 10, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 14 }} numberOfLines={2}>
                          {s.description}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={[styles.modalBtns, { marginTop: 12 }]}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.surface2, flex: 1 }]} onPress={() => setShowTransportModal(false)}>
                <Text style={{ color: COLORS.text, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: COLORS.primary, flex: 2 }]} 
                onPress={availableToDelivOrder} 
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Confirmar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Visualizar Comprovativo Modal */}
      <Modal visible={viewProofModal} transparent={true} animationType="fade" onRequestClose={() => setViewProofModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity 
            style={{ position: 'absolute', top: 50, right: 25, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 24 }} 
            onPress={() => setViewProofModal(false)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {currentOrder.paymentProof ? (
            <Image 
              source={{ uri: currentOrder.paymentProof }} 
              style={{ width: '92%', height: '82%' }} 
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>

      {/* Procurando/Pesquisando Prestadores Radar Modal */}
      <Modal visible={isSearching} transparent animationType="fade">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View style={{
            backgroundColor: '#FFF',
            borderRadius: 28,
            padding: 32,
            width: '88%',
            alignItems: 'center',
            elevation: 20,
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.2,
            shadowRadius: 20,
          }}>
            <View style={{ width: 110, height: 110, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
              <Animated.View style={{
                position: 'absolute',
                width: 110,
                height: 110,
                borderRadius: 55,
                backgroundColor: 'rgba(127, 0, 255, 0.15)',
                transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }) }],
                opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] })
              }} />
              <Animated.View style={{
                position: 'absolute',
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: 'rgba(127, 0, 255, 0.2)',
                transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
                opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
              }} />
              <View style={{ backgroundColor: '#F3E8FF', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' }}>
                <MaterialCommunityIcons name="radar" size={32} color={COLORS.primary} />
              </View>
            </View>

            <Text style={{ fontSize: 20, fontWeight: '800', color: '#1A1A1A', textAlign: 'center' }}>
              Buscando prestadores...
            </Text>
            <Text style={{ color: '#6B7280', marginTop: 6, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
              Procurando motoristas disponíveis num raio de {radius} km do seu estabelecimento.
            </Text>

            <TouchableOpacity 
              style={{
                width: '100%',
                paddingVertical: 14,
                backgroundColor: '#F3F4F6',
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 24
              }}
              onPress={() => setIsSearching(false)}
            >
              <Text style={{ color: '#4B5563', fontWeight: '700', fontSize: 15 }}>Cancelar Busca</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Lista de Motoristas Disponíveis */}
      <Modal
        visible={availableDriversList.length > 0 && !waitingForDriver && !isSearching}
        transparent
        animationType="slide"
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 24,
            maxHeight: '80%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 10,
          }}>
            <View style={{ width: 44, height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, alignSelf: 'center', marginBottom: 20 }} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>Prestadores Disponíveis</Text>
              <TouchableOpacity
                onPress={() => {
                  setAvailableDriversList([]);
                  setRejectedDriverIds([]);
                  setIsSearching(true);
                }}
                style={{ padding: 4 }}
              >
                <MaterialCommunityIcons name="refresh" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>
              Selecione o motorista para recolha no seu estabelecimento e entrega ao cliente (pago na entrega).
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {availableDriversList.map((driver, index) => {
                let baseFare = 0;
                if (driver.deliveryman?.allowCustomPrice && driver.deliveryman?.customPrice) {
                  baseFare = driver.deliveryman.customPrice;
                } else if (driver.deliveryman?.assigned_base_fee) {
                  baseFare = driver.deliveryman.assigned_base_fee;
                }
                const driverRating = Number(driver.deliveryman?.averageRating || driver.rating || 5.0).toFixed(1);

                return (
                  <TouchableOpacity
                    key={driver._id || index}
                    activeOpacity={0.7}
                    onPress={() => sendRequestToDriver(driver)}
                    style={{
                      padding: 16,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      borderRadius: 20,
                      marginBottom: 12,
                      backgroundColor: '#F9FAFB',
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Image
                      source={
                        driver.profileImage
                          ? { uri: driver.profileImage }
                          : { uri: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png' }
                      }
                      style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#E5E7EB' }}
                    />
                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937' }} numberOfLines={1}>
                        {driver.name}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                          <MaterialCommunityIcons name="star" size={14} color="#D97706" />
                          <Text style={{ fontSize: 12, color: '#D97706', marginLeft: 3, fontWeight: '700' }}>
                            {driverRating}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12, color: '#9CA3AF' }}>•</Text>
                        <Text style={{ fontSize: 13, color: '#4B5563', fontWeight: '500' }}>
                          {driver.deliveryman?.transport_type || 'Motorista'}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                      <Text style={{ fontSize: 13, color: '#9CA3AF', fontWeight: '500' }}>Base</Text>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.primary, marginTop: 2 }}>
                        {baseFare > 0 ? `${baseFare.toFixed(2)} MT` : 'Grátis'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={{
                width: '100%',
                paddingVertical: 14,
                backgroundColor: '#F3F4F6',
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 8
              }}
              onPress={() => setAvailableDriversList([])}
            >
              <Text style={{ color: '#4B5563', fontWeight: '700', fontSize: 15 }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Aguardando Confirmação do Prestador Selecionado Modal */}
      <Modal visible={waitingForDriver} transparent animationType="fade">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View style={{
            backgroundColor: '#FFF',
            borderRadius: 28,
            padding: 32,
            width: '88%',
            alignItems: 'center',
            elevation: 20,
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.2,
            shadowRadius: 20,
          }}>
            <View style={{ width: 110, height: 110, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
              <Animated.View style={{
                position: 'absolute',
                width: 110,
                height: 110,
                borderRadius: 55,
                backgroundColor: 'rgba(127, 0, 255, 0.15)',
                transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }) }],
                opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] })
              }} />
              <Animated.View style={{
                position: 'absolute',
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: 'rgba(127, 0, 255, 0.2)',
                transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
                opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
              }} />
              <View style={{ backgroundColor: '#F3E8FF', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: '900', color: COLORS.primary }}>{waitingCountdown}</Text>
              </View>
            </View>

            <Text style={{ fontSize: 20, fontWeight: '800', color: '#1A1A1A', textAlign: 'center' }}>
              Aguardando motorista...
            </Text>
            <Text style={{ color: '#6B7280', marginTop: 6, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
              Solicitação enviada para {selectedDriverForRequest?.name || 'motorista'}. Aguarde a aceitação do parceiro.
            </Text>

            <TouchableOpacity 
              style={{
                width: '100%',
                paddingVertical: 14,
                backgroundColor: '#F3F4F6',
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 24
              }}
              onPress={() => {
                setWaitingForDriver(false);
                setSelectedDriverForRequest(null);
                setWaitingCountdown(60);
              }}
            >
              <Text style={{ color: '#4B5563', fontWeight: '700', fontSize: 15 }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: SIZES.xl,
    fontWeight: '800',
  },
  statusIcon: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.md,
  },
  cardTitle: {
    fontSize: SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '80',
  },
  infoLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: SIZES.sm,
    color: COLORS.text,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  timelineStep: {
    alignItems: 'center',
    flex: 1,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.surface2,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  timelineDotDone: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timelineDotActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryGlow,
  },
  timelineLine: {
    position: 'absolute',
    top: 9,
    left: '60%',
    right: '-60%',
    height: 2,
    backgroundColor: COLORS.border,
    zIndex: -1,
  },
  timelineLineDone: {
    backgroundColor: COLORS.primary,
  },
  timelineLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  productRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '60',
    alignItems: 'flex-start',
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surface2,
  },
  productTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  productName: {
    fontSize: SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  productMeta: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  saleBadge: {
    backgroundColor: COLORS.warningBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  saleBadgeText: {
    color: COLORS.warning,
    fontSize: 10,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: RADIUS.full,
    gap: 8,
    ...SHADOWS.glow,
  },
  acceptBtn: {
    backgroundColor: COLORS.success,
  },
  rejectBtn: {
    backgroundColor: COLORS.error,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: SIZES.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: COLORS.surfaceCard,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    borderTopWidth: 1,
    borderColor: COLORS.borderLight,
  },
  modalTitle: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.lg,
    padding: 14,
    color: COLORS.text,
    fontSize: SIZES.base,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 12,
  },
});

export default OrderDetail;