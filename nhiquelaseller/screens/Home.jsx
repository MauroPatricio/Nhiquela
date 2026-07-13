import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import api from '../hooks/createConnectionApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import FlashMessage, { showMessage } from "react-native-flash-message";
import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import { COLORS, SIZES, RADIUS, SHADOWS, getStatusColor } from '../constants/theme';

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
  const [lastUpdate, setLastUpdate] = useState(null);
  const pollingRef = useRef(null);
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
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return;
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      setExpoPushToken(token);
      await updatePushToken(user._id, token);
    } catch (error) {
      console.log("Erro ao registrar notificações:", error.message);
    }
  }, [updatePushToken]);

  const fetchWalletBalance = useCallback(async (user) => {
    if (!user) return;
    try {
      const response = await api.get('/wallet/balance', {
        headers: { authorization: `Bearer ${user.token}` },
      });
      setWalletBalance(Number(response.data?.balance) || 0);
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
      const response = await api.get(`/orders/sellerview?seller=${user._id}`, {
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
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      if (user) {
        await fetchData(user, true);
        await fetchWalletBalance(user);
      }
    }, 20000);
  }, [fetchData, fetchWalletBalance]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const validateAndSetUser = useCallback(async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      const storedUserId = await AsyncStorage.getItem('id');
      if (!storedUserData || !storedUserId) throw new Error("Usuário não encontrado");
      const parsedUserData = JSON.parse(storedUserData);
      setUserData(parsedUserData);
      return parsedUserData;
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
      if (extraData) navigation.navigate('OrderDetail', { extraData });
    });

    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        validateAndSetUser().then(user => {
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Olá, {userData?.name?.split(' ')[0] || 'Vendedor'} 👋</Text>
              <Text style={styles.subGreeting}>
                {userData?.seller?.name || 'Nhiquela Partner'}
              </Text>
            </View>
            <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate('Profile')}>
              <Image source={require('../assets/default1.jpg')} style={styles.avatar} />
              {userData?.seller?.openstore && <View style={styles.onlineDot} />}
            </TouchableOpacity>
          </View>

          {/* Saldo Card */}
          <View style={styles.balanceCard}>
            <View>
              <Text style={styles.balanceLabel}>Saldo da Carteira</Text>
              <Text style={styles.balanceValue}>{walletBalance.toFixed(2)} MT</Text>
            </View>
            <TouchableOpacity style={styles.rechargeBtn} onPress={() => navigation.navigate('Wallet')}>
              <Ionicons name="wallet-outline" size={16} color="#fff" />
              <Text style={styles.rechargeBtnText}>Ver Carteira</Text>
            </TouchableOpacity>
          </View>

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
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
    borderRadius: RADIUS.md,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    ...SHADOWS.md,
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
    backgroundColor: COLORS.border,
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
    borderColor: COLORS.border,
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
    borderRadius: RADIUS.md,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
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
    borderRadius: RADIUS.sm,
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
});

export default Home;
