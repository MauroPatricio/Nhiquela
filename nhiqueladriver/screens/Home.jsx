import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import api from '../hooks/createConnectionApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import FlashMessage, { showMessage } from "react-native-flash-message";
import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';

// Configuração de handler de notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Home = () => {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();
  const [userData, setUserData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [availableStatuses, setAvailableStatuses] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [userLogin, setUserLogin] = useState(false);

  const navigation = useNavigation();

  // Atualiza token push no backend
  const updatePushToken = async (userId, newPushToken) => {
    if (!userId) return;
    try {
      await api.patch(`/users/updatePushToken/${userId}`, { pushToken: newPushToken });
    } catch (error) {
      console.error('Erro ao atualizar o PushToken:', error.message);
    }
  };

  // Registro de notificações push
  const registerForPushNotificationsAsync = async (user) => {
    if (!user) return;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        alert('Permita notificações para receber avisos de pedidos.');
        return;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      await updatePushToken(user._id, token);
      setExpoPushToken(token);
    } catch (error) {
      console.error("Erro ao registrar push notification:", error.message || error);
    }
  };

  // Checa notificações pendentes
  const checkPendingNotifications = async () => {
    const pendingNotifications = await Notifications.getPresentedNotificationsAsync();
    if (pendingNotifications.length > 0) {
      pendingNotifications.forEach(notification => {
        showMessage({
          message: "Pedido pendente",
          description: notification.request.content.body,
          type: "info",
          icon: "auto",
          duration: 3000,
        });
      });
    }
  };

  // Busca saldo da wallet
  const fetchWalletBalance = async (user) => {
    if (!user) return;
    try {
      setIsLoading(true);
      const response = await api.get('/wallet/balance', {
        headers: { authorization: `Bearer ${user.token}` },
      });
      setWalletBalance(Number(response.data?.balance) || 0);
    } catch (error) {
      console.error("Erro ao buscar saldo da wallet:", error.response?.data || error.message);
      setWalletBalance(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Valida e seta usuário local
  const validateAndSetUser = async () => {
    try {
      const [storedUserData, storedUserId] = await Promise.all([
        AsyncStorage.getItem('userData'),
        AsyncStorage.getItem('id'),
      ]);
      if (!storedUserData || !storedUserId) throw new Error("Usuário não encontrado");
      const parsedUserData = JSON.parse(storedUserData);
      if (!parsedUserData?._id || parsedUserData._id !== storedUserId) throw new Error("Dados inconsistentes");

      setUserData(parsedUserData);
      setUserLogin(true);
      return parsedUserData;
    } catch (error) {
      setIsLoading(false);
      navigation.navigate('Login');
      return null;
    }
  };

  // useFocusEffect para carregar dados quando a tela ganha foco
  useFocusEffect(
    useCallback(() => {
      const initialize = async () => {
        const user = await validateAndSetUser();
        if (!user) return;

        await registerForPushNotificationsAsync(user);
        await Promise.all([fetchData(user), fetchWalletBalance(user)]);
      };
      initialize();
    }, [])
  );

  // Configuração de listeners de notificações
  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      showMessage({
        message: "Novo pedido recebido",
        description: notification.request.content.body,
        type: "success",
        icon: "auto",
        duration: 3000,
      });
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const { extraData } = response.notification.request.content.data;
      if (extraData) {
        navigation.navigate('OrderDetail', { extraData });
      }
    });

    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      if (state.isConnected) checkPendingNotifications();
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
      unsubscribeNetInfo();
    };
  }, []);

  // Busca pedidos
  const fetchData = async (user) => {
    try {
      const response = await api.get(`/orders/sellerview?seller=${user._id}`, {
        headers: { authorization: `Bearer ${user.token}` },
      });
      if (response.status === 200) {
        setOrders(response.data.orders);
        setAvailableStatuses([...new Set(response.data.orders.map(o => o.status))]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleStatusSelect = (status) => setSelectedStatus(status);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}:${String(date.getSeconds()).padStart(2,'0')}`;
  };

  const filteredOrders = selectedStatus ? orders.filter(order => order.status === selectedStatus) : orders;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* View para o fundo da StatusBar */}
      <View style={{ height: StatusBar.currentHeight }} />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={styles.appBarWrapper}>
        <View style={styles.headerRow}>
          <Text style={styles.welcomeText('black', 30, 0)}>
            <Text style={{ color: '#7F00FF' }}>Nhiquela+</Text>
          </Text>
          <Text style={styles.balanceText}>
            <Text style={{fontSize: 10}}>Saldo:</Text> {walletBalance.toFixed(2)} MT
          </Text>
        </View>

        <View style={styles.appBar}>
          <Image source={require('../assets/default1.jpg')} style={styles.cover} />
          <Text style={styles.greetingText}>{userData ? `Olá, ${userData?.name}` : 'Faça login'}</Text>
        </View>

        {userData?.seller && (
          <View style={styles.storeStatusContainer}>
            <View
              style={[
                styles.storeStatusIndicator,
                { backgroundColor: userData.seller.openstore ? '#4CAF50' : '#F44336' },
              ]}
            />
            <Text style={styles.storeStatusText}>
              {userData.seller.openstore ? 'Loja Aberta' : 'Loja Fechada'} - <Text style={styles.sellerName}>{userData?.seller?.name || ''}</Text>
            </Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.sectionTitle}>Pedidos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusScrollContainer}>
          {availableStatuses.map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.statusButton, selectedStatus === status && styles.selectedStatusButton]}
              onPress={() => handleStatusSelect(status)}
            >
              <Text style={styles.statusButtonText}>{status}</Text>
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
              <View style={styles.orderIconContainer}>
                <Ionicons name="cart-outline" size={25} style={styles.cartIcon} />
              </View>
              <View style={styles.orderDetails}>
                <Text style={styles.orderText}>Código: {order.code}</Text>
                <Text style={styles.orderText}>Status: {order.status}</Text>
                <Text style={styles.orderText}>Cliente: {order.user?.name}</Text>
                <Text style={styles.orderText}>Data: {formatDate(order.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={{ textAlign: 'center', marginTop: 50 }}>Nenhum pedido encontrado.</Text>
        )}
      </ScrollView>

      <FlashMessage position="top" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fb', // fundo claro moderno
  },
  appBarWrapper: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: (color, size, margin) => ({
    fontSize: size,
    color,
    fontWeight: '900',
    marginTop: margin,
    letterSpacing: 1,
  }),
  balanceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  appBar: {
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cover: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    borderWidth: 2,
    borderColor: '#7F00FF',
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  storeStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#e5f6ff',
  },
  storeStatusIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 8,
  },
  storeStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  sellerName: { fontWeight: 'bold', color: '#111827' },
  scrollContainer: { paddingBottom: 300 },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginVertical: 12,
    color: '#111827',
  },
  statusScrollContainer: { paddingBottom: 15 },
  statusButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: '#f3f4f6',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  selectedStatusButton: {
    backgroundColor: '#7F00FF',
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  statusButtonText: { color: '#111827', fontWeight: '600' },
  orderCard: {
    flexDirection: 'row',
    padding: 20,
    marginVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 4,
    alignItems: 'center',
  },
  orderIconContainer: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cartIcon: { color: '#7F00FF' },
  orderDetails: { flex: 1 },
  orderText: {
    fontSize: 15,
    marginBottom: 5,
    color: '#374151',
    fontWeight: '500',
  },
  noOrdersText: {
    textAlign: 'center',
    marginTop: 60,
    fontSize: 16,
    fontWeight: '500',
    color: '#9ca3af',
  },
});



export default Home;
