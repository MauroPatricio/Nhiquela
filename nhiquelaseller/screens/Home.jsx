import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import api from '../hooks/createConnectionApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import FlashMessage, { showMessage } from "react-native-flash-message";
import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';

// ✅ Configuração segura de notificações (SDK 35)
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

  // 🔥 NOVO: Estado para controle de polling
  const [lastUpdate, setLastUpdate] = useState(null);
  const pollingRef = useRef(null);
  const ordersRef = useRef([]); // ✅ Ref para rastrear pedidos sem causar re-render

  const navigation = useNavigation();
  const notificationListener = useRef();
  const responseListener = useRef();

  // ✅ Função memoizada para atualizar push token
  const updatePushToken = useCallback(async (userId, newPushToken) => {
    if (!userId || !newPushToken) return;
    try {
      await api.patch(`/users/updatePushToken/${userId}`, { pushToken: newPushToken });
    } catch (error) {
      console.log('Erro ao atualizar PushToken:', error.message);
    }
  }, []);

  // ✅ Registro de notificações push
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

  // ✅ Buscar saldo
  const fetchWalletBalance = useCallback(async (user) => {
    if (!user) return;
    try {
      const response = await api.get('/wallet/balance', {
        headers: { authorization: `Bearer ${user.token}` },
      });
      setWalletBalance(Number(response.data?.balance) || 0);
    } catch (error) {
      console.log("Erro ao buscar saldo:", error.message);
    }
  }, []);

  // ✅ Buscar pedidos - OPTIMIZED to prevent infinite re-renders
  const fetchData = useCallback(async (user, showNotification = false) => {
    if (!user) return;
    try {
      const response = await api.get(`/orders/sellerview?seller=${user._id}`, {
        headers: { authorization: `Bearer ${user.token}` },
      });
      if (response.status === 200) {
        const newOrders = response.data.orders;

        // 🔥 VERIFICA SE HÁ NOVOS PEDIDOS usando ref
        if (showNotification && newOrders.length > ordersRef.current.length) {
          const newOrdersCount = newOrders.length - ordersRef.current.length;
          showMessage({
            message: `${newOrdersCount} novo(s) pedido(s)`,
            description: "Atualizando lista...",
            type: "success",
            icon: "auto",
            duration: 2000,
          });
        }

        ordersRef.current = newOrders;
        setOrders(newOrders);
        setAvailableStatuses([...new Set(newOrders.map(o => o.status))]);
        setLastUpdate(new Date()); // 🔥 MARCA HORA DA ÚLTIMA ATUALIZAÇÃO
      }
    } catch (error) {
      console.log("Erro ao buscar pedidos:", error.message);
    }
  }, []); // ✅ Removemos 'orders' das dependências

  // 🔥 OPTIMIZED: Polling automático a cada 20 segundos (reduzido de 30s)
  const startPolling = useCallback((user) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      if (user) {
        await fetchData(user, true); // 🔥 true = mostra notificação se houver novos
        await fetchWalletBalance(user);
      }
    }, 20000); // 20 segundos (reduzido de 30s para melhor responsividade)
  }, [fetchData, fetchWalletBalance]);

  // 🔥 NOVO: Parar polling
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // ✅ Carregar usuário ao entrar
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

  // ✅ useFocusEffect ATUALIZADO com polling
  useFocusEffect(
    useCallback(() => {
      let active = true;

      const initialize = async () => {
        const user = await validateAndSetUser();
        if (!user || !active) return;

        await registerForPushNotificationsAsync(user);
        await Promise.all([fetchData(user), fetchWalletBalance(user)]);

        // 🔥 INICIA POLLING APÓS CARREGAMENTO INICIAL
        startPolling(user);
      };

      initialize();

      return () => {
        active = false;
        stopPolling(); // 🔥 PARA POLLING AO SAIR DA TELA
      };
    }, [validateAndSetUser, registerForPushNotificationsAsync, fetchData, fetchWalletBalance, startPolling, stopPolling])
  );

  // 🔥 NOVO: Pull to Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const user = await validateAndSetUser();
    if (user) {
      await Promise.all([fetchData(user), fetchWalletBalance(user)]);
    }
    setRefreshing(false);
  }, [validateAndSetUser, fetchData, fetchWalletBalance]);

  // ✅ Listeners estáveis ATUALIZADOS para sincronização automática
  useEffect(() => {
    // Listener para notificações push
    notificationListener.current = Notifications.addNotificationReceivedListener(async (notification) => {
      showMessage({
        message: "Novo pedido recebido",
        description: notification.request.content.body,
        type: "success",
        icon: "auto",
        duration: 3000,
      });

      // 🔥 SINCRONIZA AUTOMATICAMENTE AO RECEBER NOTIFICAÇÃO
      const user = await validateAndSetUser();
      if (user) {
        await fetchData(user);
        await fetchWalletBalance(user);
      }
    });

    // Listener para clique em notificação
    responseListener.current = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const extraData = response.notification.request.content.data?.extraData;

      // 🔥 SINCRONIZA ANTES DE NAVEGAR
      const user = await validateAndSetUser();
      if (user) {
        await fetchData(user);
        await fetchWalletBalance(user);
      }

      if (extraData) {
        navigation.navigate('OrderDetail', { extraData });
      }
    });

    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      // 🔥 SINCRONIZA AO RECUPERAR CONEXÃO
      if (state.isConnected && !state.isInternetReachable) {
        validateAndSetUser().then(user => {
          if (user) {
            fetchData(user);
            fetchWalletBalance(user);
          }
        });
      }
    });

    return () => {
      // 🔥 CORREÇÃO: Usar .remove() em vez de removeNotificationSubscription
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
      unsubscribeNetInfo();
      stopPolling(); // 🔥 GARANTE QUE POLLING SERÁ PARADO
    };
  }, [navigation, validateAndSetUser, fetchData, fetchWalletBalance, stopPolling]);

  // ✅ Evita re-renderizações desnecessárias
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
    return `Última atualização: ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 🔥 CORREÇÃO: View para StatusBar background */}
      <View style={styles.statusBarBackground} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#7F00FF']}
            tintColor="#7F00FF"
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.welcomeText}><Text style={{ color: '#7F00FF' }}>nhiquela</Text></Text>
          <Text style={styles.balanceText}>Saldo: {walletBalance.toFixed(2)} MT</Text>
          {lastUpdate && (
            <Text style={styles.lastUpdateText}>{formatLastUpdate(lastUpdate)}</Text>
          )}
        </View>

        <View style={styles.appBar}>
          <Image source={require('../assets/default1.jpg')} style={styles.cover} />
          <Text style={styles.greetingText}>{userData ? `Olá, ${userData.name}` : 'Faça login'}</Text>
        </View>

        {userData?.seller && (
          <View style={styles.storeStatusContainer}>
            <View
              style={[
                styles.storeStatusIndicator,
                { backgroundColor: userData.seller.openstore ? '#4CAF50' : '#F44336' },
              ]}
            />
            <Text
              style={[
                styles.storeStatusText,
                { color: userData.seller.openstore ? '#4CAF50' : '#F44336' },
              ]}
            >
              {userData.seller.openstore ? 'Loja Aberta' : 'Loja Fechada'} -
              <Text style={styles.sellerName}> {userData?.seller?.name || ''}</Text>
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Pedidos</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusScrollContainer}
        >
          {availableStatuses.map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.statusButton, selectedStatus === status && styles.selectedStatusButton]}
              onPress={() => setSelectedStatus(status)}
            >
              <Text style={[
                styles.statusButtonText,
                selectedStatus === status && styles.selectedStatusText
              ]}>
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <TouchableOpacity
              key={order._id}
              style={styles.orderCard}
              onPress={() => navigation.navigate('OrderDetail', { order })}
            >
              <Ionicons name="cart-outline" size={24} color="#7F00FF" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.orderTextCode}>Código: {order.code}</Text>
                <Text style={styles.orderText}>Status: {order.status}</Text>
                <Text style={styles.orderText}>Cliente: {order.user?.name}</Text>
                <Text style={styles.orderText}>Data: {formatDate(order.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.noOrdersText}>Nenhum pedido encontrado.</Text>
        )}
      </ScrollView>
      <FlashMessage position="top" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fb'
  },
  // 🔥 NOVO: Background para StatusBar
  statusBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40, // Ajuste conforme necessário
    backgroundColor: '#f8f9fb',
    zIndex: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    marginTop: 10,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '900'
  },
  balanceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginTop: 5
  },
  lastUpdateText: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
    fontStyle: 'italic'
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15
  },
  cover: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    borderWidth: 2,
    borderColor: '#7F00FF',
    backgroundColor: '#f3f4f6'
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937'
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    margin: 15
  },
  statusScrollContainer: {
    paddingHorizontal: 8,
  },
  statusButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 4,
    marginVertical: 5
  },
  selectedStatusButton: {
    backgroundColor: '#7F00FF'
  },
  statusButtonText: {
    color: '#111827',
    fontWeight: '600'
  },
  selectedStatusText: {
    color: 'white'
  },
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginVertical: 8,
    padding: 20,
    borderRadius: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  orderText: {
    fontSize: 14,
    color: '#374151'
  },
  orderTextCode: {
    fontWeight: '800'
  },
  storeStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb'
  },
  storeStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginHorizontal: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  noOrdersText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#666',
    fontSize: 16
  },
  storeStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginHorizontal: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },

  storeStatusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },

  storeStatusText: {
    fontWeight: '600',
    fontSize: 15,
  },

  sellerName: {
    fontWeight: '700',
    color: '#333',
  },
});

export default Home;