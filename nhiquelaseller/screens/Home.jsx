import React, { useEffect, useState, useRef, useCallback, useMemo, memo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, RefreshControl, StatusBar, Modal, DeviceEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import api from '../hooks/createConnectionApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import FlashMessage, { showMessage } from "react-native-flash-message";
import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, RADIUS, SHADOWS, getStatusColor } from '../constants/theme';
import useSocket from '../hooks/useSocket';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const Home = () => {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [userData, setUserData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [availableStatuses, setAvailableStatuses] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Realtime Incoming Order Modal States
  const [incomingOrder, setIncomingOrder] = useState(null);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [selectedRejectReason, setSelectedRejectReason] = useState('Sem estoque disponível');
  const [orderModalTimeLeft, setOrderModalTimeLeft] = useState(900); // 15 min em segundos
  const orderModalTimerRef = useRef(null);

  const socket = useSocket();
  const pollingRef = useRef(null);
  const isPollingRef = useRef(false);
  const ordersRef = useRef([]);
  const navigation = useNavigation();
  const notificationListener = useRef();
  const responseListener = useRef();

  const updatePushToken = useCallback(async (userId, newPushToken) => {
    if (!userId || !newPushToken) return;
    try {
      await api.patch(`/users/updatePushToken/${userId}`, { pushToken: newPushToken });
    } catch (error) {
      console.log('Erro ao atualizar PushToken:', error.message);
    }
  }, []);

  const registerForPushNotificationsAsync = useCallback(async (user) => {
    if (!user) return;
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      if (existingStatus !== 'granted') {
        setShowNotificationPrompt(true);
        return; // wait for modal
      }
      
      const token = (await Notifications.getDevicePushTokenAsync()).data;
      setExpoPushToken(token);
      await updatePushToken(user._id, token);
    } catch (error) {
      console.log("Erro ao registrar notificações:", error.message);
    }
  }, [updatePushToken]);

  const handleRequestPermission = async () => {
    setShowNotificationPrompt(false);
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        const token = (await Notifications.getDevicePushTokenAsync()).data;
        setExpoPushToken(token);
        if (userData && userData._id) {
          await updatePushToken(userData._id, token);
        }
      }
    } catch (error) {
      console.log("Erro ao pedir permissão:", error.message);
    }
  };

  const fetchWalletBalance = useCallback(async (user) => {
    if (!user) return;
    try {
      const response = await api.get('/wallet/balance', {
        headers: { authorization: `Bearer ${user.token}` },
      });
      setWalletBalance(Number(response.data?.available_balance ?? response.data?.balance) || 0);
    } catch (error) {
      if (error.response?.status === 401) {
        stopPolling();
      } else {
        console.log("⚠️ Erro ao buscar saldo:", error.message);
      }
    }
  }, [stopPolling]);

  const fetchData = useCallback(async (user, showNotification = false) => {
    if (!user) return;
    try {
      const response = await api.get(`/orders/sellerordersview?seller=${user._id}`, {
        headers: { authorization: `Bearer ${user.token}` },
      });
      if (response.status === 200) {
        const newOrders = response.data.orders;
        if (showNotification && newOrders.length > ordersRef.current.length) {
          const newOrdersCount = newOrders.length - ordersRef.current.length;
          showMessage({
            message: `🛒 ${newOrdersCount} novo(s) pedido(s)`,
            description: "Atualizando lista...",
            type: "success",
            icon: "auto",
            duration: 2000,
          });
        }
        ordersRef.current = newOrders;
        setOrders(newOrders);
        setAvailableStatuses([...new Set(newOrders.map(o => o.status))]);
        setLastUpdate(new Date());
      }
    } catch (error) {
      if (error.response?.status === 401) {
        stopPolling();
      } else {
        console.log("⚠️ Erro ao buscar pedidos:", error.message);
      }
    }
  }, [stopPolling]);

  const startPolling = useCallback((user) => {
    isPollingRef.current = true;
    
    const poll = async () => {
      if (!isPollingRef.current) return;
      try {
        if (user) {
          await fetchData(user, true);
          await fetchWalletBalance(user);
        }
      } catch (e) {
        // Ignore errors during polling to avoid crashing
      } finally {
        if (isPollingRef.current) {
          pollingRef.current = setTimeout(poll, 20000);
        }
      }
    };

    if (pollingRef.current) clearTimeout(pollingRef.current);
    pollingRef.current = setTimeout(poll, 20000);
  }, [fetchData, fetchWalletBalance]);

  const stopPolling = useCallback(() => {
    isPollingRef.current = false;
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const validateAndSetUser = useCallback(async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('id');
      if (!storedUserId) throw new Error("Usuário não encontrado");
      
      try {
        const { data } = await api.get(`/users/${storedUserId}`);
        
        // Preserve token
        const storedUserDataStr = await AsyncStorage.getItem('userData');
        const token = storedUserDataStr ? JSON.parse(storedUserDataStr).token : null;
        const updatedData = { ...data, token };

        setUserData(updatedData);
        await AsyncStorage.setItem('userData', JSON.stringify(updatedData));
        DeviceEventEmitter.emit('userDataUpdated', updatedData);
        return updatedData;
      } catch (apiError) {
        const is404 = (apiError.response && apiError.response.status === 404) || (apiError.message && apiError.message.includes('404'));
        if (is404) {
          console.log(`⚠️ Usuário não encontrado no backend (404). Fazendo logout... ID: ${storedUserId}`);
          await AsyncStorage.multiRemove(['id', 'userData']);
          navigation.navigate('Login');
          return null;
        }
        // Fallback to AsyncStorage if API fails or is offline
        const storedUserData = await AsyncStorage.getItem('userData');
        if (storedUserData) {
          const parsedUserData = JSON.parse(storedUserData);
          setUserData(parsedUserData);
          return parsedUserData;
        }
        throw apiError;
      }
    } catch (error) {
      navigation.navigate('Login');
      return null;
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const initialize = async () => {
        const user = await validateAndSetUser();
        if (!user || !active) return;
        await registerForPushNotificationsAsync(user);
        await Promise.all([fetchData(user), fetchWalletBalance(user)]);
        startPolling(user);
      };
      initialize();
      return () => {
        active = false;
        stopPolling();
      };
    }, [validateAndSetUser, registerForPushNotificationsAsync, fetchData, fetchWalletBalance, startPolling, stopPolling])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const user = await validateAndSetUser();
    if (user) {
      await Promise.all([fetchData(user), fetchWalletBalance(user)]);
    }
    setRefreshing(false);
  }, [validateAndSetUser, fetchData, fetchWalletBalance]);

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(async (notification) => {
      showMessage({
        message: "🛒 Novo pedido recebido",
        description: notification.request.content.body,
        type: "success",
        icon: "auto",
        duration: 3000,
      });
      const user = await validateAndSetUser();
      if (user) {
        await fetchData(user);
        await fetchWalletBalance(user);
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const extraData = response.notification.request.content.data?.extraData;
      const user = await validateAndSetUser();
      if (user) {
        await fetchData(user);
        await fetchWalletBalance(user);
      }
      if (extraData?.orderId) {
        navigation.navigate('OrderDetail', { orderId: extraData.orderId });
      }
    });

    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        validateAndSetUser().then((user) => {
          if (user) {
            fetchData(user);
            fetchWalletBalance(user);
          }
        });
      }
    });

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
      unsubscribeNetInfo();
      stopPolling();
    };
  }, [navigation, validateAndSetUser, fetchData, fetchWalletBalance, stopPolling]);

  // Real-time status and order updates using socket
  useEffect(() => {
    if (!socket || !userData) return;

    const handleUserStatusChanged = async (payload) => {
      console.log('🔄 Sockets: Recebeu userStatusChanged', payload);
      const updatedUser = {
        ...userData,
        isApproved: payload.isApproved,
        isBanned: payload.isBanned,
        banReason: payload.banReason !== undefined ? payload.banReason : userData.banReason
      };
      setUserData(updatedUser);
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      DeviceEventEmitter.emit('userDataUpdated', updatedUser);
      
      if (payload.isApproved && !payload.isBanned) {
        showMessage({ message: 'Conta Aprovada!', description: 'A sua conta foi aprovada.', type: 'success' });
      } else if (payload.isBanned) {
        showMessage({ message: 'Atenção', description: 'O seu registo foi rejeitado/suspenso.', type: 'warning' });
      }
    };

    const handleIncomingOrder = (data) => {
      console.log('🚨 Sockets: Recebeu novo pedido pendente:', data);
      if (data?.order) {
        setIncomingOrder(data.order);
        setOrderModalVisible(true);
        // Calcular quanto tempo restante baseado no createdAt do pedido
        const createdAt = data.order.createdAt ? new Date(data.order.createdAt).getTime() : Date.now();
        const elapsedSecs = Math.floor((Date.now() - createdAt) / 1000);
        const remaining = Math.max(0, 900 - elapsedSecs);
        setOrderModalTimeLeft(remaining);
      }
      fetchData(userData, true);
      fetchWalletBalance(userData);
    };
    
    const handleWalletUpdated = async (payload) => {
      console.log('🔄 Sockets: Recebeu walletUpdated', payload);
      if (payload?.message) {
        showMessage({ message: 'Carteira Atualizada', description: payload.message, type: 'success' });
      }
      if (userData) {
        await fetchWalletBalance(userData);
      }
    };

    socket.on('userStatusChanged', handleUserStatusChanged);
    socket.on('new_order_pending', handleIncomingOrder);
    socket.on('new_order', handleIncomingOrder);
    socket.on('walletUpdated', handleWalletUpdated);

    return () => {
      socket.off('userStatusChanged', handleUserStatusChanged);
      socket.off('new_order_pending', handleIncomingOrder);
      socket.off('new_order', handleIncomingOrder);
      socket.off('walletUpdated', handleWalletUpdated);
    };
  }, [socket, userData, fetchData, fetchWalletBalance]);

  // Countdown timer para o modal de pedido incoming
  useEffect(() => {
    if (!orderModalVisible) {
      if (orderModalTimerRef.current) clearInterval(orderModalTimerRef.current);
      return;
    }
    orderModalTimerRef.current = setInterval(() => {
      setOrderModalTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(orderModalTimerRef.current);
          // Fechar modal quando expirar
          setOrderModalVisible(false);
          setIncomingOrder(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (orderModalTimerRef.current) clearInterval(orderModalTimerRef.current);
    };
  }, [orderModalVisible]);

  const handleAcceptOrder = async () => {
    if (!incomingOrder || !userData) return;
    setIsResponding(true);
    try {
      const { data } = await api.put(
        `/orders/${incomingOrder._id}/respond`,
        { action: 'accept' },
        { headers: { Authorization: `Bearer ${userData.token}` } }
      );
      
      setOrderModalVisible(false);
      setIncomingOrder(null);
      showMessage({
        message: "Pedido Aceite",
        description: `O pedido #${data.order?.code || incomingOrder.code} foi aceite com sucesso!`,
        type: "success",
      });
      fetchData(userData, false);
      fetchWalletBalance(userData);
    } catch (error) {
      console.log("Erro ao aceitar pedido:", error.message);
      showMessage({
        message: "Erro ao aceitar pedido",
        description: error.response?.data?.message || error.message,
        type: "danger",
      });
    } finally {
      setIsResponding(false);
    }
  };

  const handleRejectOrder = async (reason) => {
    if (!incomingOrder || !userData) return;
    setIsResponding(true);
    try {
      const { data } = await api.put(
        `/orders/${incomingOrder._id}/respond`,
        { action: 'reject', reason: reason || selectedRejectReason },
        { headers: { Authorization: `Bearer ${userData.token}` } }
      );

      setRejectModalVisible(false);
      setOrderModalVisible(false);
      setIncomingOrder(null);
      showMessage({
        message: "Pedido Rejeitado",
        description: `O pedido #${incomingOrder.code} foi recusado.`,
        type: "warning",
      });
      fetchData(userData, false);
      fetchWalletBalance(userData);
    } catch (error) {
      console.log("Erro ao rejeitar pedido:", error.message);
      showMessage({
        message: "Erro ao rejeitar pedido",
        description: error.response?.data?.message || error.message,
        type: "danger",
      });
    } finally {
      setIsResponding(false);
    }
  };

  const filteredOrders = useMemo(
    () => (selectedStatus ? orders.filter(order => order.status === selectedStatus) : orders),
    [orders, selectedStatus]
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const formatLastUpdate = (date) => {
    if (!date) return '';
    return `Actualizado às ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const pendingCount = orders.filter(o => o.status === 'Pendente').length;
  const deliveredOrders = orders.filter(o => o.status === 'Entregue');
  const revenueTotal = deliveredOrders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
  
  const todaysOrders = orders.filter(o => {
    if (!o.createdAt) return false;
    const orderDate = new Date(o.createdAt);
    const today = new Date();
    return orderDate.getDate() === today.getDate() && orderDate.getMonth() === today.getMonth() && orderDate.getFullYear() === today.getFullYear();
  });
  const revenueToday = todaysOrders.filter(o => o.status === 'Entregue').reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* REAL-TIME ORDER APPROVAL MODAL */}
      <Modal visible={orderModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.orderModalContent]}>
            <View style={styles.orderModalHeader}>
              <View style={styles.urgentBadge}>
                <Ionicons name="flash" size={16} color="#FFF" />
                <Text style={styles.urgentBadgeText}>NOVO PEDIDO RECEBIDO</Text>
              </View>
              <Text style={styles.orderModalCode}>#{incomingOrder?.code}</Text>
            </View>

            <View style={styles.orderModalBody}>
              <View style={styles.orderPriceRow}>
                <Text style={styles.orderPriceLabel}>Valor a Receber:</Text>
                <Text style={styles.orderPriceValue}>{incomingOrder?.totalPrice ? Number(incomingOrder.totalPrice).toFixed(2) : '0.00'} MT</Text>
              </View>

              <View style={styles.orderInfoDivider} />

              <View style={styles.orderMetaRow}>
                <Ionicons name="person-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.orderMetaText}>
                  Cliente: <Text style={{ color: COLORS.text, fontWeight: '700' }}>{incomingOrder?.user?.name || incomingOrder?.deliveryAddress?.fullName || 'Cliente'}</Text>
                </Text>
              </View>

              <View style={styles.orderMetaRow}>
                <Ionicons name="bicycle-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.orderMetaText}>
                  Tipo: <Text style={{ color: COLORS.text, fontWeight: '700' }}>{incomingOrder?.isUserWantDelivery ? 'Entrega ao Domicílio' : 'Retirada no Estabelecimento'}</Text>
                </Text>
              </View>

              {incomingOrder?.orderItems && (
                <View style={styles.orderItemsList}>
                  <Text style={styles.orderItemsTitle}>Itens Solicitados ({incomingOrder.orderItems.length}):</Text>
                  {incomingOrder.orderItems.slice(0, 3).map((item, idx) => (
                    <Text key={idx} style={styles.orderItemText} numberOfLines={1}>
                      • {item.quantity}x {item.name || item.nome || 'Produto'}
                    </Text>
                  ))}
                  {incomingOrder.orderItems.length > 3 && (
                    <Text style={styles.orderItemMore}>+ {incomingOrder.orderItems.length - 3} outros itens</Text>
                  )}
                </View>
              )}

              <View style={styles.countdownBadge}>
                <Ionicons name="timer-outline" size={16} color="#F59E0B" />
                <Text style={styles.countdownBadgeText}>
                  Responda em {Math.floor(orderModalTimeLeft / 60).toString().padStart(2, '0')}:{(orderModalTimeLeft % 60).toString().padStart(2, '0')} — {orderModalTimeLeft <= 120 ? '\u26A0\uFE0F Urgente!' : 'Tempo restante'}
                </Text>
              </View>
            </View>

            <View style={styles.orderModalActions}>
              <TouchableOpacity
                style={[styles.acceptBtn, isResponding && { opacity: 0.7 }]}
                onPress={handleAcceptOrder}
                disabled={isResponding}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={styles.acceptBtnText}>{isResponding ? 'Processando...' : 'Aceitar Pedido'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => setRejectModalVisible(true)}
                disabled={isResponding}
              >
                <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                <Text style={styles.rejectBtnText}>Rejeitar Pedido</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* REJECT REASON SELECTION MODAL */}
      <Modal visible={rejectModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: COLORS.surface }]}>
            <Text style={[styles.modalTitle, { color: COLORS.text, fontSize: 18 }]}>Motivo da Rejeição</Text>
            <Text style={[styles.modalDesc, { color: COLORS.textSecondary, marginBottom: 15 }]}>
              Selecione o motivo para informar o cliente:
            </Text>

            {['Sem estoque disponível', 'Fora do horário de funcionamento', 'Alta demanda momentânea', 'Outro motivo'].map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.reasonOption,
                  selectedRejectReason === reason && styles.reasonOptionSelected
                ]}
                onPress={() => setSelectedRejectReason(reason)}
              >
                <Ionicons 
                  name={selectedRejectReason === reason ? 'radio-button-on' : 'radio-button-off'} 
                  size={18} 
                  color={selectedRejectReason === reason ? COLORS.primary : COLORS.textSecondary} 
                />
                <Text style={[
                  styles.reasonOptionText,
                  selectedRejectReason === reason && { color: COLORS.text, fontWeight: '700' }
                ]}>{reason}</Text>
              </TouchableOpacity>
            ))}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' }}>
              <TouchableOpacity
                style={[styles.modalBtnSecondary, { flex: 1, paddingVertical: 12 }]}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={[styles.modalBtnSecondaryText, { color: COLORS.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtnPrimary, { flex: 1, backgroundColor: '#EF4444', paddingVertical: 12, marginBottom: 0 }]}
                onPress={() => handleRejectOrder(selectedRejectReason)}
                disabled={isResponding}
              >
                <Text style={styles.modalBtnPrimaryText}>Confirmar Recusa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showNotificationPrompt} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="notifications" size={40} color="#FF6347" />
            </View>
            <Text style={styles.modalTitle}>Ativar Notificações</Text>
            <Text style={styles.modalDesc}>
              Para não perder nenhum pedido e estar sempre atualizado com as vendas da sua loja, ative as notificações.
            </Text>
            
            <TouchableOpacity 
              style={styles.modalBtnPrimary}
              onPress={handleRequestPermission}
            >
              <Text style={styles.modalBtnPrimaryText}>Sim, Quero Receber</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalBtnSecondary}
              onPress={() => setShowNotificationPrompt(false)}
            >
              <Text style={styles.modalBtnSecondaryText}>Talvez Mais Tarde</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Warning Banners */}
        {userData && userData.isBanned && (
          <LinearGradient
            colors={['#2D1E1E', '#3D1D1D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.warningBanner, { backgroundColor: 'transparent', borderColor: '#E74C3C', borderWidth: 1, paddingBottom: 16 }]}
          >
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: 'rgba(231, 76, 60, 0.15)',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Ionicons name="alert-circle" size={26} color="#E74C3C" />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={[styles.warningTitle, { color: '#E74C3C', fontSize: 16, letterSpacing: 0.5 }]}>Registo Rejeitado</Text>
              <Text style={[styles.warningText, { color: '#E0E0E0', opacity: 0.9, marginTop: 4 }]}>
                {userData.banReason || 'A sua conta não foi aprovada pela nossa equipa.'}
              </Text>
              <TouchableOpacity 
                style={{
                  marginTop: 12,
                  backgroundColor: 'rgba(231, 76, 60, 0.2)',
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 6,
                  alignSelf: 'flex-start',
                  borderWidth: 1,
                  borderColor: 'rgba(231, 76, 60, 0.4)'
                }}
                onPress={async () => {
                  try {
                    await api.post('/users/resubmit-analysis', {}, {
                      headers: { Authorization: `Bearer ${userData.token}` }
                    });
                    showMessage({ message: 'Submetido!', description: 'O seu pedido foi enviado para reavaliação.', type: 'success' });
                    validateAndSetUser().then(user => user && fetchData(user));
                  } catch (e) {
                    showMessage({ message: 'Erro', description: 'Não foi possível resubmeter.', type: 'danger' });
                  }
                }}
              >
                <Text style={{ color: '#E74C3C', fontWeight: 'bold', fontSize: 13 }}>Recorrer e Resubmeter</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        )}
        
        {userData && !userData.isApproved && !userData.isBanned && (
          <LinearGradient
            colors={['#1E1E1E', '#2D2D2D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.warningBanner, { backgroundColor: 'transparent', borderColor: '#D4AF37', borderWidth: 1 }]}
          >
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: 'rgba(212, 175, 55, 0.15)',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Ionicons name="shield-checkmark" size={26} color="#D4AF37" />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={[styles.warningTitle, { color: '#D4AF37', fontSize: 16, letterSpacing: 0.5 }]}>Conta em Análise</Text>
              <Text style={[styles.warningText, { color: '#E0E0E0', opacity: 0.9 }]}>A sua conta está a ser verificada. Em breve, os seus produtos estarão visíveis para milhares de clientes!</Text>
            </View>
          </LinearGradient>
        )}
        
        {userData && userData.isApproved && userData.seller?.hasUsedFreeSale && walletBalance <= 0 && (
          <LinearGradient
            colors={['#FEF3C7', '#FDE68A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.warningBanner, { 
              backgroundColor: 'transparent',
              borderColor: '#F59E0B', 
              borderWidth: 1.5,
              borderRadius: 16,
              padding: 16,
              marginHorizontal: 20,
              marginTop: 16,
              shadowColor: '#F59E0B',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 10,
              elevation: 4,
            }]}
          >
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(245, 158, 11, 0.3)'
            }}>
              <Ionicons name="wallet" size={24} color="#D97706" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={{ 
                color: '#78350F', 
                fontSize: 15, 
                fontWeight: '800', 
                letterSpacing: 0.3,
                marginBottom: 2
              }}>
                Saldo Insuficiente
              </Text>
              <Text style={{ 
                color: '#92400E', 
                fontSize: 12, 
                lineHeight: 18,
                fontWeight: '500'
              }}>
                Seu saldo está baixo. Recarregue a sua carteira para manter os seus produtos visíveis.
              </Text>
            </View>
            <TouchableOpacity 
              activeOpacity={0.8}
              style={{
                backgroundColor: '#D97706',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 12,
                marginLeft: 10,
                shadowColor: '#D97706',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 3,
              }} 
              onPress={() => navigation.navigate('Wallet')}
            >
              <Text style={{
                color: '#fff',
                fontSize: 13,
                fontWeight: '800',
              }}>
                Recarregar
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Olá, {userData?.name?.split(' ')[0] || 'Vendedor'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Ionicons name="storefront-outline" size={15} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.subGreeting, { fontWeight: 'bold', marginTop: 0, color: COLORS.text }]}>
                  {userData?.seller?.name || 'Nhiquela Partner'}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate('Profile')}>
              <Image 
                source={userData?.seller?.logo ? { uri: userData.seller.logo } : require('../assets/default1.jpg')} 
                style={styles.avatar} 
              />
              {userData?.seller?.openstore && <View style={styles.onlineDot} />}
            </TouchableOpacity>
          </View>

          {/* Saldo Card Premium */}
          <LinearGradient
            colors={[COLORS.primaryLight, COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <View>
              <Text style={styles.balanceLabel}>Saldo da Carteira</Text>
              <Text style={styles.balanceValue}>{walletBalance.toFixed(2)} MT</Text>
            </View>
            <TouchableOpacity style={[styles.rechargeBtn, { backgroundColor: '#FFF' }]} onPress={() => navigation.navigate('Wallet')} activeOpacity={0.8}>
              <Ionicons name="wallet-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.rechargeBtnText, { color: COLORS.primary, fontWeight: '700' }]}>Ver Carteira</Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{orders.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: COLORS.warning }]}>{pendingCount}</Text>
              <Text style={styles.statLabel}>Pendentes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: COLORS.success }]}>
                {orders.filter(o => o.status === 'Entregue').length}
              </Text>
              <Text style={styles.statLabel}>Entregues</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={[styles.statItem, {
              backgroundColor: userData?.seller?.openstore ? COLORS.successBg : COLORS.errorBg,
              borderRadius: RADIUS.sm,
              paddingHorizontal: 10,
            }]}>
              <View style={[styles.storeDot, { backgroundColor: userData?.seller?.openstore ? COLORS.success : COLORS.error }]} />
              <Text style={[styles.statLabel, { color: userData?.seller?.openstore ? COLORS.success : COLORS.error, fontWeight: '600' }]}>
                {userData?.seller?.openstore ? 'Aberta' : 'Fechada'}
              </Text>
            </View>
          </View>
        </View>

        {/* KPI Performance Section */}
        <View style={styles.kpiSection}>
          <Text style={styles.kpiSectionTitle}>Performance de Vendas (Entregues)</Text>
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
               <View style={[styles.kpiIconBox, { backgroundColor: COLORS.primaryGlow }]}>
                 <Ionicons name="trending-up" size={20} color={COLORS.primary} />
               </View>
               <Text style={styles.kpiValue} numberOfLines={1}>{revenueTotal.toFixed(0)} MT</Text>
               <Text style={styles.kpiLabel}>Receita Total</Text>
            </View>
            <View style={styles.kpiCard}>
               <View style={[styles.kpiIconBox, { backgroundColor: COLORS.successBg }]}>
                 <Ionicons name="today" size={20} color={COLORS.success} />
               </View>
               <Text style={styles.kpiValue} numberOfLines={1}>{revenueToday.toFixed(0)} MT</Text>
               <Text style={styles.kpiLabel}>Receita Hoje</Text>
            </View>
            <View style={styles.kpiCard}>
               <View style={[styles.kpiIconBox, { backgroundColor: COLORS.warningBg }]}>
                 <Ionicons name="cart" size={20} color={COLORS.warningDark} />
               </View>
               <Text style={styles.kpiValue} numberOfLines={1}>{todaysOrders.length}</Text>
               <Text style={styles.kpiLabel}>Pedidos Hoje</Text>
            </View>
          </View>
        </View>

        {/* Filtros */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pedidos</Text>
            {lastUpdate && (
              <Text style={styles.lastUpdate}>{formatLastUpdate(lastUpdate)}</Text>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterChip, !selectedStatus && styles.filterChipActive]}
              onPress={() => setSelectedStatus(null)}
            >
              <Text style={[styles.filterChipText, !selectedStatus && styles.filterChipTextActive]}>
                Todos ({orders.length})
              </Text>
            </TouchableOpacity>
            {availableStatuses.map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.filterChip, selectedStatus === status && styles.filterChipActive,
                  selectedStatus === status && { borderColor: getStatusColor(status), backgroundColor: getStatusColor(status) + '20' }
                ]}
                onPress={() => setSelectedStatus(selectedStatus === status ? null : status)}
              >
                <View style={[styles.filterDot, { backgroundColor: getStatusColor(status) }]} />
                <Text style={[styles.filterChipText, selectedStatus === status && { color: getStatusColor(status), fontWeight: '700' }]}>
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Lista de Pedidos */}
        <View style={styles.ordersList}>
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <TouchableOpacity
                key={order._id}
                style={styles.orderCard}
                onPress={() => navigation.navigate('OrderDetail', { order })}
                activeOpacity={0.85}
              >
                {/* Barra de status */}
                <View style={[styles.statusStripe, { backgroundColor: getStatusColor(order.status) }]} />

                <View style={styles.orderCardContent}>
                  <View style={styles.orderIconBox}>
                    <Ionicons name="cart-outline" size={22} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.orderRow}>
                      <Text style={styles.orderCode}>#{order.code}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20', borderColor: getStatusColor(order.status) }]}>
                        <Text style={[styles.statusBadgeText, { color: getStatusColor(order.status) }]}>{order.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.orderClient}>👤 {order.user?.name || 'Cliente'}</Text>
                    <View style={styles.orderRow}>
                      <Text style={styles.orderPrice}>{order.totalPrice} MT</Text>
                      <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} style={{ marginLeft: 8 }} />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="cart-off" size={60} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Nenhum pedido</Text>
              <Text style={styles.emptySubtitle}>Os pedidos aparecerão aqui quando chegarem</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <FlashMessage position="top" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  subGreeting: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  warningBanner: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  warningTitle: {
    fontSize: SIZES.base,
    fontWeight: '700',
    marginBottom: 4,
  },
  warningText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  warningBtn: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    marginLeft: 8,
  },
  warningBtnText: {
    color: '#fff',
    fontSize: SIZES.xs,
    fontWeight: '700',
  },
  avatarBtn: {
    position: 'relative',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  balanceCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    ...SHADOWS.glow,
  },
  balanceLabel: {
    fontSize: SIZES.sm,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: SIZES.xxl,
    fontWeight: '800',
    color: '#fff',
  },
  rechargeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  rechargeBtnText: {
    color: '#fff',
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    padding: 6,
  },
  statNumber: {
    fontSize: SIZES.xl,
    fontWeight: '800',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.borderLight,
  },
  storeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  lastUpdate: {
    fontSize: SIZES.xs,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  filterScroll: {
    marginBottom: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: COLORS.primaryGlow,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: COLORS.primaryLight,
    fontWeight: '700',
  },
  filterDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  ordersList: {
    paddingHorizontal: 16,
  },
  orderCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceCard,
    borderRadius: RADIUS.lg,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.md,
  },
  statusStripe: {
    width: 5,
  },
  orderCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  orderIconBox: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderCode: {
    fontSize: SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  orderClient: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  orderPrice: {
    fontSize: SIZES.sm,
    color: COLORS.primaryLight,
    fontWeight: '700',
  },
  orderDate: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    width: '85%',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF0ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  modalDesc: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  modalBtnPrimary: {
    backgroundColor: '#FF6347',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalBtnPrimaryText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalBtnSecondary: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnSecondaryText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '500',
  },
  kpiSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  kpiSectionTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  kpiIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: SIZES.base,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 2,
    textAlign: 'center',
  },
  kpiLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  orderModalContent: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    padding: 24,
    borderRadius: 24,
    width: '90%',
  },
  orderModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 8,
  },
  urgentBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  orderModalCode: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
  },
  orderModalBody: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  orderPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderPriceLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  orderPriceValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#10B981',
  },
  orderInfoDivider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 10,
  },
  orderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  orderMetaText: {
    fontSize: 13,
    color: '#94A3B8',
    marginLeft: 8,
  },
  orderItemsList: {
    marginTop: 10,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 10,
  },
  orderItemsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
    marginBottom: 4,
  },
  orderItemText: {
    fontSize: 12,
    color: '#94A3B8',
    marginVertical: 2,
  },
  orderItemMore: {
    fontSize: 11,
    color: '#38BDF8',
    fontStyle: 'italic',
    marginTop: 2,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 12,
  },
  countdownBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
    marginLeft: 6,
  },
  orderModalActions: {
    gap: 10,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 15,
    borderRadius: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    marginLeft: 8,
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderColor: '#EF4444',
    borderWidth: 1.5,
    paddingVertical: 13,
    borderRadius: 14,
  },
  rejectBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
    marginLeft: 6,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 12,
    marginVertical: 4,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  reasonOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(127, 0, 255, 0.08)',
  },
  reasonOptionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 10,
  }
});

export default Home;
